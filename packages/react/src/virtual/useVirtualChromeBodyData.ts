/**
 * TanStack-backed chrome-body path.
 *
 * Import only from the virtualize feature. The base table graph must not
 * reach this file.
 */
import {
  devWarn,
  type GridCell,
  type KeyedVirtualization,
  type TableVirtualization,
  windowGroupedEntries,
} from "@adapttable/core";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { useFindState } from "../find/findState";
import type { ComposedTableProps } from "../props";
import type { TableChrome } from "../useTableChrome";
import {
  type ChromeBodyData,
  entryKeys,
  estimateBodyItemSize,
  isBodyEligible,
  measureRowDetailAsPair,
  sourceWindowStart,
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
  const { rowKey, virtualize = false } = props;
  const { source } = chrome;
  const expandedBody =
    chrome.grouping !== undefined || chrome.tree !== undefined;
  if (virtualize && source.paginationMode === "paged" && !expandedBody) {
    devWarn(
      'virtualize only applies in infinite mode — this paged table renders unvirtualized. Pass paginationMode="infinite" to enable it, or group the rows: an expanded page is windowed.'
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

  const groupWindow = useKeyedVirtualizer({
    keys: groupKeys,
    enabled: virtualize && groupingArmed && bodyEligible,
    ...scrollOpts,
  });
  const treeWindow = useKeyedVirtualizer({
    keys: treeKeys,
    enabled: virtualize && treeArmed && !groupingArmed && bodyEligible,
    ...scrollOpts,
  });
  const groupVirtualization = groupWindow.virtualization;
  const treeVirtualization = treeWindow.virtualization;

  const flatWindow = useTableVirtualizer({
    rows: partitioned.scroll,
    rowKey,
    enabled: virtualize && !groupingArmed && !treeArmed && bodyEligible,
    expandable: measureRowDetailAsPair(chrome.isMobile, props.renderRowDetail),
    ...scrollOpts,
  });
  const virtualization = flatWindow.virtualization;

  const keyedWindow = groupingArmed ? groupWindow : treeWindow;
  useScrollToFindMatch({
    current: useFindState()?.current ?? null,
    matchRow: (cell) => source.rows[cell.row - sourceWindowStart(source)],
    rowKey,
    flat: { ...flatWindow, rows: partitioned.scroll },
    keyed: { ...keyedWindow, keys: groupingArmed ? groupKeys : treeKeys },
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
    pinnedSummaryTop: chrome.pinnedRows?.top ?? [],
    pinnedSummaryBottom: chrome.pinnedRows?.bottom ?? [],
    columnWindow,
  };
}

/**
 * Bring find's current match into the window when it is not rendered. The
 * mark, the scroll into view and the grid's focus all need an element, and a
 * row outside the window has none until the virtualizer scrolls to it.
 *
 * Runs when the walk moves, never on a scroll, so it cannot fight the reader.
 */
function useScrollToFindMatch<TRow>(options: {
  current: GridCell | null;
  matchRow: (cell: GridCell) => TRow | undefined;
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
}): void {
  const latest = useRef(options);
  latest.current = options;
  const { current } = options;
  useEffect(() => {
    if (!current) return;
    const { matchRow, rowKey, flat, keyed } = latest.current;
    const row = matchRow(current);
    if (row === undefined) return;
    const id = rowKey(row);
    if (flat.virtualization.enabled) {
      if (flat.virtualization.rows.some((entry) => entry.key === id)) return;
      const index = flat.rows.findIndex(
        (candidate) => rowKey(candidate) === id
      );
      if (index >= 0) flat.scrollToIndex(index);
      return;
    }
    if (!keyed.virtualization.enabled) return;
    const index = keyed.keys.indexOf(id);
    if (index >= 0 && !keyed.virtualization.indices.includes(index)) {
      keyed.scrollToIndex(index);
    }
  }, [current]);
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
