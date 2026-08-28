/**
 * Sticky chrome for pinned rows — one style, every kit.
 *
 * A pinned row leaves the virtual window and sticks above or below it.
 * Column pins still apply on those cells, so the z-index has to sit
 * between a scrolled pinned column and the sticky header: otherwise a
 * pinned row slides under the header, or a pinned column paints over it.
 */
import { useCallback, useEffect, useState } from "react";

import { PIN_Z } from "../columns/useColumnLayout";
import type { VirtualTableRow } from "../virtual/useTableVirtualization";
import { resolveVirtualRows } from "../virtual/useTableVirtualization";
import type { RowPinSide } from "./rowPinning";

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
 * Sticky style when the row is pinned and the kit asked for sticky pins.
 *
 * @public
 */
export function pinnedRowSticky(
  side: RowPinSide | undefined,
  sticky: boolean,
  headerOffsetPx: number
): ReturnType<typeof pinnedRowStickyStyle> | undefined {
  if (!sticky || !side) return undefined;
  const offset = side === "bottom" ? 0 : headerOffsetPx;
  return pinnedRowStickyStyle(side, offset);
}

/**
 * Sticky style for a pinned-row section (tbody or the row itself).
 *
 * @public
 */
export function pinnedRowStickyStyle(
  side: RowPinSide,
  headerOffsetPx: number
): { position: "sticky"; top?: number; bottom?: number; zIndex: number } {
  if (side === "top") {
    return {
      position: "sticky",
      top: headerOffsetPx,
      zIndex: PIN_Z.rowPinned,
    };
  }
  return {
    position: "sticky",
    bottom: 0,
    zIndex: PIN_Z.rowPinned,
  };
}

/**
 * Extra sticky inset a cell in a pinned row needs, and the z-index when
 * that cell is also a pinned column.
 *
 * @public
 */
export function pinnedRowCellStyle(
  side: RowPinSide | undefined,
  headerOffsetPx: number,
  columnPinned: boolean
): {
  position?: "sticky";
  top?: number;
  bottom?: number;
  zIndex?: number;
} {
  if (!side) return {};
  const edge = side === "top" ? { top: headerOffsetPx } : { bottom: 0 };
  return {
    position: "sticky",
    ...edge,
    zIndex: columnPinned ? PIN_Z.rowPinnedColumn : PIN_Z.rowPinned,
  };
}

/**
 * Measure an element's offset height; used for the sticky header offset.
 *
 * @public
 */
export function useOffsetHeight(): [
  (node: HTMLElement | null) => void,
  number,
] {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [height, setHeight] = useState(0);
  const ref = useCallback((next: HTMLElement | null) => {
    setNode(next);
    if (next) setHeight(next.getBoundingClientRect().height);
  }, []);
  useEffect(() => {
    if (!node || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => {
      setHeight(node.getBoundingClientRect().height);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return [ref, height];
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
