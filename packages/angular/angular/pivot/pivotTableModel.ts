/**
 * A `PivotResult`, as the props an Angular table already takes.
 *
 * The engine returns a pivot as data: a column tree, the leaf columns it
 * flattens to, and a list of lines. This maps that onto mechanisms the table
 * already ships, so a kit renders a pivot with its own components:
 *
 * - **The column tree becomes `column.group`.** Header groups already take a
 *   path, already stack a row per level, and already compute spans from
 *   adjacency.
 * - **The lines become rows.** Every line is a row of the table, keyed by the
 *   engine's own key, with one column per leaf.
 * - **The grand total becomes the `summaryRow`.** The table's footer is
 *   already a column-aligned totals row.
 *
 * The fold control on a subtotal line is deliberately not here. The row
 * header takes {@link PivotTableModelOptions.renderRowHeader}, and a host
 * that wants a fold button renders it there. The indent, the part name and
 * the grand-total captions are structure.
 */
import type { CellContext, ColumnDef, Renderer } from "@adapttable/angular";
import {
  PIVOT_ROW_COLUMN_KEY,
  PIVOT_ROW_INDENT,
  type PivotField,
  type PivotResult,
  type PivotRow,
  pivotRowCaption,
  pivotTableLayout,
  resolveLabels,
  type TableLabels,
} from "@adapttable/core";

import { AdaptPivotRowHeader } from "./rowHeader";

export { PIVOT_ROW_COLUMN_KEY } from "@adapttable/core";

/**
 * Options for {@link pivotTableModel}.
 *
 * @public
 */
export interface PivotTableModelOptions {
  /**
   * The fields the pivot was configured from, for the measure captions — the
   * same list the configuration panel takes. Without it a measure column is
   * captioned from its key.
   */
  fields?: readonly PivotField[];
  /**
   * Localized labels. Only the pivot captions are read: the grand-total
   * column's group header, the grand-total footer's caption, and the
   * row-header column's own header when `rowHeader` is absent.
   */
  labels?: TableLabels;
  /**
   * The row-header column's header — the cell in the corner. Defaults to the
   * localized "Rows"; pass the row dimensions' own captions to name them.
   */
  rowHeader?: string;
  /**
   * One body line's row-header content: text, an Angular template, or a
   * standalone component. Templates and components receive the cell context
   * (`row`, `value`, `column`, and `rowIndex`; templates also get `$implicit`).
   * Defaults to the line's own label.
   * This is where a fold control's wording belongs: the line's `kind` says
   * whether it is foldable and its `key` is the collapse key.
   *
   * The grand-total footer keeps its localized caption either way — there is
   * nothing to fold on a total, and a renderer that assumed a label would
   * leave the footer blank.
   */
  renderRowHeader?: (row: PivotRow) => string | Renderer<CellContext<PivotRow>>;
  /**
   * Pixels of indent per nesting level in the row-header column, so a nested
   * pivot reads as nested. Defaults to 16; `0` turns it off.
   */
  indent?: number;
}

/**
 * A pivot as table props. Pass the parts an `AdaptDataTable` takes.
 *
 * @public
 */
export interface PivotTableModel {
  /** The row-header column, then one column per entry of `columnLeaves`. */
  columns: ColumnDef<PivotRow>[];
  /** Every line except the grand total, which is the footer instead. */
  rows: readonly PivotRow[];
  /** Row identity — the engine's own line key. */
  rowKey: (row: PivotRow) => string;
  /**
   * The grand-total line as the table's footer row, or `undefined` when the
   * pivot has no grand total (`grandTotals: false`).
   */
  summaryRow?: (rows: readonly PivotRow[]) => Partial<Record<string, unknown>>;
}

/**
 * Render a pivot with the table you already have.
 *
 * @param result - What `pivot` (or `serverPivotResult`) returned.
 * @param options - Captions, labels and the row-header renderer.
 * @returns Columns, rows, `rowKey` and the `summaryRow` for a table.
 *
 * @public
 */
export function pivotTableModel(
  result: PivotResult,
  options: PivotTableModelOptions = {}
): PivotTableModel {
  const {
    fields,
    renderRowHeader,
    indent = PIVOT_ROW_INDENT,
    rowHeader,
  } = options;
  const labels = resolveLabels(options.labels);
  const layout = pivotTableLayout(result, { fields, labels });
  // The host's row-header renderer, or the line's own caption when it has none.
  const caption =
    renderRowHeader ?? ((row: PivotRow) => pivotRowCaption(row, labels));
  const columns: ColumnDef<PivotRow>[] = [
    {
      key: PIVOT_ROW_COLUMN_KEY,
      header: rowHeader ?? layout.rowHeaderLabel,
      accessor: (row) => pivotRowCaption(row, labels),
      // The label as text, for every context that cannot render an element:
      // an export, an announcement, the clipboard. The cell draws the part.
      formatValue: (row) => pivotRowCaption(row, labels),
      cell: AdaptPivotRowHeader,
      meta: { pivotIndent: indent, pivotCaption: caption },
    },
    ...layout.leafColumns.map(({ key, index, header, group, leaf }) => ({
      key,
      header,
      group,
      mobileLabel: [...(group ?? []), header].join(" / "),
      align: "end" as const,
      accessor: (row: PivotRow) => row.cells[index],
      // The leaf a column renders, for a host that needs to know which
      // measure and which column path it is looking at.
      meta: { pivotLeaf: leaf },
    })),
  ];
  const summaryCells = layout.summaryCells as
    Partial<Record<string, unknown>> | undefined;
  return {
    columns,
    rows: layout.rows,
    rowKey: (row) => row.key,
    summaryRow: summaryCells ? () => summaryCells : undefined,
  };
}
