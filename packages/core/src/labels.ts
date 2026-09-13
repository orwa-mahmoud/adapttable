import type { TableLabels } from "./types";

/** Connection tokens the assistant badge shows, in English. */
const ASSISTANT_CONNECTION: Readonly<Record<string, string>> = {
  idle: "Idle",
  connecting: "Connecting…",
  ready: "Ready",
  sending: "Working…",
  "awaiting-approval": "Waiting for you",
  "awaiting-user": "Waiting for you",
  error: "Error",
  disconnected: "Not connected",
};

/** What became of one action, in English. */
/**
 * What a receipt's headline says, per (kind, status).
 *
 * Written out rather than composed from two halves because English is the
 * only language where "filter" + "applied" reliably reads as a sentence, and
 * a translator needs the whole phrase to work with.
 */
const ASSISTANT_RECEIPT_ACTION: Readonly<Record<string, string>> = {
  "filter/executed": "Filter applied",
  "filter/staged": "Filter staged",
  "sort/executed": "Sorted",
  "group/executed": "Grouped",
  "pin/executed": "Column pinned",
  "edit/executed": "Saved",
  "edit/staged": "Edit staged — not saved",
  "edit/awaiting-approval": "Edit awaiting approval",
  "edit/partial": "Some edits saved, some refused",
  "edit/rejected": "Edit refused",
};

/**
 * Why an undo is not on offer, in English.
 *
 * Only the reasons a reader can act on. `nothing-to-undo` never reaches a
 * surface — a turn that changed nothing is offered no control at all.
 */
const ASSISTANT_UNDO_BLOCKED: Readonly<Record<string, string>> = {
  "table-moved": "The table has changed since this ran.",
  "cannot-restore": "Part of this cannot be put back.",
};

/**
 * A capability key as something a reader recognises, in English.
 *
 * Only the keys a reader is ever asked to confirm, which is the only place a
 * key is shown to one. Anything else falls back to the key itself, which is
 * a developer detail and honest about being one.
 */
const ASSISTANT_CAPABILITY: Readonly<Record<string, string>> = {
  "edit.cells": "editing cells",
  "rows.add": "adding rows",
  "rows.delete": "deleting rows",
  "rows.reorder": "reordering rows",
  "export.run": "exporting",
};

const ASSISTANT_RECEIPT: Readonly<Record<string, string>> = {
  executed: "done",
  staged: "staged",
  partial: "partly done",
  rejected: "rejected",
  "awaiting-approval": "waiting for you",
  cancelled: "cancelled",
  stale: "out of date",
  failed: "failed",
};

/**
 * English default strings. Consumers override any subset via the
 * `labels` option; {@link resolveLabels} merges their overrides on top.
 *
 * @public
 */
