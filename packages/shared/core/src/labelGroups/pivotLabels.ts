/**
 * The strings the pivot draws.
 */
import type { TableLabels } from "../types";

/**
 * The strings the pivot draws.
 *
 * @public
 */
export const PIVOT_LABELS: Pick<
  Required<TableLabels>,
  | "pivotRows"
  | "pivotColumns"
  | "pivotMeasures"
  | "pivotAdd"
  | "pivotRemove"
  | "pivotMoveUp"
  | "pivotMoveDown"
  | "pivotAggregation"
  | "pivotTotal"
  | "pivotGrandTotal"
> = {
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
};
