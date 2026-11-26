import type { ColumnMetadata } from "../contracts/columns";

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
export function visibleColumns<TCol extends ColumnMetadata<never>>(
  columns: readonly TCol[],
  layout: TableLayout
): TCol[] {
  if (layout === "desktop") return columns.filter((c) => !c.hideOnDesktop);
  return columns.filter((c) => !c.hideOnMobile);
}
