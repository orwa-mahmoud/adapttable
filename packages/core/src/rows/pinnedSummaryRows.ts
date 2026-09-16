/**
 * Independent pinned summary rows — host-owned objects outside the row model.
 *
 * These are not lifted data rows. They never enter sort, filter, grouping,
 * pagination or selection. They render through the ordinary column pipeline
 * and stick above or below the scroll window, including on grouped and tree
 * tables where lift-a-data-row pinning stays refused.
 */
import type { RowPinSide } from "./rowPinModel";

/**
 * Prefix for every generated summary-row identity.
 *
 * @public
 */
export const PINNED_SUMMARY_KEY_PREFIX = "adapttable:pinned-summary";

/**
 * `data-adapttable-part` on a top summary row.
 *
 * @public
 */
export const PINNED_SUMMARY_TOP_PART = "pinned-summary-top";

/**
 * `data-adapttable-part` on a bottom summary row.
 *
 * @public
 */
export const PINNED_SUMMARY_BOTTOM_PART = "pinned-summary-bottom";

/**
 * Host-supplied summary objects that stick above and below the scroll body.
 *
 * @public
 */
export interface PinnedRows<TRow = unknown> {
  /** Summary rows rendered above the scroll window. */
  readonly top?: readonly TRow[];
  /** Summary rows rendered below the scroll window. */
  readonly bottom?: readonly TRow[];
}

/**
 * One resolved summary row with a stable, namespaced identity.
 *
 * @public
 */
export interface PinnedSummaryEntry<TRow = unknown> {
  /** Host-supplied summary object. */
  readonly row: TRow;
  /** Edge this summary sticks to. */
  readonly side: RowPinSide;
  /** Zero-based position within that edge. */
  readonly index: number;
  /** Identity that never collides with a data-row id. */
  readonly id: string;
}

/**
 * Empty summary lists.
 *
 * @public
 */
export const EMPTY_PINNED_ROWS: PinnedRows<never> = {};

/**
 * Stable identity for one summary row.
 *
 * @public
 */
export function pinnedSummaryRowId(side: RowPinSide, index: number): string {
  return `${PINNED_SUMMARY_KEY_PREFIX}:${side}:${String(index)}`;
}

/**
 * Normalize omitted edges to empty arrays.
 *
 * @public
 */
export function resolvePinnedRows<TRow>(
  pinnedRows: PinnedRows<TRow> | undefined
): { top: readonly TRow[]; bottom: readonly TRow[] } {
  return {
    top: pinnedRows?.top ?? [],
    bottom: pinnedRows?.bottom ?? [],
  };
}

/**
 * Flatten one edge into keyed entries.
 *
 * @public
 */
export function pinnedSummaryEntries<TRow>(
  rows: readonly TRow[],
  side: RowPinSide
): readonly PinnedSummaryEntry<TRow>[] {
  return rows.map((row, index) => ({
    row,
    side,
    index,
    id: pinnedSummaryRowId(side, index),
  }));
}

/**
 * Every resolved summary entry, top then bottom.
 *
 * @public
 */
export function allPinnedSummaryEntries<TRow>(
  pinnedRows: PinnedRows<TRow> | undefined
): readonly PinnedSummaryEntry<TRow>[] {
  const resolved = resolvePinnedRows(pinnedRows);
  return [
    ...pinnedSummaryEntries(resolved.top, "top"),
    ...pinnedSummaryEntries(resolved.bottom, "bottom"),
  ];
}

/**
 * Part name for a summary row.
 *
 * @public
 */
export function pinnedSummaryPart(
  side: RowPinSide
): typeof PINNED_SUMMARY_TOP_PART | typeof PINNED_SUMMARY_BOTTOM_PART {
  return side === "top" ? PINNED_SUMMARY_TOP_PART : PINNED_SUMMARY_BOTTOM_PART;
}

/**
 * Whether `id` was minted for a summary row.
 *
 * @public
 */
export function isPinnedSummaryRowId(id: string): boolean {
  return id.startsWith(`${PINNED_SUMMARY_KEY_PREFIX}:`);
}

/**
 * Edge encoded in a namespaced summary id, or `undefined` if it is not one.
 *
 * @public
 */
export function pinnedSummarySideFromId(id: string): RowPinSide | undefined {
  if (id.startsWith(`${PINNED_SUMMARY_KEY_PREFIX}:top:`)) return "top";
  if (id.startsWith(`${PINNED_SUMMARY_KEY_PREFIX}:bottom:`)) return "bottom";
  return undefined;
}
