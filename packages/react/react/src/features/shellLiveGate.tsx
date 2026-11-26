import {
  finishShellLive,
  gridRowCount,
  type LiveStage,
  type LiveStageDependencies,
  orderLiveStages,
  publishShellOverlay,
  type ShellOperationInput,
  sourceWindowStart,
  type TableRuntimeView,
  withShellOperations,
} from "@adapttable/core/binding";
/**
 * Mount shell interaction hooks in-tree: the live stages the composed
 * features bring.
 *
 * Each live value starts inert; a composed feature's stage replaces the one
 * it writes, so the lean table never imports those hooks. Enter-to-edit and batch recording live in
 * the cell-navigation and editing entries; this file only forwards the host
 * callbacks when those slots are empty.
 */
import { type ReactNode, useMemo } from "react";

import type { DataTableShellResult } from "../useDataTableShell";
import type { LiveStageProps, ShellLive } from "./liveStage";
import {
  useCurrentTableRuntimeReader,
  useLiveStages,
  usePublishTableRuntime,
} from "./providers";
import {
  DISABLED_EXPORT,
  DISABLED_FIND,
  DISABLED_FULLSCREEN,
  disabledGridFocus,
  windowedTableAria,
} from "./shellLiveStubs";

type StageProps<TRow> = LiveStageProps<TRow>;

/** Where the rendered slice begins in the dataset. */
function windowStartOf<TRow>(shell: DataTableShellResult<TRow>): number {
  return sourceWindowStart(shell.chrome.source);
}

/** A stage the base still mounts itself, with what it reads and writes. */
function baseStage(
  id: string,
  stage: LiveStageDependencies,
  render: (props: StageProps<never>) => ReactNode
): LiveStage<ReactNode> {
  return { id, stage, render };
}

/**
 * The stages to walk: the composed ones in dependency order, with the base's
 * own grid attributes when no stage writes the grid.
 */
export function liveStageWalk(
  composed: readonly LiveStage<ReactNode>[]
): readonly LiveStage<ReactNode>[] {
  const gridWritten = composed.some(
    ({ stage }) => stage.writes === "gridFocus"
  );
  return gridWritten
    ? composed
    : orderLiveStages([...composed, PLAIN_GRID_STAGE]);
}

/** One link of the chain: run this stage, then hand the rest what it grew. */
function LiveChain<TRow>({
  stages,
  index,
  shell,
  live,
  children,
}: StageProps<TRow> & {
  readonly stages: readonly LiveStage<ReactNode>[];
  readonly index: number;
}): ReactNode {
  "use no memo";
  const stage = stages[index];
  if (stage === undefined) return children(live);
  const run = stage.render as (props: StageProps<TRow>) => ReactNode;
  return run({
    shell,
    live,
    children: (grown) => (
      <LiveChain stages={stages} index={index + 1} shell={shell} live={grown}>
        {children}
      </LiveChain>
    ),
  });
}

/**
 * The grid without the keyboard-grid feature still names its real size:
 * assistive tech can only count the slice in the DOM.
 */
function PlainGridFocus<TRow>({
  shell,
  live,
  children,
}: StageProps<TRow>): ReactNode {
  "use no memo";
  const chrome = shell.chrome;
  const pinned = chrome.pinnedRows;
  const firstRowIndex = windowStartOf(shell);
  const rowCount = gridRowCount(chrome.source, pinned);
  const rowsLength =
    (pinned?.top?.length ?? 0) +
    chrome.source.rows.length +
    (pinned?.bottom?.length ?? 0);
  const columnsLength = chrome.columnLayout.visibleColumns.length;
  const columnsWindowed = shell.tableProps.columnWindow.enabled;
  const windowedAria = useMemo(
    () =>
      windowedTableAria({
        rowCount,
        rowsLength,
        columnsLength,
        columnsWindowed,
        firstRowIndex,
      }),
    [rowCount, rowsLength, columnsLength, columnsWindowed, firstRowIndex]
  );
  return children({ ...live, gridFocus: windowedAria });
}

const PLAIN_GRID_STAGE = baseStage(
  "grid-attributes",
  { reads: [], writes: "gridFocus" },
  PlainGridFocus
);

/**
 * Overlay find, grid focus, export and fullscreen onto a finished shell.
 *
 * Edit history ran earlier, as a chrome stage.
 *
 * @public
 */
export function ShellLiveGate<TRow>({
  shell,
  children,
}: {
  readonly shell: DataTableShellResult<TRow>;
  readonly children: (view: DataTableShellResult<TRow>) => ReactNode;
}): ReactNode {
  // Every stage rebuilds its props from the shell each render, so its
  // stages and this gate are left uncompiled: a cache here would never hit.
  "use no memo";
  const composed = useLiveStages();
  const stages = useMemo(() => liveStageWalk(composed), [composed]);
  const idle: ShellLive<TRow> = {
    find: DISABLED_FIND,
    gridFocus: disabledGridFocus(),
    exportHandler: DISABLED_EXPORT,
    fullscreen: DISABLED_FULLSCREEN,
    stats: null,
  };
  return (
    <LiveChain stages={stages} index={0} shell={shell} live={idle}>
      {(live) => (
        <PublishLiveOperations shell={shell} live={live}>
          {children}
        </PublishLiveOperations>
      )}
    </LiveChain>
  );
}

/**
 * Project the live controllers onto the runtime after the stages that own
 * them have run. The chrome publisher has already built the view.
 */
function PublishLiveOperations<TRow>({
  shell,
  live,
  children,
}: {
  readonly shell: DataTableShellResult<TRow>;
  readonly live: ShellLive<TRow>;
  readonly children: (view: DataTableShellResult<TRow>) => ReactNode;
}): ReactNode {
  "use no memo";
  const input = liveShellOperations(shell, live);
  publishShellOverlay(shell.chrome, input);
  const prior = useCurrentTableRuntimeReader<TRow>();
  // Layered over the chrome's view on first read, never during render.
  let projected: TableRuntimeView<TRow> | undefined | null = null;
  const view = (): TableRuntimeView<TRow> | undefined => {
    if (projected === null) {
      const current = prior.view?.();
      projected = current ? withShellOperations(current, input) : undefined;
    }
    return projected;
  };
  usePublishTableRuntime<TRow>({
    rows: () => prior.rows(),
    labels: () => prior.labels(),
    view,
  });
  return children(finishShellLive(shell, live));
}

/** Armed shell operations from the controllers this gate just ran. */
function liveShellOperations<TRow>(
  shell: DataTableShellResult<TRow>,
  live: ShellLive<TRow>
): ShellOperationInput<TRow> {
  const props = shell.chromeProps;
  const host = shell.featureHost;
  const commands = host?.commands ?? [];
  const palette = props.commandPalette;
  const paletteArmed =
    palette !== false && (palette !== undefined || commands.length > 0);
  const onPrint = props.onPrint;
  return {
    find: live.find,
    fullscreen: live.fullscreen,
    density:
      props.densityChooser === true
        ? { density: props.density, onDensityChange: props.onDensityChange }
        : undefined,
    contextMenu: props.contextMenu
      ? { items: host?.contextMenuItems ?? [] }
      : undefined,
    commandPalette: paletteArmed ? { commands } : undefined,
    print: props.printButton === true && onPrint ? { onPrint } : undefined,
  };
}
