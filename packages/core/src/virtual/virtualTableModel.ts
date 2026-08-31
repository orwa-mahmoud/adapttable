/**
 * Virtual-table types and pure helpers — no `@tanstack/react-virtual`.
 *
 * The hooks that call TanStack live in {@link ./useTableVirtualization}; this
 * module is what the base table graph is allowed to import.
 */
import type { RowPairMeasurer } from "./measureRowPair";

/**
 * Virtualizer item metadata on a rendered row.
 *
 * Matches the fields adapters read from TanStack's `VirtualItem` without
 * naming that package from the base graph.
 *
 * @public
 */
export interface VirtualItemMeta {
  /** Index in the virtualized list. */
  index: number;
  /** Pixel offset of the item's start. */
  start: number;
  /** Pixel offset of the item's end. */
  end: number;
  /** Measured or estimated size. */
  size: number;
  /** Stable key for the item. */
  key: string | number | bigint;
  /** Lane for variable-size layouts. */
  lane: number;
}

/**
 * One row/card entry materialized from a virtual window.
 *
 * @public
 */
export interface VirtualTableRow<TRow> {
  /** Row data for this visual slot. */
  row: TRow;
  /**
   * Index in the array the virtualizer windows. When pinning is on that is
   * the unpinned scroll list, not the page — use {@link rowSourceIndex}
   * for ARIA, focus and `rowClassName`.
   */
  index: number;
  /**
   * Index in the page's full row list. Equals {@link VirtualTableRow.index}
   * unless pinned rows were pulled out of the window.
   */
  sourceIndex?: number;
  /** Stable key resolved from the caller's rowKey. */
  key: string;
  /** Virtualizer item metadata; absent when virtualization is disabled. */
  virtualItem?: VirtualItemMeta;
}

/**
 * Dataset index for ARIA / focus — the window index when pinning is off.
 *
 * @public
 */
export function rowSourceIndex(
  entry: Pick<VirtualTableRow<unknown>, "index" | "sourceIndex">
): number {
  return entry.sourceIndex ?? entry.index;
}

/**
 * Result consumed by adapters that opt into virtualized rendering.
 *
 * @public
 */
export interface TableVirtualization<TRow> {
  /** Whether the returned rows represent a virtual window. */
  enabled: boolean;
  /** Rows to render: either every source row or only the virtual slice. */
  rows: readonly VirtualTableRow<TRow>[];
  /** Spacer before the rendered slice. */
  paddingTop: number;
  /** Spacer after the rendered slice. */
  paddingBottom: number;
  /** Element measurement callback for virtualized rows/cards. */
  measureElement?: (node: Element | null) => void;
  /**
   * Measure a row TOGETHER with its open detail panel.
   *
   * A table cannot nest a detail panel inside the row it belongs to, so the
   * two are separate elements and the virtualizer would size the item from the
   * row alone. These refs report the pair's real height instead — which is
   * what lets row detail and virtualization be used together at all.
   */
  measureRowPair?: RowPairMeasurer;
}

/**
 * Resolve either virtual entries or the full source rows into render entries.
 *
 * @public
 */
export function resolveVirtualRows<TRow>(
  rows: readonly TRow[],
  rowKey: (row: TRow) => string,
  rowEntries?: readonly VirtualTableRow<TRow>[]
): readonly VirtualTableRow<TRow>[] {
  return (
    rowEntries ??
    rows.map((row, index) => ({
      row,
      index,
      key: rowKey(row),
    }))
  );
}

/** Column span for spacer/detail/summary cells in table-based adapters. */
export function virtualColumnSpan(
  columnCount: number,
  hasSelection: boolean,
  hasActions: boolean,
  hasExpansion = false,
  hasReorder = false
): number {
  return (
    columnCount +
    (hasSelection ? 1 : 0) +
    (hasActions ? 1 : 0) +
    (hasExpansion ? 1 : 0) +
    (hasReorder ? 1 : 0)
  );
}

/**
 * Slice a flat grouped model to the virtual window indices.
 *
 * @public
 */
export function windowGroupedEntries<TEntry>(
  entries: readonly TEntry[],
  indices: readonly number[]
): readonly TEntry[] {
  if (indices.length === entries.length) return entries;
  return indices.flatMap((index) => {
    const entry = entries[index];
    return entry === undefined ? [] : [entry];
  });
}

/**
 * Result of {@link useKeyedVirtualization} — index window over a keyed list.
 *
 * @public
 */
export interface KeyedVirtualization {
  /** Whether virtualization is on. */
  enabled: boolean;
  /** Source indices in the virtual window (or every index when disabled). */
  indices: readonly number[];
  /** Height standing in for the rows above the window. */
  paddingTop: number;
  /** Height standing in for the rows below it. */
  paddingBottom: number;
  /** Hands a row element to the virtualizer. */
  measureElement?: (node: Element | null) => void;
}
