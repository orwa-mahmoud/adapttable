/**
 * The binding's pivot model, with this kit's row-header cell.
 */
import {
  PIVOT_ROW_COLUMN_KEY,
  type PivotTableModel,
  pivotTableModel as bindingPivotTableModel,
  type PivotTableModelOptions,
} from "@adapttable/angular/pivot";
import { AdaptPivotRowHeader } from "@adapttable/angular-aria";

/**
 * A pivot as table props, drawing the row header with this kit's cell.
 *
 * @param result - What `pivot` (or `serverPivotResult`) returned.
 * @param options - Captions, labels and the row-header renderer.
 * @returns Columns, rows, `rowKey` and the `summaryRow` for a table.
 *
 * @public
 */
export function pivotTableModel(
  result: Parameters<typeof bindingPivotTableModel>[0],
  options?: PivotTableModelOptions
): PivotTableModel {
  const model = bindingPivotTableModel(result, options);
  return {
    ...model,
    columns: model.columns.map((column) =>
      column.key === PIVOT_ROW_COLUMN_KEY
        ? { ...column, cell: AdaptPivotRowHeader }
        : column
    ),
  };
}
