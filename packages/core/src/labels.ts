import type { TableLabels } from "./types";

/**
 * English default strings. Consumers override any subset via the
 * `labels` option; {@link resolveLabels} merges their overrides on top.
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
  savedViews: "Saved views",
  saveView: "Save view",
  viewName: "View name",
  deleteView: "Delete view",
  loading: "Loading…",
  loadMore: "Load more",
  filters: "Filters",
  clearAll: "Clear all",
  filtersDone: "Done",
  applyFilters: "Done",
  sortBy: "Sort by",
  rowsPerPage: "Rows per page",
  actions: "Actions",
  selectAll: "Select all",
  selectRow: "Select row",
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
  resizeColumn: "Resize column",
  showColumn: "Show column",
  hideColumn: "Hide column",
  exportCsv: "Export CSV",
  editCell: "Edit cell",
  expandGroup: "Expand group",
  collapseGroup: "Collapse group",
  groupCount: (count) => `(${count})`,
};

/**
 * Merge caller overrides over {@link defaultLabels}. Undefined entries in
 * the override are ignored, so partial `labels` objects are safe.
 *
 * @param overrides - A partial set of label overrides.
 * @returns A fully-populated, immutable label set.
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
  // v1 alias: a caller overriding only `applyFilters` still labels the
  // filters-done button (deleted before the 2.0.0 release).
  if (overrides.filtersDone === undefined && overrides.applyFilters) {
    merged.filtersDone = overrides.applyFilters;
  }
  return merged;
}
