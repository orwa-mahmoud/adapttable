/**
 * Mount shell interaction hooks in-tree: history, find, grid, export, fullscreen.
 *
 * Features fill the live slots. Empty slots pass inert stubs, so the lean
 * table never imports those hooks.
 */
import type { ReactNode } from "react";

import type { DataTableShellResult } from "../useDataTableShell";
import { undoRedoToolbar, viewControlsToolbar } from "../useTableChrome";
import { rememberFeatureHost } from "./featureHost";
import { FeatureSlot, useFeatureSlotFilled } from "./providers";
import {
  DISABLED_EXPORT,
  DISABLED_FIND,
  DISABLED_FULLSCREEN,
  disabledGridFocus,
  disabledHistory,
  windowedTableAria,
} from "./shellLiveStubs";
import {
  CELL_NAV_LIVE,
  type CellNavLiveSlotProps,
  EDIT_HISTORY_LIVE,
  type EditHistoryLiveSlotProps,
  EXPORT_LIVE,
  type ExportLiveSlotProps,
  FIND_LIVE,
  type FindLiveSlotProps,
  FULLSCREEN_LIVE,
  type FullscreenLiveSlotProps,
  SELECTION_STATS_LIVE,
  type SelectionStatsLiveSlotProps,
} from "./slotKeys";

interface HistoryResult<TRow> {
  history: DataTableShellResult<TRow>["editHistory"];
  onCellEdit: DataTableShellResult<TRow>["chromeProps"]["onCellEdit"];
}

/**
 * Record edits before extras and the body run, so the editing bundle
 * sees the recording commit channel.
 *
 * @public
 */
export function HistoryLiveGate<TRow>({
  shell,
  children,
}: {
  readonly shell: DataTableShellResult<TRow>;
  readonly children: (view: DataTableShellResult<TRow>) => ReactNode;
}): ReactNode {
  const filled = useFeatureSlotFilled(EDIT_HISTORY_LIVE);
  const apply = (result: HistoryResult<TRow>) => {
    const chromeProps = {
      ...shell.chromeProps,
      onCellEdit: result.onCellEdit,
    };
    rememberFeatureHost(chromeProps, shell.featureHost);
    return children({
      ...shell,
      editHistory: result.history,
      chromeProps,
    });
  };
  const historyProps = {
    editHistory: shell.chromeProps.editHistory,
    columns: shell.chrome.allColumns,
    onCellEdit: shell.chromeProps.onCellEdit,
    children: apply,
  } as unknown as EditHistoryLiveSlotProps<never>;
  return filled ? (
    <FeatureSlot slot={EDIT_HISTORY_LIVE} props={historyProps} />
  ) : (
    apply({
      history: disabledHistory(),
      onCellEdit: shell.chromeProps.onCellEdit,
    })
  );
}

/**
 * What the live slots hand back, one field per stage.
 *
 * The stages run in order and each reads what the ones before it produced —
 * cell navigation needs the find walk to jump to a match, export needs the
 * selected range, the figures need it too — so the bag grows rather than being
 * assembled at the end.
 */
interface ShellLive<TRow> {
  readonly find: typeof DISABLED_FIND;
  readonly gridFocus: ReturnType<typeof disabledGridFocus>;
  readonly exportHandler: typeof DISABLED_EXPORT;
  readonly fullscreen: typeof DISABLED_FULLSCREEN;
  readonly stats: DataTableShellResult<TRow>["selectionStats"];
}

interface StageProps<TRow> {
  readonly shell: DataTableShellResult<TRow>;
  readonly live: ShellLive<TRow>;
  readonly children: (live: ShellLive<TRow>) => ReactNode;
}

/** Where the rendered slice begins in the dataset. */
function windowStartOf<TRow>(shell: DataTableShellResult<TRow>): number {
  const source = shell.chrome.source;
  return source.paginationMode === "paged"
    ? Math.max(0, (source.page - 1) * source.limit)
    : 0;
}

