/**
 * Progressive column hiding: which columns a narrow container can afford.
 *
 * Between "wide enough for everything" and "narrow enough for cards" there is
 * a long middle where a table has too many columns and no good answer. The
 * usual outcomes are a horizontal scrollbar the reader never finds, or columns
 * squeezed until nothing is legible. Neither is a decision — they are what
 * happens when nobody made one.
 *
 * `responsivePriority` is that decision, made once by the person who knows
 * the data: number the columns you are willing to lose, and they go in that
 * order as the space runs out.
 *
 * Two rules keep it predictable:
 *
 * A column without a `responsivePriority` is never dropped. That is what
 * makes the feature opt-in — a table that declares none behaves exactly as
 * before — and it means the columns that carry the row's identity stay put by
 * saying nothing.
 *
 * Dropping is by *declared* width, not by measuring the rendered table. A
 * measured version would have to render, observe, drop, re-render and observe
 * again, and that loop is what produces the flicker you see in tables that do
 * it. Arithmetic on the widths the columns already declare settles in one
 * pass, gives the same answer every time, and is the same number the table's
 * own `min-width` is built from.
 */
import type { ColumnMetadata } from "../columnModel";
import { resolveColumnWidth } from "./columnWidths";

/**
 * Width assumed for a column that declares none. Progressive hiding needs a
 * number for every column, and a table whose columns are all auto-width would
 * otherwise budget them at zero and drop nothing.
 */
export const ASSUMED_COLUMN_WIDTH = 150;

/** What {@link responsiveColumns} needs to know about the container. */
export interface ResponsiveFit<
  TCol extends ColumnMetadata<never> = ColumnMetadata<never>,
> {
  /** The columns in render order, after the user's own hiding. */
  columns: TCol[];
  /** The width available, in pixels. `undefined` before the first measure. */
  available: number | undefined;
  /** Resize overrides from the column layout. */
  widths?: Readonly<Record<string, number>>;
  /** Pixels claimed by non-data columns — selection checkbox, row actions. */
  extra?: number;
}

/** The result of fitting columns to a container. */
export interface ResponsiveColumns<
  TCol extends ColumnMetadata<never> = ColumnMetadata<never>,
> {
  /**
   * The columns that fit, in their original order — and the very same array
   * when nothing was dropped, so the rows this feeds keep their memoization.
   */
  columns: TCol[];
  /** Keys dropped to make them fit, in the order they were dropped. */
  dropped: readonly string[];
}

/** A column's width for budgeting: declared, resized, or assumed. */
function budgetWidth<TRow>(
  column: ColumnMetadata<TRow>,
  widths: Readonly<Record<string, number>> | undefined
): number {
  return resolveColumnWidth(column, widths) ?? ASSUMED_COLUMN_WIDTH;
}

/**
 * The order columns are given up in: highest `responsivePriority` first, and
 * among equals the one furthest right. Numbering follows the ordinary sense
 * of the word — priority 1 is the one you keep longest.
 */
function dropOrder<TRow>(
  columns: readonly ColumnMetadata<TRow>[]
): readonly ColumnMetadata<TRow>[] {
  return columns
    .map((column, index) => ({ column, index }))
    .filter((entry) => entry.column.responsivePriority !== undefined)
    .sort((a, b) => {
      const byPriority =
        (b.column.responsivePriority ?? 0) - (a.column.responsivePriority ?? 0);
      return byPriority === 0 ? b.index - a.index : byPriority;
    })
    .map((entry) => entry.column);
}

/**
 * Fit columns to the available width, giving up the ones the table was told
 * it could give up.
 *
 * @typeParam TRow - The row type.
 * @param fit - The columns, the width to fit them in, and the widths to use.
 * @returns The columns that fit and the keys dropped to get there.
 */
export function responsiveColumns<TCol extends ColumnMetadata<never>>({
  columns,
  available,
  widths,
  extra = 0,
}: ResponsiveFit<TCol>): ResponsiveColumns<TCol> {
  const droppable = dropOrder(columns);
  // Nothing declared, or nothing measured yet: never guess at a narrower
  // table than the one that was asked for.
  if (droppable.length === 0 || available === undefined) {
    return { columns, dropped: [] };
  }

  let width =
    columns.reduce((sum, column) => sum + budgetWidth(column, widths), 0) +
    extra;
  const dropped: string[] = [];
  for (const column of droppable) {
    if (width <= available) break;
    width -= budgetWidth(column, widths);
    dropped.push(column.key);
  }

  if (dropped.length === 0) return { columns, dropped: [] };
  const gone = new Set(dropped);
  return {
    columns: columns.filter((column) => !gone.has(column.key)),
    dropped,
  };
}
