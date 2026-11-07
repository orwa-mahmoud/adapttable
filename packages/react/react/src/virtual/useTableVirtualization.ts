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
  type VirtualTableRow,
} from "@adapttable/core";
import {
  asSizeEstimator,
  EndReachedLatch,
  keyedWindow,
  materializeWindowRows,
  rowWindow,
  virtualItemMeta,
} from "@adapttable/core/binding";
import { useVirtualizer, useWindowVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  input: UseTableVirtualizationOptions<TRow>
): TableVirtualization<TRow> {
  return useTableVirtualizer(input).virtualization;
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
  // Row refs measure during React commits; let React batch those updates.
  const windowVirtualizer = useWindowVirtualizer({
    useFlushSync: false,
    count: rows.length,
    enabled: enabled && !elementMode,
    estimateSize: asSizeEstimator(estimateSize),
    getItemKey,
    overscan,
    scrollMargin,
  });
  const elementVirtualizer = useVirtualizer({
    useFlushSync: false,
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
  const items = useMemo(() => virtualItems.map(virtualItemMeta), [virtualItems]);
  const materializedRows = useMemo<readonly VirtualTableRow<TRow>[]>(
    () => materializeWindowRows(rows, rowKey, enabled, active ? items : []),
    [active, enabled, items, rowKey, rows]
  );

  // `virtualItems` is a fresh array every render, so a naive effect would call
  // `onEndReached` on every render while the last row stays in view. Notify at
  // most once per row count: re-arm only when more rows actually load (the
  // count grows) or the user scrolls back off the end.
  const [endLatch] = useState(() => new EndReachedLatch());
  useEffect(() => {
    if (endLatch.check(active, rows.length, virtualItems.at(-1)?.index)) {
      onEndReached?.();
    }
  }, [active, endLatch, onEndReached, rows.length, virtualItems]);

  const scrollToIndex = useCallback(
    (index: number) => {
      virtualizer.scrollToIndex(index, {
        align: "center",
        behavior: "instant",
      });
    },
    [virtualizer]
  );

  return {
    virtualization: rowWindow({
      enabled,
      rows: materializedRows,
      count: rows.length,
      virtualizer,
      items: active ? items : [],
      estimateSize,
      expandable,
      measureRowPair,
    }),
    scrollToIndex,
  };
}

/**
 * Virtualize an opaque keyed list (e.g. grouped flat entries). Same window /
 * element modes as `useTableVirtualization`.
 *
 * @public
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
  return useKeyedVirtualizer(options).virtualization;
}

/**
 * {@link useKeyedVirtualization}, plus the virtualizer's own scroll.
 */
export function useKeyedVirtualizer(
  options: Parameters<typeof useKeyedVirtualization>[0]
): {
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
  // Row refs measure during React commits; let React batch those updates.
  const windowVirtualizer = useWindowVirtualizer({
    useFlushSync: false,
    count: keys.length,
    enabled: enabled && !elementMode,
    estimateSize: sizeOf,
    getItemKey,
    overscan,
    scrollMargin,
  });
  const elementVirtualizer = useVirtualizer({
    useFlushSync: false,
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

  const [endLatch] = useState(() => new EndReachedLatch());
  useEffect(() => {
    if (endLatch.check(active, keys.length, virtualItems.at(-1)?.index)) {
      onEndReached?.();
    }
  }, [active, endLatch, onEndReached, keys.length, virtualItems]);

  const scrollToIndex = useCallback(
    (index: number) => {
      virtualizer.scrollToIndex(index, {
        align: "center",
        behavior: "instant",
      });
    },
    [virtualizer]
  );

  return {
    virtualization: keyedWindow({
      enabled,
      count: keys.length,
      virtualizer,
      items: active ? virtualItems.map(virtualItemMeta) : [],
      estimateSize,
    }),
    scrollToIndex,
  };
}
