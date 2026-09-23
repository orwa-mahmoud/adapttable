import type { ColumnMetadata } from "../columnModel";

/**
 * Which layout a table is rendering in.
 *
 * @public
 */
export type TableLayout = "desktop" | "mobile";

/**
 * Resolve the columns visible for a layout.
 *
 * - Desktop: drops `hideOnDesktop` columns.
 * - Mobile: drops `hideOnMobile` columns and keeps every other one, including
 *   mobile-only columns (`hideOnDesktop` without `hideOnMobile`), which exist
 *   precisely for the card layout.
 *
 * @typeParam TRow - The row type.
 * @param columns - All declared columns.
 * @param layout - The current layout.
 * @returns The columns to render, in declared order.
 *
 * @public
 */
export function visibleColumns<TCol extends ColumnMetadata<never>>(
  columns: readonly TCol[],
  layout: TableLayout
): TCol[];
/**
 * Resolve the columns visible for a layout.
 *
 * @deprecated The third argument changes nothing: a card shows every column
 * without `hideOnMobile`, so `hideOnMobile` decides what a card shows. Call
 * `visibleColumns(columns, layout)`; the argument is removed in v4.
 *
 * @param columns - All declared columns.
 * @param layout - The current layout.
 * @param mobileIdentityColumns - Ignored.
 * @returns The columns to render, in declared order.
 *
 * @public
 */
export function visibleColumns<TCol extends ColumnMetadata<never>>(
  columns: readonly TCol[],
  layout: TableLayout,
  mobileIdentityColumns: number
): TCol[];
export function visibleColumns<TCol extends ColumnMetadata<never>>(
  columns: readonly TCol[],
  layout: TableLayout
): TCol[] {
  if (layout === "desktop") return columns.filter((c) => !c.hideOnDesktop);
  return columns.filter((c) => !c.hideOnMobile);
}
