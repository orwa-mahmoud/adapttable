/**
 * The strings the column menu and column groups draw.
 */
import type { TableLabels } from "../types";

/**
 * The strings the column menu and column groups draw.
 *
 * @public
 */
export const COLUMN_MENU_LABELS: Pick<
  Required<TableLabels>,
  | "pinEnd"
  | "moveStart"
  | "moveEnd"
  | "resetColumns"
  | "autoSizeColumns"
  | "autoSizeColumn"
  | "showColumn"
  | "searchColumns"
  | "showAllColumns"
  | "hideAllColumns"
  | "unpinAllColumns"
  | "resetColumn"
  | "columnActions"
  | "groupByColumn"
  | "ungroupColumn"
  | "groupingAggregation"
> = {
  pinEnd: "Pin to end",
  moveStart: "Move to start",
  moveEnd: "Move to end",
  resetColumns: "Reset columns",
  autoSizeColumns: "Size columns to content",
  autoSizeColumn: "Size column to content",
  showColumn: "Show column",
  searchColumns: "Search columns",
  showAllColumns: "Show all",
  hideAllColumns: "Hide all",
  unpinAllColumns: "Unpin all",
  resetColumn: "Reset column",
  columnActions: "Column actions",
  groupByColumn: (label) => `Group by ${label}`,
  ungroupColumn: (label) => `Ungroup ${label}`,
  groupingAggregation: "Group aggregation",
};