function FindStage<TRow>({
  shell,
  live,
  children,
}: StageProps<TRow>): ReactNode {
  const filled = useFeatureSlotFilled(FIND_LIVE);
  const chrome = shell.chrome;
  const findProps = {
    enabled: shell.chromeProps.findInTable === true,
    rows: chrome.source.rows,
    columns: chrome.columnLayout.visibleColumns,
    firstRowIndex: windowStartOf(shell),
    // Same resolved adapter the shell already owns — find rides the table URL
    // and Saved Views without a second History binding.
    urlAdapter: shell.urlAdapter,
    urlSync: shell.chromeProps.urlSync,
    urlKey: shell.chromeProps.urlKey,
    children: (find: typeof DISABLED_FIND) => children({ ...live, find }),
  } as unknown as FindLiveSlotProps<never>;
  return filled ? (
    <FeatureSlot slot={FIND_LIVE} props={findProps} />
  ) : (
    children({ ...live, find: DISABLED_FIND })
  );
}

function CellNavStage<TRow>({
  shell,
  live,
  children,
}: StageProps<TRow>): ReactNode {
  const filled = useFeatureSlotFilled(CELL_NAV_LIVE);
  const props = shell.chromeProps;
  const chrome = shell.chrome;
  const windowStart = windowStartOf(shell);
  const columns = chrome.columnLayout.visibleColumns;
  const options = {
    headerCheckbox: props.columnSelectionCheckbox === true,
    rowCount:
      Math.max(chrome.source.total, windowStart + chrome.source.rows.length) +
      (chrome.pinnedRows?.top?.length ?? 0) +
      (chrome.pinnedRows?.bottom?.length ?? 0),
    columns,
    columnsWindowed: shell.tableProps.columnWindow.enabled,
    rows: [
      ...(chrome.pinnedRows?.top ?? []),
      ...chrome.source.rows,
      ...(chrome.pinnedRows?.bottom ?? []),
    ],
    firstRowIndex: windowStart,
    dir: props.dir,
    labels: shell.labels,
    onCut: props.onCellCut,
  };
  const navProps = {
    options,
    hostProps: props,
    pinOffset: chrome.columnLayout.pinOffset,
    record: shell.editHistory.record,
    undo: shell.editHistory.undo,
    redo: shell.editHistory.redo,
    onFind: live.find.openBar,
    matchKeys: live.find.matchKeys,
    currentMatch: live.find.current,
    children: (gridFocus: ReturnType<typeof disabledGridFocus>) =>
      children({ ...live, gridFocus }),
  } as unknown as CellNavLiveSlotProps<never>;
  return filled ? (
    <FeatureSlot slot={CELL_NAV_LIVE} props={navProps} />
  ) : (
    children({
      ...live,
      // Without the feature the table still names its real size: assistive
      // tech can only count the slice in the DOM.
      gridFocus: windowedTableAria({
        rowCount: options.rowCount,
        rowsLength: options.rows.length,
        columnsLength: options.columns.length,
        columnsWindowed: options.columnsWindowed,
        firstRowIndex: options.firstRowIndex,
      }),
    })
  );
}

function ExportStage<TRow>({
  shell,
  live,
  children,
}: StageProps<TRow>): ReactNode {
  const filled = useFeatureSlotFilled(EXPORT_LIVE);
  const props = shell.chromeProps;
  const chrome = shell.chrome;
  const exportProps = {
    exportCsv: props.exportCsv,
    source: chrome.source,
    columns: chrome.columnLayout.visibleColumns,
    context: {
      selectedIds: chrome.table.selection?.selectedIds,
      getRowId: chrome.getRowId,
      allColumns: chrome.allColumns,
      range: live.gridFocus.range,
      firstRowIndex: windowStartOf(shell),
      getCellSpan: props.getCellSpan,
      grouping: chrome.grouping,
      tree: chrome.tree,
      groupTotal: shell.labels.groupTotal,
      summaryRow: props.summaryRow,
    },
    featureHost: shell.featureHost,
    labels: shell.labels,
    pageOnly: chrome.featureNotices.some(
      (notice) => notice.kind === "export-all-page"
    ),
    children: (exportHandler: typeof DISABLED_EXPORT) =>
      children({ ...live, exportHandler }),
  } as unknown as ExportLiveSlotProps<never>;
  return filled ? (
    <FeatureSlot slot={EXPORT_LIVE} props={exportProps} />
  ) : (
    children({ ...live, exportHandler: DISABLED_EXPORT })
  );
}

