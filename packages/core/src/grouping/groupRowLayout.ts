/**
 * Where a group header row's cells go.
 *
 * A group header is not free text: it is a row of the same table, and a subtotal
 * only reads as a subtotal when it sits **under the column it totals**. Rendering
 * the row as one spanning cell with the numbers pushed to its end puts them
 * wherever the row happens to finish — which, on a table wide enough to scroll,
 * is off the right edge of the visible area entirely. Measured on the grouping
 * demo at a 1600px viewport: the Budget column at x=1150, its subtotal at
 * x=1448, and the scroll container ending at x=1316.
 *
 * So the row is built like the summary row already was: a leading cell carrying
 * the toggle, the label and the count, then one cell per column, each holding
 * that column's aggregate or nothing at all. The label cell spans the columns
 * before the first aggregate, which keeps the label's roomy look without
 * displacing a single number.
 */
import type { AggregateName } from "../aggregate/aggregate";
import type { ColumnMetadata } from "../columnModel";
import type { DisplayValue } from "../display";

/**
 * Which operation produced each column's aggregate, where the table knows.
 *
 * @public
 */
export type GroupAggregateOps = Readonly<
  Partial<Record<string, AggregateName | "none">>
>;

/**
 * One cell of a group header row, after the leading label cell.
 *
 * @public
 */
export interface GroupRowCell<
  TRow,
  TCol extends ColumnMetadata<TRow> = ColumnMetadata<TRow>,
> {
  /** The column this cell sits under. */
  column: TCol;
  /** That column's aggregate, or `undefined` for an empty cell. */
  node: DisplayValue | undefined;
}

/**
 * How to build a group header row.
 *
 * @public
 */
export interface GroupRowLayout<
  TRow,
  TCol extends ColumnMetadata<TRow> = ColumnMetadata<TRow>,
> {
  /**
   * Columns the leading label cell covers. Its `colSpan` is this length plus
   * however many edge cells (expand chevron, selection checkbox) precede it.
   */
  labelColumns: readonly TCol[];
  /**
   * Aggregates belonging to a column inside the label cell — only possible when
   * the very first column carries one, since the label has to live somewhere.
   * Rendered after the count.
   */
  labelAggregates: readonly GroupRowCell<TRow, TCol>[];
  /** One cell per remaining column, in render order. */
  cells: readonly GroupRowCell<TRow, TCol>[];
}

/**
 * What one aggregate reads as, once the column has had its say.
 *
 * The value the model holds is what the aggregate returned: exports, and
 * anything comparing numbers, keep seeing that. A column's `formatAggregate`
 * decides what the reader sees, and is applied here — where the cell is drawn
 * — exactly once, whichever surface draws it. A kit that lays out its own
 * group rows rather than using {@link groupRowLayout} calls this for each
 * cell, so every kit shows the same thing.
 *
 * @public
 */
export function groupAggregateNode<
  TCol extends { key: string } & Pick<ColumnMetadata<never>, "formatAggregate">,
>(
  column: TCol,
  node: DisplayValue | undefined,
  aggregation: GroupAggregateOps | undefined
): DisplayValue | undefined {
  const format = column.formatAggregate;
  if (!format || node === undefined) return node;
  return format(node, {
    columnKey: column.key,
    aggregation: aggregation?.[column.key],
  });
}

/**
 * Plan a group header row.
 *
 * With no aggregates the row stays a single spanning cell — nothing to align, and
 * a full-width label is what a plain group header should look like.
 *
 * @typeParam TRow - The row type.
 * @param columns - The columns as rendered, in order.
 * @param aggregateCells - Per-column aggregate nodes, keyed by column key.
 * @returns The row's shape.
 *
 * @public
 */
export function groupRowLayout<
  TRow,
  TCol extends ColumnMetadata<TRow> = ColumnMetadata<TRow>,
>(
  columns: readonly TCol[],
  aggregateCells: Readonly<Partial<Record<string, DisplayValue>>> | undefined,
  aggregation?: GroupAggregateOps
): GroupRowLayout<TRow, TCol> {
  // Whether a column carries an aggregate is a question about the data, so it
  // is asked of the value the model holds — a formatter decides how a cell
  // reads, never whether the row has one.
  const has = (column: TCol) => aggregateCells?.[column.key] !== undefined;
  const firstAggregate = columns.findIndex(has);
  if (firstAggregate === -1) {
    return { labelColumns: columns, labelAggregates: [], cells: [] };
  }

  // The label needs at least one column to sit in. When the first column is
  // also the one carrying a number, they share the cell rather than the number
  // being dropped or the label being squeezed into an edge cell.
  const split = Math.max(firstAggregate, 1);
  const labelColumns = columns.slice(0, split);
  return {
    labelColumns,
    labelAggregates: labelColumns.filter(has).map((column) => ({
      column,
      node: groupAggregateNode(
        column,
        aggregateCells?.[column.key],
        aggregation
      ),
    })),
    cells: columns.slice(split).map((column) => ({
      column,
      node: groupAggregateNode(
        column,
        aggregateCells?.[column.key],
        aggregation
      ),
    })),
  };
}

/**
 * Just the columns that carry an aggregate, in column order.
 *
 * A mobile card is a list of label/value pairs rather than a row of columns, so
 * alignment means nothing there and the empty cells are noise. A card shows only
 * the numbers that exist, each captioned by its column.
 *
 * @typeParam TRow - The row type.
 * @param columns - The columns as rendered, in order.
 * @param aggregateCells - Per-column aggregate nodes, keyed by column key.
 * @returns One entry per column that has an aggregate.
 *
 * @public
 */
export function groupAggregateEntries<
  TRow,
  TCol extends ColumnMetadata<TRow> = ColumnMetadata<TRow>,
>(
  columns: readonly TCol[],
  aggregateCells: Readonly<Partial<Record<string, DisplayValue>>> | undefined,
  aggregation?: GroupAggregateOps
): GroupRowCell<TRow, TCol>[] {
  if (!aggregateCells) return [];
  return columns.flatMap((column) => {
    const node = aggregateCells[column.key];
    if (node === undefined) return [];
    return [{ column, node: groupAggregateNode(column, node, aggregation) }];
  });
}

/**
 * How many leaves a group header should report.
 *
 * The server's count when the grouping was computed there — a page of a group
 * of 4,000 still says 4,000 — and the rows in hand otherwise.
 *
 * @param entry - The group entry.
 * @returns The count to display.
 *
 * @public
 */
export function groupLeafCount(entry: {
  leafIds: readonly string[];
  serverCount?: number;
}): number {
  return entry.serverCount ?? entry.leafIds.length;
}
