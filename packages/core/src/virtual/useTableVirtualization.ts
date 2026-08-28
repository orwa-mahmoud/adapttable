import {
  useVirtualizer,
  useWindowVirtualizer,
  type VirtualItem,
} from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { VIRTUAL_OVERSCAN } from "../constants";
import { type RowPairMeasurer, useRowPairMeasurer } from "./measureRowPair";

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
  virtualItem?: VirtualItem;
}

/** Wrap a constant estimate so both virtualizer modes share one shape. */
function asSizeEstimator(
  estimateSize: number | ((index: number) => number)
): (index: number) => number {
  return typeof estimateSize === "function" ? estimateSize : () => estimateSize;
}

/**
 * Spacer height while the virtualizer is armed but has not produced a
 * window yet (null scroll element, first layout). Must not be 0: a 0-height
 * list never intersects the viewport, so the window never appears.
 */
function pendingListSize(
  count: number,
  measured: number,
  estimateSize: number | ((index: number) => number)
): number {
  if (measured > 0) return measured;
  if (count === 0) return 0;
  return count * asSizeEstimator(estimateSize)(0);
}

/**
 * Dataset index for ARIA / focus — the window index when pinning is off.
 *
 * @internal
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
 * Options for `useTableVirtualization`.
 *
 * @public
 */
export interface UseTableVirtualizationOptions<TRow> {
  /** Source rows from the table source. */
  rows: readonly TRow[];
  /** Stable row key resolver. */
  rowKey: (row: TRow) => string;
  /** Master switch; adapters keep this optional. */
  enabled?: boolean;
  /** Estimated row/card size in px, or a per-index reader. */
  estimateSize?: number | ((index: number) => number);
  /** Extra items rendered before/after the visible window. */
  overscan?: number;
  /** Window virtualizer scroll margin, usually sticky header height. */
  scrollMargin?: number;
  /**
   * Scroll container accessor. When provided, the virtual window tracks
   * THIS element's scrolling (a `maxHeight` box) instead of the page —
   * that's how `virtualize` + `maxHeight` compose.
   */
  getScrollElement?: () => Element | null;
  /** Called when the virtual window reaches the last source row. */
  onEndReached?: () => void;
  /**
   * Whether rows can expand. With detail panels in play the window measures
   * each row together with its panel; without them the extra observers would
   * be pure cost.
   */
  expandable?: boolean;
}

/**
 * Resolve either virtual entries or the full source rows into render entries.
 *
 * @internal
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
 * Headless window virtualization for adapter tables. When disabled, it returns
 * every row and no spacer/measurement data, so adapters can use the same render
 * path for virtual and non-virtual tables.
 *
 * @public
 */
export function useTableVirtualization<TRow>({
  rows,
  rowKey,
  enabled = false,
  estimateSize = 56,
  overscan = VIRTUAL_OVERSCAN,
  scrollMargin = 0,
  getScrollElement,
  onEndReached,
  expandable = false,
}: UseTableVirtualizationOptions<TRow>): TableVirtualization<TRow> {
  const elementMode = getScrollElement !== undefined;
  // Stable identity, re-keyed ONLY when the data changes: the virtualizer
  // memoises its measurements on `getItemKey`, so an inline closure (or the
  // routinely-inline `rowKey` prop) invalidated the cache every render — a
  // full O(n) rebuild with n rowKey calls per keystroke at 10k rows. The
  // extractor reads through a ref (ids for the same row are stable by
  // contract), so only a new `rows` array re-keys.
  const rowKeyRef = useRef(rowKey);
  rowKeyRef.current = rowKey;
  const getItemKey = useCallback(
    (index: number): string => {
      const row = rows[index];
      return row === undefined ? String(index) : rowKeyRef.current(row);
    },
    [rows]
  );
  // Both hooks must run unconditionally (rules of hooks); exactly one is
  // enabled. Window mode tracks the page; element mode tracks the box.
  const windowVirtualizer = useWindowVirtualizer({
    count: rows.length,
    enabled: enabled && !elementMode,
    estimateSize: asSizeEstimator(estimateSize),
    getItemKey,
    overscan,
    scrollMargin,
  });
  const elementVirtualizer = useVirtualizer({
    count: rows.length,
    enabled: enabled && elementMode,
    getScrollElement: getScrollElement ?? (() => null),
    estimateSize: asSizeEstimator(estimateSize),
    getItemKey,
    overscan,
  });
  const virtualizer = elementMode ? elementVirtualizer : windowVirtualizer;

  const virtualItems = virtualizer.getVirtualItems();
  const active = enabled && virtualItems.length > 0;
  const measureRowPair = useRowPairMeasurer(virtualizer, enabled && expandable);
  const materializedRows = useMemo<readonly VirtualTableRow<TRow>[]>(() => {
    if (!enabled) {
      return rows.map((row, index) => ({
        row,
        index,
        key: rowKey(row),
      }));
    }
    if (!active) return [];
    return virtualItems.flatMap((virtualItem) => {
      const row = rows[virtualItem.index];
      if (row === undefined) return [];
      return [
        {
          row,
          index: virtualItem.index,
          key: rowKey(row),
          virtualItem,
        },
      ];
    });
  }, [active, enabled, rowKey, rows, virtualItems]);

  // `virtualItems` is a fresh array every render, so a naive effect would call
  // `onEndReached` on every render while the last row stays in view. Notify at
  // most once per row count: re-arm only when more rows actually load (the
  // count grows) or the user scrolls back off the end.
  const notifiedAtCount = useRef(-1);
  useEffect(() => {
    if (!active || rows.length === 0) return;
    const last = virtualItems.at(-1);
    const atEnd = last !== undefined && last.index >= rows.length - 1;
    if (!atEnd) {
      notifiedAtCount.current = -1;
      return;
    }
    if (notifiedAtCount.current !== rows.length) {
      notifiedAtCount.current = rows.length;
      onEndReached?.();
    }
  }, [active, onEndReached, rows.length, virtualItems]);

  if (!enabled) {
    return {
      enabled: false,
      rows: materializedRows,
      paddingTop: 0,
      paddingBottom: 0,
    };
  }

  if (!active) {
    // Armed but no slice yet — a phone card list with a null scroll box used
    // to take this path and mount the whole dataset. Hold the height with a
    // spacer so layout can produce a window; never dump every row.
    return {
      enabled: true,
      rows: materializedRows,
      paddingTop: 0,
      paddingBottom: pendingListSize(
        rows.length,
        virtualizer.getTotalSize(),
        estimateSize
      ),
      measureElement: expandable ? undefined : virtualizer.measureElement,
      measureRowPair: expandable ? measureRowPair : undefined,
    };
  }

  // `active` guarantees a non-empty window, so the edges always exist.
  const first = virtualItems[0]!;
  const last = virtualItems.at(-1)!;
  const resolvedScrollMargin = virtualizer.options.scrollMargin ?? 0;
  const paddingTop = first.start - resolvedScrollMargin;
  const paddingBottom =
    virtualizer.getTotalSize() - (last.end - resolvedScrollMargin);

  return {
    enabled: true,
    rows: materializedRows,
    paddingTop: Math.max(0, paddingTop),
    paddingBottom: Math.max(0, paddingBottom),
    // A row that can expand is measured as a PAIR; one that cannot keeps the
    // virtualizer's own element measurement, which is cheaper.
    measureElement: expandable ? undefined : virtualizer.measureElement,
    measureRowPair: expandable ? measureRowPair : undefined,
  };
}

