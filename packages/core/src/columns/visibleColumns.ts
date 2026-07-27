import type { ColumnDef } from "../types";

/** Which layout a table is rendering in. */
export type TableLayout = "desktop" | "mobile";

/**
 * Resolve the columns visible for a layout.
 *
 * - Desktop: drops `hideOnDesktop` columns.
 * - Mobile: drops `hideOnMobile` columns, but the first three declared
 *   desktop-visible columns WITHOUT an explicit `hideOnMobile` surface so
 *   every card keeps a minimum identity block — an explicit hide always
 *   wins over the identity default. Mobile-only columns (`hideOnDesktop`
 *   without `hideOnMobile`) render here — they exist precisely for the
 *   card layout.
 *
 * @typeParam TRow - The row type.
 * @param columns - All declared columns.
 * @param layout - The current layout.
 * @returns The columns to render, in declared order.
 */
export function visibleColumns<TRow>(
  columns: readonly ColumnDef<TRow>[],
  layout: TableLayout,
  mobileIdentityColumns = 3
): ColumnDef<TRow>[] {
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
