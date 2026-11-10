/**
 * Chrome-body path with no `@tanstack/react-virtual`.
 *
 * The base table graph is allowed to reach this file. Virtualization lives in
 * {@link ./useVirtualChromeBodyData} and is mounted only by the virtualize
 * feature's in-tree body.
 */
import { bodyCanLoadMore } from "@adapttable/core/binding";
import { type RefCallback, useCallback, useRef } from "react";

import type { TableChrome } from "../chrome/tableChromeContract";
import type { BaseDataTableProps } from "../props";
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
  const fetchNext = useFetchNextPage(chrome);
  const scrollBoxRef = useRef<HTMLElement | null>(null);
  const virtualScrollRef = useCallback<RefCallback<HTMLElement>>((node) => {
    scrollBoxRef.current = node;
  }, []);
  const partitioned = usePinnedScrollRows(chrome, rowKey);
  const canLoadMore = bodyCanLoadMore(chrome);
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
    pinnedSummaryTop: chrome.pinnedRows?.top ?? [],
    pinnedSummaryBottom: chrome.pinnedRows?.bottom ?? [],
  };
}
