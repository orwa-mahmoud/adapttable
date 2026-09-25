/**
 * Shared chrome-body types and helpers — no `@tanstack/react-virtual`.
 *
 * The plain path and the virtualize feature both assemble {@link ChromeBodyData}
 * from these. Only {@link ./useVirtualChromeBodyData} may reach TanStack.
 */
import {
  DEFAULT_CARD_SIZE_PX,
  DEFAULT_ROW_SIZE_PX,
  estimateFromRowHeight,
  type GroupedFlatEntry,
  partitionPinnedRows,
  type TableVirtualization,
  type TreeEntry,
} from "@adapttable/core";
import { type RefCallback, type RefObject, useCallback, useMemo } from "react";

export {
  entryKeys,
  measureRowDetailAsPair,
  sourceWindowStart,
} from "@adapttable/core/binding";

import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import type { ComposedTableProps } from "../props";
import type { TableChrome } from "../useTableChrome";
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
  const nested = props.getChildren?.(row);
  if (nested !== undefined) return nested.length > 0;
  const { getParentId, rowKey } = props;
  if (!getParentId) return false;
  const id = rowKey(row);
  return rows.some((candidate) => getParentId(candidate) === id);
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
  const expanded = chrome.grouping !== undefined || chrome.tree !== undefined;
  return (
    (!chrome.isPaged || expanded) &&
    !chrome.source.error &&
    (chrome.body === "desktop" || chrome.body === "mobile")
  );
}

/** A card's height on a phone, a row's on a desktop — or `rowHeight`. */
export function estimateBodyItemSize<TRow>(
  chrome: TableChrome<TRow>,
  props: ComposedTableProps<TRow>,
  scrollRows: readonly TRow[]
): (index: number) => number {
  const fallback = chrome.isMobile
    ? (props.estimateCardSize ?? DEFAULT_CARD_SIZE_PX)
    : (props.estimateRowSize ?? DEFAULT_ROW_SIZE_PX);
  return estimateFromRowHeight(props.rowHeight, fallback, (index) => {
    if (chrome.grouping) {
      const entry = chrome.grouping.entries[index];
      if (entry?.kind === "row") return { row: entry.row, index: entry.index };
      return undefined;
    }
    if (chrome.tree) {
      const entry = chrome.tree.entries[index];
      if (entry) return { row: entry.row, index };
      return undefined;
    }
    const row = scrollRows[index];
    return row === undefined ? undefined : { row, index };
  });
}

/** How many items the infinite-scroll sentinel counts as already rendered. */
export function bodySentinelCount<TRow>(
  chrome: TableChrome<TRow>,
  groupingArmed: boolean
): number {
  if (groupingArmed) return chrome.grouping?.entries.length ?? 0;
  return chrome.source.rows.length;
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
  return useMemo(() => {
    if (!pinState) {
      return { top: [] as TRow[], scroll: sourceRows, bottom: [] as TRow[] };
    }
    return partitionPinnedRows(sourceRows, pinState, rowKey);
  }, [pinState, rowKey, sourceRows]);
}

/** Fetch the next infinite page if the source still has one. */
export function useFetchNextPage<TRow>(chrome: TableChrome<TRow>): () => void {
  const { source } = chrome;
  return useCallback(() => {
    if (source.hasNextPage && !source.isFetchingNextPage) {
      source.fetchNextPage();
    }
  }, [source]);
}

/** Infinite-scroll sentinel used by both the plain and virtual body paths. */
export function useBodyLoadMore<TRow>(
  chrome: TableChrome<TRow>,
  fetchNext: () => void,
  canLoadMore: boolean
): RefObject<HTMLDivElement | null> {
  const groupingArmed = Boolean(chrome.grouping);
  const { source } = chrome;
  return useInfiniteScroll<HTMLDivElement>({
    hasNextPage: Boolean(source.hasNextPage),
    isFetchingNextPage: Boolean(source.isFetchingNextPage),
    fetchNextPage: fetchNext,
    itemCount: bodySentinelCount(chrome, groupingArmed),
    enabled: canLoadMore,
  });
}
