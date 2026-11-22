/**
 * TanStack-backed chrome-body path.
 *
 * Import only from the virtualize feature. The base table graph must not
 * reach this file.
 */
import {
  devWarn,
  type KeyedVirtualization,
  type TableVirtualization,
  windowGroupedEntries,
} from "@adapttable/core";
import {
  bodyCanLoadMore,
  resolveBodyVirtualization,
  rowScrollTarget,
  virtualizeIgnoredOnPage,
  withSourceIndices,
} from "@adapttable/core/binding";
import { useCallback, useMemo, useRef } from "react";

import type { TableChrome } from "../chrome/tableChromeContract";
import { useFeatureState } from "../features/featureState";
import { ROW_PINNING_STATE } from "../features/stateKeys";
import type { ComposedTableProps } from "../props";
import {
  type BodyChrome,
  type ChromeBodyData,
  entryKeys,
  estimateBodyItemSize,
  isBodyEligible,
  measureRowDetailAsPair,
  useBodyChrome,
  useBodyLoadMore,
  useFetchNextPage,
  usePinnedScrollRows,
} from "./chromeBodyShared";
import { useColumnWindow } from "./useColumnWindow";
import {
  useKeyedVirtualizer,
  useTableVirtualizer,
} from "./useTableVirtualization";
import { useMeasuredWindowScrollMargin } from "./windowScrollMargin";

/**
 * Window virtualization (eligible only for real rows in infinite mode) and
 * the infinite-scroll sentinel. This is the body-data implementation composed
 * by the `virtualize` feature.
 *
 * @public
 */
export function useVirtualChromeBodyData<TRow>(
  chrome: TableChrome<TRow>,
  props: ComposedTableProps<TRow>
): ChromeBodyData<TRow> {
  return useVirtualChromeBody(chrome, props).body;
}

/**
 * {@link useVirtualChromeBodyData}, plus a function that brings one row into
 * the window — what find calls when its walk moves past it.
 */
export function useVirtualChromeBody<TRow>(
  chrome: TableChrome<TRow>,
  props: ComposedTableProps<TRow>
): { body: ChromeBodyData<TRow>; scrollToRow: (row: TRow) => void } {
  const { rowKey, virtualize = false } = props;
  const { source } = chrome;
  const bodyChrome = useBodyChrome(chrome);
  if (virtualizeIgnoredOnPage(virtualize, bodyChrome)) {
    devWarn(
      'virtualize only applies in infinite mode — this paged table renders unvirtualized. Pass paginationMode="infinite" to enable it, or group the rows: an expanded page is windowed.'
    );
  }
  const fetchNext = useFetchNextPage(bodyChrome);
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
  const groupingArmed = Boolean(bodyChrome.grouping);
  const pinState = useFeatureState(ROW_PINNING_STATE)?.state;
  const partitioned = usePinnedScrollRows(bodyChrome, rowKey);
  const estimateSize = estimateBodyItemSize(
    bodyChrome,
    props,
    partitioned.scroll
  );
  const scrollOpts = {
    overscan: props.virtualOverscan,
    scrollMargin: props.virtualScrollMargin ?? measuredScrollMargin,
    getScrollElement: inScrollBox ? () => scrollBoxRef.current : undefined,
    onEndReached: fetchNext,
    estimateSize,
  } as const;

  const {
    groupVirtualization,
    treeVirtualization,
    virtualization,
    scrollToRow,
  } = useBodyWindows(bodyChrome, props, partitioned.scroll, scrollOpts);

  const groupingEntries = bodyChrome.grouping
    ? windowGroupedEntries(
        bodyChrome.grouping.entries,
        groupVirtualization.indices
      )
    : undefined;
  const treeEntries = bodyChrome.tree
    ? windowGroupedEntries(bodyChrome.tree.entries, treeVirtualization.indices)
    : undefined;

  const resolvedVirtualization = resolveBodyVirtualization(
    groupingArmed ? groupVirtualization : treeVirtualization,
    virtualization
  );

  const boxVirtual = resolvedVirtualization.enabled && inScrollBox;
  const canLoadMore = bodyCanLoadMore(bodyChrome, boxVirtual);
  const loadMoreRef = useBodyLoadMore(bodyChrome, fetchNext, canLoadMore);

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

  const pinnedVirtualization = useMemo(
    () =>
      pinState
        ? withSourceIndices(resolvedVirtualization, source.rows, rowKey)
        : resolvedVirtualization,
    [pinState, resolvedVirtualization, rowKey, source.rows]
  );

  const body: ChromeBodyData<TRow> = {
    virtualization: pinnedVirtualization,
    groupingEntries,
    treeEntries,
    loadMoreRef,
    canLoadMore,
    virtualScrollRef,
    pinnedTopRows: partitioned.top,
    pinnedBottomRows: partitioned.bottom,
    pinnedSummaryTop: chrome.pinnedRows?.top ?? [],
    pinnedSummaryBottom: chrome.pinnedRows?.bottom ?? [],
    columnWindow,
  };
  return { body, scrollToRow };
}

