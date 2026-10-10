/**
 * A `PivotResult`, as the props a `DataTable` already takes.
 *
 * The engine returns a pivot as data: a column tree, the leaf columns it
 * flattens to, and a list of lines. Rendering that was left entirely to the
 * host — which sounds like freedom and works out as a hand-rolled `<table>`,
 * because a pivot has three shapes an ordinary table does not: header cells
 * that span, a row-header area down the side, and lines that are totals rather
 * than data. Every host that wanted a pivot in their own kit had to draw those
 * by hand, so the pivot was the one feature whose look nobody's adapter owned.
 *
 * This is the other half. It maps the result onto mechanisms the table already
 * ships, so any kit renders a pivot with its own components and nothing new:
 *
 * - **The column tree becomes `column.group`.** Header groups already take a
 *   path (`["EU", "Q1"]`), already stack a row per level, and already compute
 *   spans from adjacency — which is exactly the tree the engine built. The
 *   grand-total column sits under its own one-level group, so it reads as
 *   apart from the tree rather than inside it.
 * - **The lines become rows.** Every line is a row of the table, keyed by the
 *   engine's own key, with one column per leaf.
 * - **The grand total becomes the `summaryRow`.** The table's footer is
 *   already a column-aligned totals row; a pivot's grand total is a
 *   column-aligned totals row. Two mechanisms for one thing would let them
 *   disagree.
 *
 * What is deliberately NOT here: the fold control on a subtotal line. Core
 * ships no user-facing controls — the row header takes
 * {@link PivotTableModelOptions.renderRowHeader}, and a host that wants a
 * fold button renders it there with its own kit's button, wired to the same
 * `collapsed` set the engine reads. The indent, the part name and the
 * grand-total captions are structure, which is core's.
 */
import {
  PIVOT_ROW_COLUMN_KEY,
  PIVOT_ROW_INDENT,
  type PivotField,
  type PivotResult,
  type PivotRow,
  pivotRowCaption,
  pivotRowIndentStyle,
  pivotTableLayout,
  resolveLabels,
  type TableLabels,
} from "@adapttable/core";
import type { ReactNode } from "react";

import type { ColumnDef } from "../columnDef";

export type { TableLabels };

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
  rowHeader?: ReactNode;
  /**
   * One body line's row-header content. Defaults to the line's own label. This
   * is where a fold control belongs: the line's `kind` says whether it is
   * foldable and its `key` is the collapse key.
   *
   * The grand-total footer keeps its localized caption either way — there is
   * nothing to fold on a total, and a renderer that assumed a label would
   * leave the footer blank.
   */
  renderRowHeader?: (row: PivotRow) => ReactNode;
  /**
   * Pixels of indent per nesting level in the row-header column, so a nested
   * pivot reads as nested. Defaults to 16; `0` turns it off.
   */
  indent?: number;
}

/**
 * A pivot as table props. Spread the parts a `DataTable` takes.
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
  summaryRow?: (
    rows: readonly PivotRow[]
  ) => Partial<Record<string, ReactNode>>;
}

/** One line's row-header cell: the indent, the part name, and the content. */
function rowHeaderCell(
  row: PivotRow,
  indent: number,
  content: ReactNode
): ReactNode {
  return (
    <span
      data-adapttable-part="pivot-row-header"
      data-pivot-kind={row.kind}
      style={pivotRowIndentStyle(row, indent)}
    >
      {content}
    </span>
  );
}

/**
 * Render a pivot with the table you already have.
 *
 * @param result - What `pivot` (or `serverPivotResult`) returned.
 * @param options - Captions, labels and the row-header renderer.
 * @returns Columns, rows, `rowKey` and the `summaryRow` for a `DataTable`.
 *
 * ```tsx
 * const result = pivot(rows, config, { collapsed });
 * const model = pivotTableModel(result, { fields, labels });
 *
 * <DataTable {...model} />;
 * ```
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
      accessor: (row) => rowHeaderCell(row, indent, caption(row)),
      // The label as text, for every context that cannot render an element:
      // an export, an announcement, the clipboard.
      formatValue: (row) => pivotRowCaption(row, labels),
    },
    ...layout.leafColumns.map(({ key, index, header, group, leaf }) => ({
      key,
      header,
      group,
      mobileLabel: [...(group ?? []), header].join(" / "),
      align: "end" as const,
      accessor: (row: PivotRow) => row.cells[index] as ReactNode,
      // The leaf a column renders, for a host that needs to know which
      // measure and which column path it is looking at.
      meta: { pivotLeaf: leaf },
    })),
  ];

  // Pivot cells are display values, rendered as nodes like every accessor's.
  const summaryCells = layout.summaryCells as
    Partial<Record<string, ReactNode>> | undefined;
  return {
    columns,
    rows: layout.rows,
    rowKey: (row) => row.key,
    summaryRow: summaryCells ? () => summaryCells : undefined,
  };
}