/**
 * Result of {@link useKeyedVirtualization} — index window over a keyed list.
 *
 * @internal
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

/**
 * Virtualize an opaque keyed list (e.g. grouped flat entries). Same window /
 * element modes as `useTableVirtualization`.
 *
 * @internal
 */
export function useKeyedVirtualization(options: {
  keys: readonly string[];
  enabled?: boolean;
  estimateSize?: number | ((index: number) => number);
  overscan?: number;
  scrollMargin?: number;
  getScrollElement?: () => Element | null;
  onEndReached?: () => void;
}): KeyedVirtualization {
  const {
    keys,
    enabled = false,
    estimateSize = 56,
    overscan = VIRTUAL_OVERSCAN,
    scrollMargin = 0,
    getScrollElement,
    onEndReached,
  } = options;
  const elementMode = getScrollElement !== undefined;
  const getItemKey = (index: number): string => keys[index] ?? String(index);
  const sizeOf = asSizeEstimator(estimateSize);
  const windowVirtualizer = useWindowVirtualizer({
    count: keys.length,
    enabled: enabled && !elementMode,
    estimateSize: sizeOf,
    getItemKey,
    overscan,
    scrollMargin,
  });
  const elementVirtualizer = useVirtualizer({
    count: keys.length,
    enabled: enabled && elementMode,
    getScrollElement: getScrollElement ?? (() => null),
    estimateSize: sizeOf,
    getItemKey,
    overscan,
  });
  const virtualizer = elementMode ? elementVirtualizer : windowVirtualizer;
  const virtualItems = virtualizer.getVirtualItems();
  const active = enabled && virtualItems.length > 0;

  const indices = useMemo<readonly number[]>(() => {
    if (!enabled) return keys.map((_, index) => index);
    if (!active) return [];
    return virtualItems.map((item) => item.index);
  }, [active, enabled, keys, virtualItems]);

  const notifiedAtCount = useRef(-1);
  useEffect(() => {
    if (!active || keys.length === 0) return;
    const last = virtualItems.at(-1);
    const atEnd = last !== undefined && last.index >= keys.length - 1;
    if (!atEnd) {
      notifiedAtCount.current = -1;
      return;
    }
    if (notifiedAtCount.current !== keys.length) {
      notifiedAtCount.current = keys.length;
      onEndReached?.();
    }
  }, [active, onEndReached, keys.length, virtualItems]);

  if (!enabled) {
    return { enabled: false, indices, paddingTop: 0, paddingBottom: 0 };
  }

  if (!active) {
    return {
      enabled: true,
      indices,
      paddingTop: 0,
      paddingBottom: pendingListSize(
        keys.length,
        virtualizer.getTotalSize(),
        estimateSize
      ),
      measureElement: virtualizer.measureElement,
    };
  }

  const first = virtualItems[0]!;
  const last = virtualItems.at(-1)!;
  const resolvedScrollMargin = virtualizer.options.scrollMargin ?? 0;
  const paddingTop = first.start - resolvedScrollMargin;
  const paddingBottom =
    virtualizer.getTotalSize() - (last.end - resolvedScrollMargin);

  return {
    enabled: true,
    indices,
    paddingTop: Math.max(0, paddingTop),
    paddingBottom: Math.max(0, paddingBottom),
    measureElement: virtualizer.measureElement,
  };
}

/**
 * Slice a flat grouped model to the virtual window indices.
 *
 * @internal
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
