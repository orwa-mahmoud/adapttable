/**
 * Mount the chrome-body hooks in-tree, never in the parent shell.
 *
 * The virtualize feature fills `CHROME_BODY` with a child that calls
 * TanStack. The plain path mounts a sibling that never imports it. First
 * paint already knows which child to mount — features are static — so SSR
 * and hydration see the same tree.
 */
import type { EditHistoryState } from "@adapttable/core";
import { overlayChromeExtras } from "@adapttable/core/binding";
import type { ReactNode } from "react";

import type { TableChrome } from "../chrome/tableChromeContract";
import type { ComposedTableProps } from "../props";
import type { DataTableShellChromeProps } from "../shell/shellContract";
import { TableStoreContext } from "../state/tableStoreContext";
import {
  type DataTableShellResult,
  finishDataTableShell,
} from "../useDataTableShell";
import type { ChromeBodyData } from "../virtual/chromeBodyShared";
import { usePlainChromeBodyData } from "../virtual/usePlainChromeBodyData";
import { ChromeExtrasGate } from "./chromeExtrasGate";
import { rememberFeatureHost } from "./featureHost";
import { FeatureStateScope, useFeatureState } from "./featureState";
import { FeatureSlot, useFeatureSlotFilled } from "./providers";
import { ShellLiveGate } from "./shellLiveGate";
import { disabledHistory } from "./shellLiveStubs";
import { CHROME_BODY, type ChromeBodySlotProps } from "./slotKeys";
import {
  EDIT_HISTORY_STATE,
  EDITING_STATE,
  ROW_DETAIL_STATE,
  TABLE_PROPS_STATE,
} from "./stateKeys";

/**
 * Resolve chrome-body data, then finish the table.
 *
 * @public
 */
export function ChromeBodyGate<TRow>({
  chrome,
  props,
  children,
}: {
  readonly chrome: TableChrome<TRow>;
  readonly props: ComposedTableProps<TRow>;
  readonly children: (body: ChromeBodyData<TRow>) => ReactNode;
}): ReactNode {
  const filled = useFeatureSlotFilled(CHROME_BODY);
  if (filled) {
    const slotProps = {
      chrome,
      props,
      children,
    } satisfies ChromeBodySlotProps<TRow>;
    return <FeatureSlot slot={CHROME_BODY} props={slotProps} />;
  }
  return (
    <PlainChromeBody chrome={chrome} props={props}>
      {children}
    </PlainChromeBody>
  );
}

function PlainChromeBody<TRow>({
  chrome,
  props,
  children,
}: {
  readonly chrome: TableChrome<TRow>;
  readonly props: ComposedTableProps<TRow>;
  readonly children: (body: ChromeBodyData<TRow>) => ReactNode;
}): ReactNode {
  const body = usePlainChromeBodyData(chrome, props);
  return children(body);
}

/**
 * The shell snapshots the panel before grouping has computed its cells.
 * The extras overlay is the panel those cells belong on.
 */
function withGroupingPanel<TRow>(
  shell: DataTableShellResult<TRow>,
  panel: DataTableShellResult<TRow>["chrome"]["groupingPanel"]
): DataTableShellResult<TRow> {
  const props = shell.groupingPanelProps;
  if (!props || !panel || props.state === panel) return shell;
  return { ...shell, groupingPanelProps: { ...props, state: panel } };
}

/**
 * Finish a shell with the chrome stages, the in-tree chrome-body path, and
 * the live stages.
 *
 * A mock that already wrote `tableProps.rowEntries` sets
 * `skipChromeBody` so this does not overwrite the injected window.
 * The chrome and live stages still run — those mocks still need real
 * interaction state when the matching feature is composed.
 *
 * @public
 */
export function DataTableShellView<TRow>({
  shell,
  children,
}: {
  readonly shell: DataTableShellResult<TRow>;
  readonly children: (view: DataTableShellResult<TRow>) => ReactNode;
}): ReactNode {
  "use no memo";
  return (
    <TableStoreContext.Provider value={shell.tableStore}>
      <ChromeExtrasGate chrome={shell.chrome} props={shell.chromeProps}>
        {(chrome, chromeProps) => (
          <StagedShell shell={shell} chrome={chrome} chromeProps={chromeProps}>
            {children}
          </StagedShell>
        )}
      </ChromeExtrasGate>
    </TableStoreContext.Provider>
  );
}

/**
 * The shell after the chrome stages: reads what the stages published and
 * finishes the body and the live stages from it.
 */
function StagedShell<TRow>({
  shell,
  chrome,
  chromeProps,
  children,
}: {
  readonly shell: DataTableShellResult<TRow>;
  readonly chrome: TableChrome<TRow>;
  readonly chromeProps: DataTableShellResult<TRow>["chromeProps"];
  readonly children: (view: DataTableShellResult<TRow>) => ReactNode;
}): ReactNode {
  "use no memo";
  const editing = useFeatureState(EDITING_STATE);
  const detail = useFeatureState(ROW_DETAIL_STATE);
  const editHistory = useFeatureState(EDIT_HISTORY_STATE) as
    EditHistoryState<TRow> | undefined;
  // The stages may wrap the commit channels (edit history); the body
  // and the live stages read the wrapped ones.
  rememberFeatureHost(chromeProps, shell.featureHost);
  const staged = {
    ...shell,
    chromeProps,
    editHistory: editHistory ?? disabledHistory(),
  };
  const withExtras = withGroupingPanel(
    overlayChromeExtras(staged, chrome, { editing, detail }),
    chrome.groupingPanel
  );
  const afterBody = (view: DataTableShellResult<TRow>) => (
    <FeatureStateScope
      stateKey={TABLE_PROPS_STATE}
      value={view.chromeProps as DataTableShellChromeProps<unknown>}
    >
      <ShellLiveGate shell={view}>{children}</ShellLiveGate>
    </FeatureStateScope>
  );
  if (shell.skipChromeBody === true) {
    return afterBody(withExtras);
  }
  return (
    <ChromeBodyGate chrome={chrome} props={withExtras.chromeProps}>
      {(body) => afterBody(finishDataTableShell(withExtras, body))}
    </ChromeBodyGate>
  );
}
