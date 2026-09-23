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
 *   precisely for the card layout. The identity anchor is the first
 *   `mobileIdentityColumns` desktop-visible columns without `hideOnMobile` —
 *   columns that are kept anyway — so it never changes the result, and an
 *   explicit hide always wins.
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
  layout: TableLayout,
  mobileIdentityColumns = 3
): TCol[] {
  if (layout === "desktop") return columns.filter((c) => !c.hideOnDesktop);
  // Identity anchors come from the desktop view (the columns a user knows),
  // but mobile filters the FULL declared set so mobile-only columns survive.
  // An explicit `hideOnMobile` is never anchored — the author's hide wins,
  // and the next desktop-visible column takes the identity slot instead.
  const alwaysShow = new Set(
    columns
      .filter((c) => !c.hideOnDesktop && !c.hideOnMobile)
      .slice(0, Math.max(0, mobileIdentityColumns))
      .map((c) => c.key)
  );
  return columns.filter((c) => alwaysShow.has(c.key) || !c.hideOnMobile);
}
