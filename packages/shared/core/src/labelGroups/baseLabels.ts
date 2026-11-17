/**
 * The strings every table draws: its name, paging, sorting, empty, loading and error states, and the announcements.
 */
import type { TableLabels } from "../types";

/**
 * The strings every table draws: its name, paging, sorting, empty, loading and error states, and the announcements.
 *
 * @public
 */
export const BASE_LABELS: Pick<
  Required<TableLabels>,
  | "table"
  | "search"
  | "searchPlaceholder"
  | "noData"
  | "noResults"
  | "expandRow"
  | "collapseRow"
  | "value"
  | "filterAll"
  | "applyView"
  | "loading"
  | "loadMore"
  | "filters"
  | "clearAll"
  | "filterTree"
  | "sortBy"
  | "rowsPerPage"
  | "actions"
  | "selectAll"
  | "selectRow"
  | "selectColumn"
  | "cancel"
  | "retry"
  | "errorTitle"
  | "errorMessage"
  | "previousPage"
  | "nextPage"
  | "goToPage"
  | "selectedCount"
  | "showing"
  | "pageOf"
  | "columns"
  | "pinStart"
  | "unpin"
  | "resizeColumn"
  | "hideColumn"
  | "sortAscending"
  | "sortDescending"
  | "sortedBy"
  | "sortingCleared"
  | "filterColumn"
  | "exportCsv"
  | "editCell"
  | "undoEdit"
  | "redoEdit"
  | "editRow"
  | "saveRow"
  | "approveProposal"
  | "rejectProposal"
  | "addRow"
  | "rowActionsMenu"
  | "reorderRow"
  | "confirmRowMoveTitle"
  | "confirmRowMoveDescription"
  | "confirmRowMove"
  | "pinnedSummaryRow"
  | "pinnedSummaryTop"
  | "pinnedSummaryBottom"
  | "rowSeparator"
  | "selectionCount"
  | "selectionSum"
  | "selectionMin"
  | "selectionMax"
  | "sidePanel"
  | "contextMenu"
  | "commandPalette"
  | "print"
  | "density"
  | "closePanel"
  | "groupTotal"
  | "groupCount"
  | "groupingPanel"
  | "groupingRemoveAggregation"
  | "groupingAggregationCustom"
  | "groupingAverage"
  | "noticeVirtualizePaged"
  | "noticePinNested"
  | "noticeReorderNested"
  | "noticeGroupingUnavailable"
  | "noticeExportAllPage"
  | "noticeEditWithoutWriter"
  | "pageSelected"
  | "selectAllMatching"
  | "allMatchingSelected"
  | "expandColumnGroup"
  | "collapseColumnGroup"
  | "renameColumn"
  | "columnName"
  | "saveColumnName"
  | "cancelColumnRename"
  | "columnNameRequired"
  | "columnRenamed"
> = {
  table: "Data table",
  search: "Search",
  searchPlaceholder: "Search…",
  noData: "No data",
  noResults: "No results match your filters",
  expandRow: "Expand row",
  collapseRow: "Collapse row",
  value: "Value",
  filterAll: "All",
  applyView: "Apply view",
  loading: "Loading…",
  loadMore: "Load more",
  filters: "Filters",
  clearAll: "Clear all",
  filterTree: "Advanced",
  sortBy: "Sort by",
  rowsPerPage: "Rows per page",
  actions: "Actions",
  selectAll: "Select all",
  selectRow: "Select row",
  selectColumn: "Select column",
  cancel: "Cancel",
  retry: "Retry",
  errorTitle: "Something went wrong",
  errorMessage: "We couldn't load this data.",
  previousPage: "Previous page",
  nextPage: "Next page",
  goToPage: (page) => `Go to page ${page}`,
  selectedCount: (count) => `${count} selected`,
  showing: ({ from, to, total }) => `Showing ${from}–${to} of ${total}`,
  pageOf: ({ page, total }) => `Page ${page} of ${total}`,
  columns: "Columns",
  pinStart: "Pin to start",
  unpin: "Unpin",
  resizeColumn: "Resize column",
  hideColumn: "Hide column",
  sortAscending: "Sort ascending",
  sortDescending: "Sort descending",
  sortedBy: ({ column, ascending }) =>
    `Sorted by ${column}, ${ascending ? "ascending" : "descending"}`,
  sortingCleared: "Sorting cleared",
  filterColumn: "Filter column",
  exportCsv: "Export CSV",
  editCell: "Edit cell",
  undoEdit: "Undo",
  redoEdit: "Redo",
  editRow: "Edit row",
  saveRow: "Save row",
  approveProposal: "Approve",
  rejectProposal: "Reject",
  addRow: "Add row",
  rowActionsMenu: "Row actions",
  reorderRow: "Reorder row",
  confirmRowMoveTitle: "Confirm row move",
  confirmRowMoveDescription: (row, from, to) =>
    `Move ${row} from ${from} to ${to}?`,
  confirmRowMove: "Move",
  pinnedSummaryRow: "Summary row",
  pinnedSummaryTop: "Pinned summary rows at the top",
  pinnedSummaryBottom: "Pinned summary rows at the bottom",
  rowSeparator: "Separator",
  selectionCount: "Count",
  selectionSum: "Sum",
  selectionMin: "Min",
  selectionMax: "Max",
  sidePanel: "Table settings",
  contextMenu: "Table actions",
  commandPalette: "Command palette",
  print: "Print",
  density: "Density",
  closePanel: "Close panel",
  groupTotal: (label) => `${label} total`,
  groupCount: (count) => `(${count})`,
  groupingPanel: "Row grouping",
  groupingRemoveAggregation: (column: string) => `Remove ${column} aggregation`,
  groupingAggregationCustom: "Custom",
  groupingAverage: "Average",
  noticeVirtualizePaged:
    "Virtualization is off — this paged table shows one page at a time.",
  noticePinNested: "Row pinning is off while grouping or a tree is on.",
  noticeReorderNested:
    "Cross-boundary row moves follow the configured move policy.",
  noticeGroupingUnavailable: "Grouping is off — this source cannot group.",
  noticeExportAllPage:
    "Export all is off — this source provides one page at a time.",
  noticeEditWithoutWriter: "Editing is off — no write handler is wired.",
  pageSelected: (count) => `All ${count} on this page selected`,
  selectAllMatching: (total) => `Select all ${total} matching`,
  allMatchingSelected: (total) => `All ${total} matching selected`,
  expandColumnGroup: "Expand column group",
  collapseColumnGroup: "Collapse column group",
  renameColumn: "Rename column",
  columnName: "Column name",
  saveColumnName: "Save name",
  cancelColumnRename: "Cancel",
  columnNameRequired: "Enter a column name.",
  columnRenamed: ({ previous, name }) =>
    `Column ${previous} renamed to ${name}`,
};
