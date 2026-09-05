/**
 * Mount the chrome-body hooks in-tree, never in the parent shell.
 *
 * The virtualize feature fills {@link CHROME_BODY} with a child that calls
 * TanStack. The plain path mounts a sibling that never imports it. First
 * paint already knows which child to mount — features are static — so SSR
 * and hydration see the same tree.
 */
import type { ReactNode } from "react";

import { ForcedColorsStyle } from "../a11y/forcedColors";
import { ACTIONS_COLUMN_KEY, REORDER_COLUMN_KEY } from "@adapttable/core";
import type { ComposedTableProps } from "../props";
import {
  type DataTableShellResult,
  finishDataTableShell,
} from "../useDataTableShell";
import type { TableChrome } from "../useTableChrome";
import type { ChromeBodyData } from "../virtual/chromeBodyShared";
import { usePlainChromeBodyData } from "../virtual/usePlainChromeBodyData";
import { ChromeExtrasGate } from "./chromeExtrasGate";
import { FeatureSlot, useFeatureSlotFilled } from "./providers";
import { HistoryLiveGate, ShellLiveGate } from "./shellLiveGate";
import { CHROME_BODY, type ChromeBodySlotProps } from "./slotKeys";

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
    } as unknown as ChromeBodySlotProps<never>;
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

function overlayChromeExtras<TRow>(
  shell: DataTableShellResult<TRow>,
  chrome: TableChrome<TRow>
): DataTableShellResult<TRow> {
  const dropped = new Set(chrome.droppedColumns);
  const visible = chrome.columnLayout.visibleColumns;
  const columns =
    dropped.size === 0
      ? visible
      : visible.filter((column) => !dropped.has(column.key));
  const table = {
    ...shell.tableProps.table,
    ...chrome.table,
    columns,
  };
  return {
    ...shell,
    chrome,
    source: chrome.source,
    table,
    autoSizeColumns: chrome.autoSizeColumns ?? shell.autoSizeColumns,
    autoSizeColumn: chrome.autoSizeColumn ?? shell.autoSizeColumn,
    toolbarProps: {
      ...shell.toolbarProps,
      activeFilterCount: chrome.activeFilterCount,
      onAddRow: chrome.rowMutations.canAdd
        ? chrome.rowMutations.addRow
        : undefined,
    },
    tableProps: {
      ...shell.tableProps,
      table,
      // The row universe an editable cell resolves its commit against. The
      // shell captured the base chrome's, which is the page slice; grouping
      // renders the FULL filtered set, so a commit on any row past page one
      // would find no row and close the editor without a word.
      rows: chrome.editingRows,
      actionsPinned:
        chrome.columnLayout.state.pinned[ACTIONS_COLUMN_KEY] === "end",
      reorderPinned:
        chrome.columnLayout.state.pinned[REORDER_COLUMN_KEY] === "start",
      tree: chrome.tree,
      grouping: chrome.grouping,
      editing: chrome.editing,
      renderRowDetail: chrome.detail?.render,
      expansion: chrome.detail?.expansion,
      rowPinning: chrome.rowPinning,
      rowActions: chrome.rowActions,
      pinOffset: chrome.columnLayout.pinOffset,
      setWidth:
        shell.chromeProps.resizableColumns === true
          ? chrome.columnLayout.setWidth
          : undefined,
      columnWidths: chrome.columnLayout.state.widths,
      collapsedColumnGroups: chrome.columnLayout.state.collapsedGroups,
      columnGroups: chrome.columnGroups,
      onToggleColumnGroup: chrome.columnLayout.toggleColumnGroup,
      onRenameColumn:
        shell.chromeProps.enableColumnMenu && shell.chromeProps.onColumnRename
          ? chrome.columnLayout.setName
          : undefined,
    },
    hasRowActions: chrome.hasRowActions,
  };
}

/**
 * Finish a shell with extras, the in-tree chrome-body path, and live
 * interaction hooks.
 *
 * A mock that already wrote `tableProps.rowEntries` sets
 * `skipChromeBody` so this does not overwrite the injected window.
 * History, extras and find/grid/export still run — those mocks still
 * need real interaction state when the matching feature is composed.
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
  return (
    <>
      <ForcedColorsStyle />
      <HistoryLiveGate shell={shell}>
        {(withHistory) => (
          <ChromeExtrasGate
            chrome={withHistory.chrome}
            props={withHistory.chromeProps}
          >
            {(chrome) => {
              const withExtras = overlayChromeExtras(withHistory, chrome);
              const afterBody = (view: DataTableShellResult<TRow>) => (
                <ShellLiveGate shell={view}>{children}</ShellLiveGate>
              );
              if (shell.skipChromeBody === true) {
                return afterBody(withExtras);
              }
              return (
                <ChromeBodyGate chrome={chrome} props={withExtras.chromeProps}>
                  {(body) => afterBody(finishDataTableShell(withExtras, body))}
                </ChromeBodyGate>
              );
            }}
          </ChromeExtrasGate>
        )}
      </HistoryLiveGate>
    </>
  );
}