function FullscreenStage<TRow>({
  shell,
  live,
  children,
}: StageProps<TRow>): ReactNode {
  const filled = useFeatureSlotFilled(FULLSCREEN_LIVE);
  const fullscreenProps = {
    element: shell.chrome.rootRef.current,
    children: (fullscreen: typeof DISABLED_FULLSCREEN) =>
      children({ ...live, fullscreen }),
  } as FullscreenLiveSlotProps;
  return filled ? (
    <FeatureSlot slot={FULLSCREEN_LIVE} props={fullscreenProps} />
  ) : (
    children({ ...live, fullscreen: DISABLED_FULLSCREEN })
  );
}

function SelectionStatsStage<TRow>({
  shell,
  live,
  children,
}: StageProps<TRow>): ReactNode {
  const filled = useFeatureSlotFilled(SELECTION_STATS_LIVE);
  const statsProps = {
    range: live.gridFocus.range,
    rows: shell.chrome.source.rows,
    columns: shell.chrome.columnLayout.visibleColumns,
    firstRowIndex: windowStartOf(shell),
    children: (stats: DataTableShellResult<TRow>["selectionStats"]) =>
      children({ ...live, stats }),
  } as unknown as SelectionStatsLiveSlotProps<never>;
  return filled ? (
    <FeatureSlot slot={SELECTION_STATS_LIVE} props={statsProps} />
  ) : (
    children({ ...live, stats: null })
  );
}

/** The order the live slots mount in; each reads what the ones above produced. */
type LiveStage = <TRow>(props: StageProps<TRow>) => ReactNode;
const LIVE_STAGES: readonly LiveStage[] = [
  FindStage,
  CellNavStage,
  ExportStage,
  FullscreenStage,
  SelectionStatsStage,
];

/** One link of the chain: run this stage, then hand the rest what it grew. */
function LiveChain<TRow>({
  index,
  shell,
  live,
  children,
}: StageProps<TRow> & { readonly index: number }): ReactNode {
  const Stage = LIVE_STAGES[index];
  return Stage === undefined ? (
    children(live)
  ) : (
    <Stage shell={shell} live={live}>
      {(grown) => (
        <LiveChain index={index + 1} shell={shell} live={grown}>
          {children}
        </LiveChain>
      )}
    </Stage>
  );
}

/**
 * Overlay find, grid focus, export and fullscreen onto a finished shell.
 *
 * History is applied first by {@link HistoryLiveGate}.
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
  const idle: ShellLive<TRow> = {
    find: DISABLED_FIND,
    gridFocus: disabledGridFocus(),
    exportHandler: DISABLED_EXPORT,
    fullscreen: DISABLED_FULLSCREEN,
    stats: null,
  };
  return (
    <LiveChain index={0} shell={shell} live={idle}>
      {(live) => children(finishShellLive(shell, live))}
    </LiveChain>
  );
}

function finishShellLive<TRow>(
  shell: DataTableShellResult<TRow>,
  live: ShellLive<TRow>
): DataTableShellResult<TRow> {
  const { find, gridFocus, exportHandler, fullscreen, stats } = live;
  const history = shell.editHistory;
  return {
    ...shell,
    gridFocus,
    find,
    editHistory: history,
    fullscreen,
    selectionStats: stats,
    tableProps: {
      ...shell.tableProps,
      gridFocus,
    },
    toolbarProps: {
      ...shell.toolbarProps,
      ...undoRedoToolbar<TRow>(
        shell.chromeProps.undoRedoButtons,
        history,
        shell.labels
      ),
      ...viewControlsToolbar(shell.chromeProps, fullscreen),
      ...exportHandler,
    },
  };
}
