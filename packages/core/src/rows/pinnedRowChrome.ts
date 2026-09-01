/**
 * Sticky chrome for pinned rows — one style, every kit.
 *
 * A pinned row leaves the virtual window and sticks above or below it.
 * Column pins still apply on those cells, so the z-index has to sit
 * between a scrolled pinned column and the sticky header: otherwise a
 * pinned row slides under the header, or a pinned column paints over it.
 */
import type { VirtualTableRow } from "../virtual/virtualTableModel";
import { resolveVirtualRows } from "../virtual/virtualTableModel";
import type { RowPinSide } from "./rowPinning";

export { useOffsetHeight } from "../layout/useOffsetHeight";
export {
  pinnedRowCellStyle,
  pinnedRowSticky,
  pinnedRowStickyStyle,
} from "./rowPresentation";

/**
 * `data-adapttable-part` on a pinned row in the shared tbody.
 *
 * @public
 */
export const PINNED_TOP_PART = "pinned-top";
/**
 * Bottom pin marker on that row.
 *
 * @public
 */
export const PINNED_BOTTOM_PART = "pinned-bottom";

/**
 * Part name for a pinned row, or `undefined` when the row is not pinned.
 *
 * @public
 */
export function pinnedRowPart(
  side: RowPinSide | undefined
): typeof PINNED_TOP_PART | typeof PINNED_BOTTOM_PART | undefined {
  if (side === "top") return PINNED_TOP_PART;
  if (side === "bottom") return PINNED_BOTTOM_PART;
  return undefined;
}

/**
 * Card list order: top pins, then the scroll window, then bottom pins.
 * Desktop sticky sections use the same three lists; cards are a list, so
 * this is the only "chrome" they get.
 *
 * @public
 */
export function orderedCardEntries<TRow>(
  rows: readonly TRow[],
  getRowId: (row: TRow) => string,
  rowEntries: readonly VirtualTableRow<TRow>[] | undefined,
  pinnedTop: readonly TRow[],
  pinnedBottom: readonly TRow[]
): readonly VirtualTableRow<TRow>[] {
  if (pinnedTop.length === 0 && pinnedBottom.length === 0) {
    return resolveVirtualRows(rows, getRowId, rowEntries);
  }
  const pinnedIds = new Set<string>();
  for (const row of pinnedTop) pinnedIds.add(getRowId(row));
  for (const row of pinnedBottom) pinnedIds.add(getRowId(row));
  const indexById = new Map<string, number>();
  rows.forEach((row, index) => indexById.set(getRowId(row), index));
  const asEntry = (row: TRow): VirtualTableRow<TRow> => {
    const key = getRowId(row);
    const sourceIndex = indexById.get(key) ?? 0;
    return { row, index: sourceIndex, sourceIndex, key };
  };
  const scroll = resolveVirtualRows(rows, getRowId, rowEntries).filter(
    (entry) => !pinnedIds.has(entry.key)
  );
  return [...pinnedTop.map(asEntry), ...scroll, ...pinnedBottom.map(asEntry)];
}
