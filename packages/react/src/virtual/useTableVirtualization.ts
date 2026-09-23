/**
 * TanStack-backed row virtualization hooks.
 *
 * Import from `@adapttable/core` / `@adapttable/core/binding` only when a
 * table composes {@link virtualize}. The base table graph must not reach this
 * file — types and pure helpers live in {@link ./virtualTableModel}.
 */
import {
  type KeyedVirtualization,
  type TableVirtualization,
  VIRTUAL_OVERSCAN,
  type VirtualItemMeta,
  type VirtualTableRow,
} from "@adapttable/core";
import {
  useVirtualizer,
  useWindowVirtualizer,
  type VirtualItem,
  type Virtualizer,
} from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { useRowPairMeasurer } from "./measureRowPair";

export type {
  KeyedVirtualization,
  TableVirtualization,
  VirtualItemMeta,
  VirtualTableRow,
} from "@adapttable/core";
export {
  resolveVirtualRows,
  virtualColumnSpan,
  windowGroupedEntries,
} from "@adapttable/core";
export { rowSourceIndex } from "@adapttable/core/binding";

/** Either TanStack virtualizer — window mode or element mode. */
type ModeVirtualizer =
  Virtualizer<Window, Element> | Virtualizer<Element, Element>;

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

function asItemMeta(item: VirtualItem): VirtualItemMeta {
  return {
    index: item.index,
    start: item.start,
    end: item.end,
    size: item.size,
    key: item.key,
    lane: item.lane,
  };
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
 * Headless window virtualization for adapter tables. When disabled, it returns
 * every row and no spacer/measurement data, so adapters can use the same render
 * path for virtual and non-virtual tables.
 *
 * @public
 */
export function useTableVirtualization<TRow>(
  options: UseTableVirtualizationOptions<TRow>
): TableVirtualization<TRow> {
  return useTableVirtualizer(options).virtualization;
}

/**
 * {@link useTableVirtualization}, plus the virtualizer's own scroll — what the
 * table's body needs to bring an unrendered row into the window.
 */
export function useTableVirtualizer<TRow>({
  rows,
  rowKey,
  enabled = false,
  estimateSize = 56,
  overscan = VIRTUAL_OVERSCAN,
  scrollMargin = 0,
  getScrollElement,
  onEndReached,
  expandable = false,
}: UseTableVirtualizationOptions<TRow>): {
  virtualization: TableVirtualization<TRow>;
  scrollToIndex: (index: number) => void;
} {
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
          virtualItem: asItemMeta(virtualItem),
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

  const scrollToIndex = useCallback(
    (index: number) => {
      virtualizer.scrollToIndex(index, { align: "center" });
    },
    [virtualizer]
  );

  return {
    virtualization: tableWindow({
      enabled,
      active,
      rows: materializedRows,
      count: rows.length,
      virtualizer,
      virtualItems,
      estimateSize,
      expandable,
      measureRowPair,
    }),
    scrollToIndex,
  };
}

/** The window a table renders, from the virtualizer's current slice. */
function tableWindow<TRow>({
  enabled,
  active,
  rows: materializedRows,
  count,
  virtualizer,
  virtualItems,
  estimateSize,
  expandable,
  measureRowPair,
}: {
  enabled: boolean;
  active: boolean;
  rows: readonly VirtualTableRow<TRow>[];
  count: number;
  virtualizer: ModeVirtualizer;
  virtualItems: readonly VirtualItem[];
  estimateSize: number | ((index: number) => number);
  expandable: boolean;
  measureRowPair: TableVirtualization<TRow>["measureRowPair"];
}): TableVirtualization<TRow> {
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
        count,
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
 * Virtualize an opaque keyed list (e.g. grouped flat entries). Same window /
 * element modes as `useTableVirtualization`.
 *
 * @public
 */
export function useKeyedVirtualization(
  options: KeyedVirtualizationOptions
): KeyedVirtualization {
  return useKeyedVirtualizer(options).virtualization;
}

/** What {@link useKeyedVirtualization} takes. */
interface KeyedVirtualizationOptions {
  keys: readonly string[];
  enabled?: boolean;
  estimateSize?: number | ((index: number) => number);
  overscan?: number;
  scrollMargin?: number;
  getScrollElement?: () => Element | null;
  onEndReached?: () => void;
}

/**
 * {@link useKeyedVirtualization}, plus the virtualizer's own scroll.
 */
export function useKeyedVirtualizer(options: KeyedVirtualizationOptions): {
  virtualization: KeyedVirtualization;
  scrollToIndex: (index: number) => void;
} {
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

  const scrollToIndex = useCallback(
    (index: number) => {
      virtualizer.scrollToIndex(index, { align: "center" });
    },
    [virtualizer]
  );

  return {
    virtualization: keyedWindow({
      enabled,
      active,
      indices,
      count: keys.length,
      virtualizer,
      virtualItems,
      estimateSize,
    }),
    scrollToIndex,
  };
}

/** The window a keyed list renders, from the virtualizer's current slice. */
function keyedWindow({
  enabled,
  active,
  indices,
  count,
  virtualizer,
  virtualItems,
  estimateSize,
}: {
  enabled: boolean;
  active: boolean;
  indices: readonly number[];
  count: number;
  virtualizer: ModeVirtualizer;
  virtualItems: readonly VirtualItem[];
  estimateSize: number | ((index: number) => number);
}): KeyedVirtualization {
  if (!enabled) {
    return { enabled: false, indices, paddingTop: 0, paddingBottom: 0 };
  }

  if (!active) {
    return {
      enabled: true,
      indices,
      paddingTop: 0,
      paddingBottom: pendingListSize(
        count,
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
