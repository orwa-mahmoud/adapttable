/**
 * How wide each column ends up.
 *
 * A table has two honest answers to "how wide is this column": as wide as it
 * needs to be, and as wide as its share of the space. The first overflows and
 * scrolls, which is right for a dense table of many columns; the second fits
 * the container, which is right for a table of six. The difference is one prop,
 * and the mechanism underneath is CSS the browser already knows: a fixed table
 * layout with percentage widths shares space proportionally, and `min-width` /
 * `max-width` clamp it.
 */
import type { CSSProperties } from "react";

import type { ColumnDef } from "../types";
import { columnGroupStubStyle, isColumnGroupStubKey } from "./headerGroups";

/**
 * What the sizing needs to know about the table as a whole.
 *
 * @public
 */
export interface ColumnSizingOptions<TRow> {
  /** The columns as rendered. */
  columns: readonly ColumnDef<TRow>[];
  /** Whether the table fits its container rather than overflowing it. */
  fitColumns?: boolean;
  /** User widths from the layout state, which always win. */
  widths?: Readonly<Record<string, number>>;
}

/**
 * The share of leftover space each flexible column takes.
 *
 * A column with a width — declared or dragged — is not flexible: the user or
 * the author already answered the question for it. Everything else divides
 * what remains, weighted by `flex`, which defaults to 1 in fitting mode so a
 * table of plain columns simply spreads.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link ColumnSizingOptions}.
 * @returns Total flex weight, and each flexible column's percentage.
 *
 * @public
 */
export function columnFlexShares<TRow>(
  options: ColumnSizingOptions<TRow>
): Readonly<Record<string, number>> {
  const { columns, fitColumns = false, widths } = options;
  const flexible = columns.filter(
    (column) =>
      widths?.[column.key] === undefined &&
      column.width === undefined &&
      (column.flex !== undefined || fitColumns)
  );
  const total = flexible.reduce((sum, column) => sum + (column.flex ?? 1), 0);
  if (total === 0) return {};
  const shares: Record<string, number> = {};
  for (const column of flexible) {
    shares[column.key] = ((column.flex ?? 1) / total) * 100;
  }
  return shares;
}

/**
 * The style one column's cells carry: its width, and the bounds it keeps.
 *
 * The user's dragged width wins over everything — they said what they wanted
 * — then the column's own `width`, then its share of the leftover space.
 *
 * @typeParam TRow - The row type.
 * @param column - The column being sized.
 * @param shares - Percentages from {@link columnFlexShares}.
 * @param userWidth - The width from the layout state, when the user set one.
 * @returns The style, or `undefined` when the column says nothing about size.
 *
 * @public
 */
export function columnSizeStyle<TRow>(
  column: ColumnDef<TRow>,
  shares: Readonly<Record<string, number>> = {},
  userWidth?: number
): CSSProperties | undefined {
  if (isColumnGroupStubKey(column.key)) {
    return columnGroupStubStyle();
  }
  const share = shares[column.key];
  const width =
    userWidth ??
    column.width ??
    (share === undefined ? undefined : `${share}%`);
  if (
    width === undefined &&
    column.minWidth === undefined &&
    column.maxWidth === undefined
  ) {
    return undefined;
  }
  return {
    width,
    minWidth: column.minWidth,
    maxWidth: column.maxWidth,
  };
}

/**
 * The style the `<table>` itself carries when it fits its container.
 *
 * `table-layout: fixed` is what makes percentage widths mean anything: without
 * it the browser sizes columns from their content and the percentages are a
 * suggestion it may ignore.
 *
 * @param fitColumns - Whether the table fits its container.
 * @returns The style, or `undefined` when it overflows as usual.
 *
 * @public
 */
export function fittedTableStyle(
  fitColumns?: boolean
): CSSProperties | undefined {
  return fitColumns === true
    ? { tableLayout: "fixed", width: "100%" }
    : undefined;
}
