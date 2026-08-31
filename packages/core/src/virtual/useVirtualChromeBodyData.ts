/**
 * TanStack-backed chrome-body path.
 *
 * Import only from the virtualize feature. The base table graph must not
 * reach this file.
 */
import { useCallback, useMemo, useRef } from "react";

import type { BaseDataTableProps } from "../props";
import type { TableChrome } from "../useTableChrome";
import { devWarn } from "../utils/devWarn";
import {
  type ChromeBodyData,
  entryKeys,
  estimateBodyItemSize,
  isBodyEligible,
  measureRowDetailAsPair,
  useBodyLoadMore,
  useFetchNextPage,
  usePinnedScrollRows,
} from "./chromeBodyShared";
import {
  useKeyedVirtualization,
  useTableVirtualization,
} from "./useTableVirtualization";
import { useColumnWindow } from "./useColumnWindow";
import {
  type TableVirtualization,
  windowGroupedEntries,
} from "./virtualTableModel";
import { useMeasuredWindowScrollMargin } from "./windowScrollMargin";

/**
 * Window virtualization (eligible only for real rows in infinite mode) and
 * the infinite-scroll sentinel. Same behaviour as the former
 * `useChromeBodyData` when `virtualize` is on.
 *
 * @public
 */
export function useVirtualChromeBodyData<TRow>(
  chrome: TableChrome<TRow>,
  props: BaseDataTableProps<TRow>
): ChromeBodyData<TRow> {
  const { rowKey, virtualize = false } = props;
  const { source } = chrome;
  if (virtualize && source.paginationMode === "paged") {
    devWarn(
      'virtualize only applies in infinite mode — this paged table renders unvirtualized. Pass paginationMode="infinite" to enable it.'
    );
  }
  const fetchNext = useFetchNextPage(chrome);
  const scrollBoxRef = useRef<HTMLElement | null>(null);
  const inScrollBox = props.maxHeight != null;
  const measureWindowOffset =
    virtualize && !inScrollBox && props.virtualScrollMargin == null;
  const { scrollMargin: measuredScrollMargin, observe: observeWindowList } =
    useMeasuredWindowScrollMargin(measureWindowOffset, chrome.rootRef);
  const virtualScrollRef = useCallback(
    (node: HTMLElement | null) => {
      scrollBoxRef.current = node;
      observeWindowList(node);
    },
    [observeWindowList]
  );
  const bodyEligible = isBodyEligible(chrome);
  const groupingArmed = Boolean(chrome.grouping);
  const groupKeys = entryKeys(chrome.grouping?.entries);
  const treeArmed = Boolean(chrome.tree);
  const treeKeys = entryKeys(chrome.tree?.entries);
  const pinState = chrome.rowPinning?.state;
  const partitioned = usePinnedScrollRows(chrome, rowKey);
  const estimateSize = estimateBodyItemSize(chrome, props, partitioned.scroll);
  const scrollOpts = {
    overscan: props.virtualOverscan,
    scrollMargin: props.virtualScrollMargin ?? measuredScrollMargin,
    getScrollElement: inScrollBox ? () => scrollBoxRef.current : undefined,
    onEndReached: fetchNext,
    estimateSize,
  } as const;

  const groupVirtualization = useKeyedVirtualization({
    keys: groupKeys,
    enabled: virtualize && groupingArmed && bodyEligible,
    ...scrollOpts,
  });
  const treeVirtualization = useKeyedVirtualization({
    keys: treeKeys,
    enabled: virtualize && treeArmed && !groupingArmed && bodyEligible,
    ...scrollOpts,
  });

  const virtualization = useTableVirtualization({
    rows: partitioned.scroll,
    rowKey,
    enabled: virtualize && !groupingArmed && !treeArmed && bodyEligible,
    expandable: measureRowDetailAsPair(chrome.isMobile, props.renderRowDetail),
    ...scrollOpts,
  });

  const groupingEntries = chrome.grouping
    ? windowGroupedEntries(chrome.grouping.entries, groupVirtualization.indices)
    : undefined;
  const treeEntries = chrome.tree
    ? windowGroupedEntries(chrome.tree.entries, treeVirtualization.indices)
    : undefined;

  const resolvedVirtualization = resolveBodyVirtualization(
    groupingArmed ? groupVirtualization : treeVirtualization,
    virtualization
  );

  const boxVirtual = resolvedVirtualization.enabled && inScrollBox;
  const canLoadMore = !chrome.isPaged && !source.error && !boxVirtual;
  const loadMoreRef = useBodyLoadMore(chrome, fetchNext, canLoadMore);
  const sourceIndexById = useMemo(() => {
    const map = new Map<string, number>();
    source.rows.forEach((row, index) => map.set(rowKey(row), index));
    return map;
  }, [rowKey, source.rows]);

  const columnWindow = useColumnWindow<TRow>({
    columns: chrome.columnLayout.visibleColumns,
    enabled: props.virtualizeColumns === true,
    widths: chrome.columnLayout.state.widths,
    pinnedKeys: new Set(
      Object.keys(chrome.columnLayout.state.pinned).filter(
        (key) => chrome.columnLayout.state.pinned[key] !== undefined
      )
    ),
    getScrollElement: () => scrollBoxRef.current,
  });

  const pinnedVirtualization = useMemo(() => {
    if (!pinState) return resolvedVirtualization;
    return {
      ...resolvedVirtualization,
      rows: resolvedVirtualization.rows.map((entry) => ({
        ...entry,
        sourceIndex: sourceIndexById.get(entry.key) ?? entry.index,
      })),
    };
  }, [pinState, resolvedVirtualization, sourceIndexById]);

  return {
    virtualization: pinnedVirtualization,
    groupingEntries,
    treeEntries,
    loadMoreRef,
    canLoadMore,
    virtualScrollRef,
    pinnedTopRows: partitioned.top,
    pinnedBottomRows: partitioned.bottom,
    columnWindow,
  };
}

function resolveBodyVirtualization<TRow>(
  keyed: ReturnType<typeof useKeyedVirtualization>,
  virtualization: TableVirtualization<TRow>
): TableVirtualization<TRow> {
  if (!keyed.enabled) return virtualization;
  return {
    enabled: true,
    rows: [],
    paddingTop: keyed.paddingTop,
    paddingBottom: keyed.paddingBottom,
    measureElement: keyed.measureElement,
  };
}

/** @deprecated Import {@link useVirtualChromeBodyData}. Kept for existing tests. */
export const useChromeBodyData = useVirtualChromeBodyData;
