/**
 * Shared chrome-body types and helpers — no `@tanstack/react-virtual`.
 *
 * The plain path and the virtualize feature both assemble {@link ChromeBodyData}
 * from these. Only {@link ./useVirtualChromeBodyData} may reach TanStack.
 */
import { type RefCallback, type RefObject, useCallback, useMemo } from "react";

import { DEFAULT_CARD_SIZE_PX, DEFAULT_ROW_SIZE_PX } from "../constants";
import type { GroupedFlatEntry } from "../grouping/groupRows";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import type { BaseDataTableProps } from "../props";
import type { RowPinState } from "../rows/rowPinning";
import type { RowHeight } from "../rows/rowStyle";
import type { TreeEntry } from "../tree/treeRows";
import type { TableChrome } from "../useTableChrome";
import type { ColumnWindow } from "./useColumnWindow";
import type { TableVirtualization } from "./virtualTableModel";

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
  props: BaseDataTableProps<TRow>
): boolean {
  const nested = props.getChildren?.(row);
  if (nested !== undefined) return nested.length > 0;
  const { getParentId, rowKey } = props;
  if (!getParentId) return false;
  const id = rowKey(row);
  return rows.some((candidate) => getParentId(candidate) === id);
}

/** The keys of a walked model's entries — one shape for groups and trees. */
export function entryKeys(entries?: readonly { key: string }[]): string[] {
  return entries?.map((entry) => entry.key) ?? [];
}

/** Whether the body is a real row/card list the window can apply to. */
export function isBodyEligible<TRow>(chrome: TableChrome<TRow>): boolean {
  return (
    !chrome.isPaged &&
    !chrome.source.error &&
    (chrome.body === "desktop" || chrome.body === "mobile")
  );
}

/**
 * Desktop detail is a sibling of the row, so the window measures the pair.
 * A mobile card nests the detail inside the card — one element, not a pair.
 */
export function measureRowDetailAsPair(
  isMobile: boolean,
  renderRowDetail: unknown
): boolean {
  return !isMobile && renderRowDetail !== undefined;
}

function estimateFromRowHeight<TRow>(
  rowHeight: RowHeight<TRow> | undefined,
  fallback: number,
  rowAt: (index: number) => { row: TRow; index: number } | undefined
): (index: number) => number {
  if (rowHeight === undefined) return () => fallback;
  if (typeof rowHeight === "number") return () => rowHeight;
  return (index: number) => {
    const found = rowAt(index);
    if (!found) return fallback;
    return rowHeight(found.row, found.index);
  };
}

function partitionPinnedRows<TRow>(
  rows: readonly TRow[],
  state: RowPinState,
  getRowId: (row: TRow) => string
): { top: TRow[]; scroll: TRow[]; bottom: TRow[] } {
  const topSet = new Set(state.top);
  const bottomSet = new Set(state.bottom);
  const byId = new Map<string, TRow>();
  for (const row of rows) byId.set(getRowId(row), row);
  const top: TRow[] = [];
  for (const id of state.top) {
    const row = byId.get(id);
    if (row !== undefined) top.push(row);
  }
  const bottom: TRow[] = [];
  for (const id of state.bottom) {
    const row = byId.get(id);
    if (row !== undefined) bottom.push(row);
  }
  const scroll: TRow[] = [];
  for (const row of rows) {
    const id = getRowId(row);
    if (!topSet.has(id) && !bottomSet.has(id)) scroll.push(row);
  }
  return { top, scroll, bottom };
}

/** A card's height on a phone, a row's on a desktop — or `rowHeight`. */
export function estimateBodyItemSize<TRow>(
  chrome: TableChrome<TRow>,
  props: BaseDataTableProps<TRow>,
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