export const defaultLabels: Required<TableLabels> = {
  table: "Data table",
  search: "Search",
  searchPlaceholder: "Search…",
  noData: "No data",
  noResults: "No results match your filters",
  pageSelected: (count) => `All ${count} on this page selected`,
  selectAllMatching: (total) => `Select all ${total} matching`,
  allMatchingSelected: (total) => `All ${total} matching selected`,
  expandRow: "Expand row",
  collapseRow: "Collapse row",
  operator: "Operator",
  value: "Value",
  from: "From",
  to: "To",
  opEqual: "Equal",
  opAtLeast: "At least",
  opAtMost: "At most",
  opBetween: "Between",
  opOn: "On",
  opOnOrAfter: "On or after",
  opOnOrBefore: "On or before",
  opNotEqual: "Not equal",
  opGreater: "Greater than",
  opLess: "Less than",
  opContains: "Contains",
  opNotContains: "Does not contain",
  opStartsWith: "Starts with",
  opEndsWith: "Ends with",
  opEmpty: "Is empty",
  opNotEmpty: "Is not empty",
  opIn: "Is any of",
  opNotIn: "Is none of",
  opBefore: "Before",
  opAfter: "After",
  opRelative: "Relative",
  relToday: "Today",
  relYesterday: "Yesterday",
  relTomorrow: "Tomorrow",
  relThisWeek: "This week",
  relThisMonth: "This month",
  relPreviousMonth: "Previous month",
  relLastN: "Last N days",
  relNextN: "Next N days",
  boolAny: "Any",
  boolTrue: "True",
  boolFalse: "False",
  savedViews: "Saved views",
  saveView: "Save view",
  viewName: "View name",
  deleteView: "Delete view",
  renameView: "Rename view",
  applyView: "Apply view",
  moveViewUp: "Move view up",
  moveViewDown: "Move view down",
  setDefaultView: "Set as default",
  defaultViewBadge: "Default",
  readOnlyViewBadge: "Read-only",
  loading: "Loading…",
  loadMore: "Load more",
  filters: "Filters",
  clearAll: "Clear all",
  removeFilter: (label) => `Remove filter: ${label}`,
  filtersDone: "Done",
  filterTree: "Advanced",
  filterAddCondition: "Add condition",
  filterAddGroup: "Add group",
  filterCombinatorAnd: "AND",
  filterCombinatorOr: "OR",
  filterRemoveCondition: "Remove condition",
  filterRemoveGroup: "Remove group",
  filterField: "Field",
  checklistSearch: "Search values",
  checklistClear: "Clear",
  checklistNoValues: "No matching values",
  headerFilters: "Column filters",
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
  pinEnd: "Pin to end",
  unpin: "Unpin",
  moveStart: "Move to start",
  moveEnd: "Move to end",
  resetColumns: "Reset columns",
  autoSizeColumns: "Size columns to content",
  autoSizeColumn: "Size column to content",
  resizeColumn: "Resize column",
  showColumn: "Show column",
  hideColumn: "Hide column",
  searchColumns: "Search columns",
  showAllColumns: "Show all",
  hideAllColumns: "Hide all",
  unpinAllColumns: "Unpin all",
  resetColumn: "Reset column",
  renameColumn: "Rename column",
  columnName: "Column name",
  saveColumnName: "Save name",
  cancelColumnRename: "Cancel",
  columnNameRequired: "Enter a column name.",
  columnRenamed: ({ previous, name }) =>
    `Column ${previous} renamed to ${name}`,
  sortAscending: "Sort ascending",
  sortDescending: "Sort descending",
  sortedBy: ({ column, ascending }) =>
    `Sorted by ${column}, ${ascending ? "ascending" : "descending"}`,
  sortingCleared: "Sorting cleared",
  filterColumn: "Filter column",
  columnActions: "Column actions",
  exportCsv: "Export CSV",
  exportFile: (format) => `Export ${format.toUpperCase()}`,
  exportStarted: "Preparing export",
  exportProgress: (progress) => `Export ${String(progress)}% complete`,
  exportDone: "Export complete",
  exportFailed: "Export failed",
  exportCancelled: "Export cancelled",
  exportDownload: "Download export",
  exportDismiss: "Dismiss",
  editCell: "Edit cell",
  undoEdit: "Undo",
  redoEdit: "Redo",
  editRow: "Edit row",
  saveRow: "Save row",
  pendingRows: (count) =>
    count === 1 ? "1 unsaved row" : `${String(count)} unsaved rows`,
  saveAll: "Save all",
  cancelAll: "Cancel all",
  approveProposal: "Approve",
  rejectProposal: "Reject",
  pendingProposals: (count) =>
    count === 1 ? "1 proposed change" : `${String(count)} proposed changes`,
  proposalChange: ({ row, column, before, after }) => {
    const field = column ? `${row} · ${column}` : row;
    if (before === undefined && after === undefined) return field;
    return `${field}: ${before ?? "—"} → ${after ?? "—"}`;
  },
  proposalValueUnavailable: "Unavailable",
  proposalSummary: ({ changes, rows }) => {
    const left =
      changes === 1
        ? "1 proposed change"
        : `${String(changes)} proposed changes`;
    if (rows <= 1) return left;
    return `${left} across ${String(rows)} rows`;
  },
  reviewAllProposals: (count) => `Review all ${String(count)} changes`,
  backToConversation: "Back to conversation",
  approveAllProposals: "Approve all",
  approveRemainingProposals: "Approve remaining",
  rejectAllProposals: "Reject all",
  rejectRemainingProposals: "Reject remaining",
  alwaysAllowProposal: "Always allow",
  proposalTally: ({ pending, approved, rejected }) =>
    `${String(approved)} approved · ${String(rejected)} rejected · ${String(pending)} left`,
  approvalWaitingElsewhere: "A change is waiting for your decision.",
  assistantTitle: "Table assistant",
  assistantOpen: "Ask AI",
  assistantClose: "Close",
  assistantSettings: "Assistant settings",
  assistantEmpty: "What would you like to do?",
  assistantPlaceholder: "Ask about this table…",
  assistantSend: "Send",
  assistantStop: "Stop",
  assistantVoiceStart: "Dictate",
  assistantVoiceStop: "Stop dictation",
  assistantVoiceListening: "Listening",
  assistantVoiceLanguage: "Dictation language",
  assistantYou: "You",
  assistantSpeaker: "Assistant",
  assistantNewMessages: "New messages",
  assistantUnavailable: "The assistant is not connected.",
  assistantBackToTable: "Back to table",
  assistantDetail: "Details",
  assistantSaveInTable: "Save in the table to keep this change.",
  assistantUndo: "Undo",
  assistantUndoBlocked: (code) => ASSISTANT_UNDO_BLOCKED[code],
  assistantAnswerLabel: "Your answer",
  assistantAnswerPlaceholder: "Type an answer",
  assistantAnswerSend: "Answer",
  assistantAlwaysAllowedTitle: "Not asking about",
  assistantAlwaysAllowedRevoke: (capability) =>
    `Ask about ${ASSISTANT_CAPABILITY[capability] ?? capability} again`,
  assistantCapabilityName: (capability) => ASSISTANT_CAPABILITY[capability],
  assistantConnection: (status) => ASSISTANT_CONNECTION[status] ?? "Ready",
  assistantReceipt: ({ capability, status }) => {
    const what = ASSISTANT_RECEIPT[status] ?? status;
    return capability ? `${capability}: ${what}` : what;
  },
  assistantExamples: "Examples",
  assistantMoreExamples: "More examples",
  assistantReceiptStatus: (status) =>
    ASSISTANT_RECEIPT[status] ?? String(status),
  assistantReceiptAction: ({ kind, status }) =>
    kind ? ASSISTANT_RECEIPT_ACTION[`${kind}/${status}`] : undefined,
  assistantReceiptChange: ({ before, after }) =>
    `Changed from ${before} to ${after}`,
  assistantReceiptProposed: ({ before, after }) =>
    `Proposed: ${before} to ${after}`,
  addRow: "Add row",
  duplicateRow: "Duplicate row",
  deleteRow: "Delete row",
  deleteRowConfirm: "Delete this row? This cannot be undone.",
  rowActionsMenu: "Row actions",
  editConflict: "This row changed while you were editing",
  keepMine: "Keep mine",
  takeTheirs: "Take theirs",
  theirsValue: (value) => `Theirs: ${value}`,
  reorderRow: "Reorder row",
  moveRowUp: "Move row up",
  moveRowDown: "Move row down",
  rowLifted: (position) => `Row ${String(position)} lifted`,
  rowMoved: (from, to) => `Row moved from ${String(from)} to ${String(to)}`,
  rowReorderCancelled: "Reorder cancelled",
  rowMoveOptions: "Row move options",
  moveToGroup: "Move to group…",
  moveUnder: "Move under…",
  moveToTopLevel: "Move to top level",
  confirmRowMoveTitle: "Confirm row move",
  confirmRowMoveDescription: (row, from, to) =>
    `Move ${row} from ${from} to ${to}?`,
  confirmRowMove: "Move",
  rowMovedToGroup: (group) => `Row moved to ${group}`,
  rowMovedUnder: (parent) => `Row moved under ${parent}`,
  moveRejectedPolicyNever: "Cross-boundary row moves are disabled",
  moveRejectedSorted: "Clear sorting before changing row order",
  moveRejectedCycle: "A row cannot move inside itself or its descendant",
  moveUnavailable: "This row move is not available",
  rootLevel: "Top level",
  pinToTop: "Pin to top",
  pinToBottom: "Pin to bottom",
  unpinRow: "Unpin row",
  pinnedSummaryRow: "Summary row",
  pinnedSummaryTop: "Pinned summary rows at the top",
  pinnedSummaryBottom: "Pinned summary rows at the bottom",
  rowSeparator: "Separator",
  expandColumnGroup: "Expand column group",
  collapseColumnGroup: "Collapse column group",
  gridRangeCopied: (cells) =>
    `${cells} ${cells === 1 ? "cell" : "cells"} copied`,
  gridRangeCopyFailed: "Copy failed",
  gridRangePasted: (cells) =>
    `${cells} ${cells === 1 ? "cell" : "cells"} pasted`,
  gridRangePasteFailed: "Paste failed",
  gridRangeFilled: (cells) =>
    `${cells} ${cells === 1 ? "cell" : "cells"} filled`,
  gridFillHandle: "Fill from selection",
  selectionCount: "Count",
  selectionSum: "Sum",
  selectionAverage: "Avg",
  selectionMin: "Min",
  selectionMax: "Max",
  editUndone: (cells) => `${cells} ${cells === 1 ? "cell" : "cells"} restored`,
  editRedone: (cells) => `${cells} ${cells === 1 ? "cell" : "cells"} redone`,
  editNothingToUndo: "Nothing to undo",
  findInTable: "Find in table",
  findPlaceholder: "Find in table",
  findMatchCount: (current, total) =>
    total === 0 ? "No matches" : `${current} of ${total}`,
  findPrevious: "Previous match",
  findNext: "Next match",
  findClose: "Close find",
  sidePanel: "Table settings",
  contextMenu: "Table actions",
  commandPalette: "Command palette",
  commandSearch: "Search commands",
  commandEmpty: "No matching command",
  print: "Print",
  density: "Density",
  densityComfortable: "Comfortable",
  densityCompact: "Compact",
  enterFullscreen: "Enter fullscreen",
  exitFullscreen: "Exit fullscreen",
  copyCells: "Copy",
  cutCells: "Cut",
  closePanel: "Close panel",
  pivotRows: "Rows",
  pivotColumns: "Columns",
  pivotMeasures: "Measures",
  pivotAdd: "Add field",
  pivotRemove: "Remove field",
  pivotMoveUp: "Move up",
  pivotMoveDown: "Move down",
  pivotAggregation: "Aggregation",
  pivotTotal: "Total",
  pivotGrandTotal: "Grand total",
  gridCellPosition: (row, total) => `row ${row} of ${total}`,
  gridRangeSelection: ({ fromRow, toRow, fromColumn, toColumn, cells }) =>
    `selected rows ${fromRow} to ${toRow}, columns ${fromColumn} to ${toColumn}, ${cells} cells`,
  moreGroups: (remaining) => `Show ${remaining} more groups`,
  moreRowsInGroup: (remaining) => `Show ${remaining} more in this group`,
  groupTotal: (label) => `${label} total`,
  expandGroup: "Expand group",
  collapseGroup: "Collapse group",
  groupCount: (count) => `(${count})`,
  groupingPanel: "Row grouping",
  groupingDropColumns: "Drag columns here to group",
  addGroupingColumn: "Add grouping column",
  groupByColumn: (label) => `Group by ${label}`,
  ungroupColumn: (label) => `Ungroup ${label}`,
  removeGroupingColumn: (label) => `Remove ${label} from grouping`,
  moveGroupingColumn: (label) => `Move ${label} grouping`,
  groupingDropToRemove: "Drop here to remove grouping",
  groupingAggregateColumn: "Aggregate column",
  groupingAggregation: "Group aggregation",
  groupingAggregationDefault: "Default",
  groupingAggregationNone: "None",
  groupingAggregations: "Aggregations",
  groupingAddAggregation: "Add aggregation column",
  groupingRestoreAggregations: "Restore defaults",
  groupingRemoveAggregation: (column: string) => `Remove ${column} aggregation`,
  groupingAggregationFor: (column: string) => `${column} aggregation`,
  groupingAggregationReadOnly: "Set by the app",
  groupingAggregationCustom: "Custom",
  groupingAggregateRemoved: (column: string) => `${column} aggregate removed`,
  groupingAggregatesRestored: "Aggregations restored to defaults",
  groupingAverage: "Average",
  groupingAdded: (label) => `${label} added to grouping`,
  groupingRemoved: (label) => `${label} removed from grouping`,
  groupingMoved: (label, position) =>
    `${label} moved to grouping position ${position}`,
  groupingAggregateChanged: (label, aggregation) =>
    `${label} group aggregation changed to ${aggregation}`,
  noticeVirtualizePaged:
    "Virtualization is off — this paged table shows one page at a time.",
  noticePinNested: "Row pinning is off while grouping or a tree is on.",
  noticeReorderNested:
    "Cross-boundary row moves follow the configured move policy.",
  noticeGroupingUnavailable: "Grouping is off — this source cannot group.",
  noticeExportAllPage:
    "Export all is off — this source provides one page at a time.",
  noticeEditWithoutWriter: "Editing is off — no write handler is wired.",
};

/**
 * Merge caller overrides over {@link defaultLabels}. Undefined entries in
 * the override are ignored, so partial `labels` objects are safe.
 *
 * @param overrides - A partial set of label overrides.
 * @returns A fully-populated, immutable label set.
 *
 * @public
 */
export function resolveLabels(
  overrides: TableLabels | undefined
): Required<TableLabels> {
  if (!overrides) return defaultLabels;
  const merged = { ...defaultLabels };
  for (const key of Object.keys(overrides) as (keyof TableLabels)[]) {
    const value = overrides[key];
    if (value !== undefined) {
      // Each key's value type matches the same key in the target.
      (merged[key] as unknown) = value;
    }
  }
  return merged;
}
