/**
 * Chrome-body path with no `@tanstack/react-virtual`.
 *
 * The base table graph is allowed to reach this file. Virtualization lives in
 * {@link ./useVirtualChromeBodyData} and is mounted only by the virtualize
 * feature's in-tree body.
 */
import { useCallback, useRef, type RefCallback } from "react";

import type { BaseDataTableProps } from "../props";
import type { TableChrome } from "../useTableChrome";
import {
  type ChromeBodyData,
  useBodyLoadMore,
  useFetchNextPage,
  usePinnedScrollRows,
} from "./chromeBodyShared";

/**
 * Infinite-scroll sentinel, pinned-row partition, and a disabled
 * virtualization result — every row, no spacers, no measurement.
 *
 * @public
 */
export function usePlainChromeBodyData<TRow>(
  chrome: TableChrome<TRow>,
  props: BaseDataTableProps<TRow>
): ChromeBodyData<TRow> {
  const { rowKey } = props;
  const { source } = chrome;
  const fetchNext = useFetchNextPage(chrome);
  const scrollBoxRef = useRef<HTMLElement | null>(null);
  const virtualScrollRef = useCallback<RefCallback<HTMLElement>>((node) => {
    scrollBoxRef.current = node;
  }, []);
  const partitioned = usePinnedScrollRows(chrome, rowKey);
  const canLoadMore = !chrome.isPaged && !source.error;
  const loadMoreRef = useBodyLoadMore(chrome, fetchNext, canLoadMore);

  return {
    virtualization: {
      enabled: false,
      rows: [],
      paddingTop: 0,
      paddingBottom: 0,
    },
    groupingEntries: chrome.grouping?.entries,
    treeEntries: chrome.tree?.entries,
    loadMoreRef,
    canLoadMore,
    virtualScrollRef,
    pinnedTopRows: partitioned.top,
    pinnedBottomRows: partitioned.bottom,
  };
}
