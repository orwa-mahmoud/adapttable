/**
 * The table region's props: what every kit's table body, header and cards
 * read from the shell. Body-dependent fields start inert; the body gate
 * overlays the window, pins and load-more sentinel once a body path runs.
 */
import {
  ACTIONS_COLUMN_KEY,
  type FilterRuntime,
  REORDER_COLUMN_KEY,
  resolveFilterMode,
  type VirtualTableRow,
} from "@adapttable/core";
import {
  type AssemblyFns,
  cardSetSize,
  sourceWindowStart,
} from "@adapttable/core/binding";
import type { RefCallback } from "react";

import type { TableChrome } from "../chrome/tableChromeContract";
import { disabledGridFocus } from "../features/shellLiveStubs";
import type { ChromeBodyData } from "../virtual/chromeBodyShared";
import type {
  DataTableShellChromeProps,
  DataTableShellProps,
  DataTableShellTableProps,
} from "./shellContract";

/**
 * Build the table region's props from the shell's chrome and the host's props.
 * The row count is the dataset total and `windowStart` is where the rendered
 * slice begins, so Ctrl+End reaches the real last row and the ARIA counts stay
 * truthful under virtualization.
 *
 * @param props - The host's props.
 * @param chromeProps - The props the chrome was built from.
 * @param chrome - The shell's chrome.
 * @param columnWindow - The column window, inert until the body gate runs.
 * @param runtime - The declarative-filter runtime.
 * @param nameScrollBox - Names the scroll box the windows measure.
 * @returns The table props a kit renders.
 */
export function shellTableProps<TRow>(
  props: DataTableShellProps<TRow>,
  chromeProps: DataTableShellChromeProps<TRow>,
  chrome: TableChrome<TRow>,
  columnWindow: DataTableShellTableProps<TRow>["columnWindow"],
  runtime: FilterRuntime<TRow>,
  nameScrollBox: RefCallback<HTMLElement>
): DataTableShellTableProps<TRow> {
  const windowStart = sourceWindowStart(chrome.source);
  const { pinned } = chrome.columnLayout.state;
  return {
    table: chrome.table,
    gridFocus: disabledGridFocus(),
    rows: chrome.editingRows,
    rowActionsLayout: props.rowActionsLayout,
    renderRowActions: props.renderRowActions,
    actionsPinned: pinned[ACTIONS_COLUMN_KEY] === "end",
    rowReorder: chrome.rowReorder,
    reorderPinned: pinned[REORDER_COLUMN_KEY] === "start",
    pinnedTopRows: [] as readonly TRow[],
    pinnedBottomRows: [] as readonly TRow[],
    pinnedSummaryTop: [] as readonly TRow[],
    pinnedSummaryBottom: [] as readonly TRow[],
    getCellSpan: props.getCellSpan,
    cellSpanAppearance: props.cellSpanAppearance,
    extraRows: props.extraRows,
    windowStart,
    // Rows in the whole dataset, for the card list's `aria-setsize`. A card
    // list is a real <ul>, so a windowed one states its size the way a list
    // does — per item — rather than through the table's `aria-rowcount`.
    cardSetSize: cardSetSize(chrome.source, windowStart),
    confirm: chrome.confirm,
    getRowId: chrome.getRowId,
    rowEntries: undefined as readonly VirtualTableRow<TRow>[] | undefined,
    paddingTop: 0,
    paddingBottom: 0,
    measureElement: undefined as
      ChromeBodyData<TRow>["virtualization"]["measureElement"] | undefined,
    measureRowPair: undefined as
      ChromeBodyData<TRow>["virtualization"]["measureRowPair"] | undefined,
    columnWindow,
    fitColumns: props.fitColumns,
    stickyHeader: props.stickyHeader,
    stickyTop: props.stickyTop,
    headerFilters:
      resolveFilterMode(props.filtersMode, props.headerFilters) === "header",
    closeHeaderFilterOnSelect: props.closeHeaderFilterOnSelect === true,
    filterDefs: runtime.defs,
    filterRegistry: runtime.registry,
    pinOffset: chrome.columnLayout.pinOffset,
    maxHeight: props.maxHeight,
    virtualScrollRef: nameScrollBox,
    setWidth: props.resizableColumns ? chrome.columnLayout.setWidth : undefined,
    columnWidths: chrome.columnLayout.state.widths,
    resizeLabel: chrome.table.labels.resizeColumn,
    onRowClick: props.onRowClick,
    prefetch: props.prefetch,
    rowClassName: props.rowClassName,
    isCellFlashing: props.isCellFlashing,
    collapsibleColumnGroups: props.collapsibleColumnGroups === true,
    collapsedColumnGroups: chrome.columnLayout.state.collapsedGroups,
    columnGroups: chrome.columnGroups,
    onToggleColumnGroup: chrome.columnLayout.toggleColumnGroup,
    onRenameColumn:
      props.enableColumnMenu && props.onColumnRename
        ? chrome.columnLayout.setName
        : undefined,
    rowStyle: props.rowStyle,
    rowHeight: props.rowHeight,
    renderCard: props.renderCard,
    summaryRow: chromeProps.summaryRow,
    dir: props.dir,
    assembly: (props as { assembly?: Partial<AssemblyFns<TRow>> }).assembly,
  };
}
