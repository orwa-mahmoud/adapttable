/**
 * Shared chrome-body types and helpers — no `@tanstack/react-virtual`.
 *
 * The plain path and the virtualize feature both assemble {@link ChromeBodyData}
 * from these. Only {@link ./useVirtualChromeBodyData} may reach TanStack.
 */
import {
  type GroupedFlatEntry,
  type TableVirtualization,
  type TreeEntry,
} from "@adapttable/core";
import {
  bodySentinelCount as coreBodySentinelCount,
  estimateBodyItemSize as coreEstimateBodyItemSize,
  fetchNextBodyPage,
  hasLoadedChildren as coreHasLoadedChildren,
  isBodyEligible as coreIsBodyEligible,
  pinnedScrollRows,
} from "@adapttable/core/binding";
import { type RefCallback, type RefObject, useCallback, useMemo } from "react";

export {
  entryKeys,
  measureRowDetailAsPair,
  sourceWindowStart,
} from "@adapttable/core/binding";

import type { TableChrome } from "../chrome/tableChromeContract";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import type { ComposedTableProps } from "../props";
import type { ColumnWindow } from "./useColumnWindow";

/**
 * Result of the chrome-body path — plain or virtualized.
 *
 * @public
 */
export interface ChromeBodyData<TRow> {
  /** Row/card window virtualization state (disabled unless eligible). */
  virtualization: TableVirtualization<TRow>;
  /**
   * When grouping is armed, the (possibly virtual-windowed) flat entries
   * adapters should render. `undefined` when grouping is dormant.
   */
  groupingEntries?: readonly GroupedFlatEntry<TRow>[];
  /**
   * When a tree is armed, the (possibly virtual-windowed) entries adapters
   * should render. `undefined` when the table is flat.
   */
  treeEntries?: readonly TreeEntry<TRow>[];
  /** Sentinel ref that auto-loads the next page in infinite mode. */
  loadMoreRef: RefObject<HTMLDivElement | null>;
  /** Whether the load-more affordance applies (infinite mode, no error). */
  canLoadMore: boolean;
  /**
   * Attach to the `maxHeight` scroll box (when one renders) so the virtual
   * window tracks the box's scrolling instead of the page's. Harmless to
   * attach when virtualization is off.
   */
  virtualScrollRef: RefCallback<HTMLElement>;
  /** Top-pinned rows, removed from the virtual window. */
  pinnedTopRows: readonly TRow[];
  /** Bottom-pinned rows, removed from the virtual window. */
  pinnedBottomRows: readonly TRow[];
  /** Host-owned summary rows stuck above the scroll window. */
  pinnedSummaryTop: readonly TRow[];
  /** Host-owned summary rows stuck below the scroll window. */
  pinnedSummaryBottom: readonly TRow[];
  /**
   * Horizontal column window. The lean path never windows sideways; the
   * virtualize feature fills this when `virtualizeColumns` is on.
   */
  columnWindow?: ColumnWindow<TRow>;
}

/** Whether a row's children are already in the data. */
export function hasLoadedChildren<TRow>(
  row: TRow,
  rows: readonly TRow[],
  props: ComposedTableProps<TRow>
): boolean {
  return coreHasLoadedChildren(row, rows, props);
}

/**
 * Whether the body is a real row/card list the window can apply to.
 *
 * A paged body normally needs no window: the page size already bounds what is
 * rendered. Grouping and trees break that bound — a page of thirty rows walks
 * out as a hundred and forty entries once every bucket gains a header and a
 * footer — so a page that has been expanded is eligible like any other long
 * list.
 */
export function isBodyEligible<TRow>(chrome: TableChrome<TRow>): boolean {
  return coreIsBodyEligible(chrome);
}

/** A card's height on a phone, a row's on a desktop — or `rowHeight`. */
export function estimateBodyItemSize<TRow>(
  chrome: TableChrome<TRow>,
  props: ComposedTableProps<TRow>,
  scrollRows: readonly TRow[]
): (index: number) => number {
  return coreEstimateBodyItemSize(chrome, props, scrollRows);
}

/** How many items the infinite-scroll sentinel counts as already rendered. */
export function bodySentinelCount<TRow>(chrome: TableChrome<TRow>): number {
  return coreBodySentinelCount(chrome);
}

/** Partition pinned rows and the remaining scroll list. */
export function usePinnedScrollRows<TRow>(
  chrome: TableChrome<TRow>,
  rowKey: (row: TRow) => string
): {
  top: readonly TRow[];
  scroll: readonly TRow[];
  bottom: readonly TRow[];
} {
  const pinState = chrome.rowPinning?.state;
  const sourceRows = chrome.source.rows;
  return useMemo(
    () => pinnedScrollRows(sourceRows, pinState, rowKey),
    [pinState, rowKey, sourceRows]
  );
}

/** Fetch the next infinite page if the source still has one. */
export function useFetchNextPage<TRow>(chrome: TableChrome<TRow>): () => void {
  const { source } = chrome;
  return useCallback(() => fetchNextBodyPage(source), [source]);
}

/** Infinite-scroll sentinel used by both the plain and virtual body paths. */
export function useBodyLoadMore<TRow>(
  chrome: TableChrome<TRow>,
  fetchNext: () => void,
  canLoadMore: boolean
): RefObject<HTMLDivElement | null> {
  const { source } = chrome;
  return useInfiniteScroll<HTMLDivElement>({
    hasNextPage: Boolean(source.hasNextPage),
    isFetchingNextPage: Boolean(source.isFetchingNextPage),
    fetchNextPage: fetchNext,
    itemCount: bodySentinelCount(chrome),
    enabled: canLoadMore,
  });
}