/**
 * The three windows a body can use — grouped entries, tree entries or flat
 * rows, at most one of them armed — and the row scroll over whichever it is.
 */
function useBodyWindows<TRow>(
  chrome: BodyChrome<TRow>,
  props: ComposedTableProps<TRow>,
  scrollRows: readonly TRow[],
  scrollOpts: Omit<Parameters<typeof useKeyedVirtualizer>[0], "keys">
): {
  groupVirtualization: KeyedVirtualization;
  treeVirtualization: KeyedVirtualization;
  virtualization: TableVirtualization<TRow>;
  scrollToRow: (row: TRow) => void;
} {
  const { rowKey, virtualize = false } = props;
  const eligible = virtualize && isBodyEligible(chrome);
  const groupingArmed = Boolean(chrome.grouping);
  const treeArmed = Boolean(chrome.tree) && !groupingArmed;
  const groupKeys = entryKeys(chrome.grouping?.entries);
  const treeKeys = entryKeys(chrome.tree?.entries);

  const groupWindow = useKeyedVirtualizer({
    keys: groupKeys,
    enabled: eligible && groupingArmed,
    ...scrollOpts,
  });
  const treeWindow = useKeyedVirtualizer({
    keys: treeKeys,
    enabled: eligible && treeArmed,
    ...scrollOpts,
  });
  const flatWindow = useTableVirtualizer({
    rows: scrollRows,
    rowKey,
    enabled: eligible && !groupingArmed && !treeArmed,
    expandable: measureRowDetailAsPair(chrome.isMobile, props.renderRowDetail),
    ...scrollOpts,
  });
  const scrollToRow = useRowScroll({
    rowKey,
    flat: { ...flatWindow, rows: scrollRows },
    keyed: groupingArmed
      ? { ...groupWindow, keys: groupKeys }
      : { ...treeWindow, keys: treeKeys },
  });
  return {
    groupVirtualization: groupWindow.virtualization,
    treeVirtualization: treeWindow.virtualization,
    virtualization: flatWindow.virtualization,
    scrollToRow,
  };
}

/**
 * Bring one row into the window when it is not rendered: the flat window by
 * the row's index, a grouped or chrome.tree window by its entry key. A row already
 * in the window is left where it is, so a call never fights the reader.
 *
 * The callback is stable and reads the current window through a ref.
 */
function useRowScroll<TRow>(options: {
  rowKey: (row: TRow) => string;
  flat: {
    virtualization: TableVirtualization<TRow>;
    scrollToIndex: (index: number) => void;
    rows: readonly TRow[];
  };
  keyed: {
    virtualization: KeyedVirtualization;
    scrollToIndex: (index: number) => void;
    keys: readonly string[];
  };
}): (row: TRow) => void {
  const latest = useRef(options);
  latest.current = options;
  return useCallback((row: TRow) => {
    const { rowKey, flat, keyed } = latest.current;
    const target = rowScrollTarget(row, rowKey, flat, keyed);
    if (!target) return;
    (target.window === "flat" ? flat : keyed).scrollToIndex(target.index);
  }, []);
}
