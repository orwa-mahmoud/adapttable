import type { ReactNode, RefCallback, RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { type ConfirmHandler, defaultConfirm } from "./actions/confirm";
import { resolveColumns } from "./columns/resolveColumns";
import {
  useColumnLayout,
  type UseColumnLayoutResult,
} from "./columns/useColumnLayout";
import { DEFAULT_CARD_SIZE_PX, DEFAULT_ROW_SIZE_PX } from "./constants";
import {
  type CellEditingState,
  useCellEditing,
} from "./editing/useCellEditing";
import {
  type ActiveFilterChip,
  mergeFilterChips,
  resolveActiveFilterCount,
} from "./filters/useActiveFilterChips";
import {
  buildGroupedFlatModel,
  type GroupAggregatesFn,
  type GroupedFlatEntry,
} from "./grouping/groupRows";
import {
  type GroupCollapseState,
  useGroupCollapse,
} from "./grouping/useGroupCollapse";
import { useEventCallback } from "./hooks/useEventCallback";
import { useInfiniteScroll } from "./hooks/useInfiniteScroll";
import { useIsMobile } from "./hooks/useIsMobile";
import { useScrollToTableTop } from "./hooks/useScrollToTableTop";
import type { BaseDataTableProps } from "./props";
import {
  type RowExpansionState,
  useRowExpansion,
} from "./rows/useRowExpansion";
import type { SelectionState } from "./selection/useSelection";
import type { TableSource } from "./source/TableSource";
import type { BulkAction, ColumnDef, SortByOption, TableLabels } from "./types";
import {
  useDataTable,
  type UseDataTableResult,
} from "./useDataTable/useDataTable";
import { devWarn } from "./utils/devWarn";
import {
  type TableVirtualization,
  useKeyedVirtualization,
  useTableVirtualization,
  windowGroupedEntries,
} from "./virtual/useTableVirtualization";

/**
 * The shared prop surface every adapter's toolbar sub-component needs.
 * Adapters render kit-specific markup from this; extracting it keeps the
 * identical shape from being re-declared (and flagged as duplication) in
 * each adapter.
 *
 * @typeParam TRow - The row type.
 */
export interface ToolbarChromeProps<TRow> {
  /** The headless table state + prop-getters. */
  table: UseDataTableResult<TRow>;
  /** Render the search input (default `true`). */
  searchable?: boolean;
  /** Alias for `searchable: false` (v1 name) — deleted before the 2.0.0 release. */
  hideSearch?: boolean;
  /** Placeholder for the search input. */
  searchPlaceholder?: string;
  /** Options for an explicit sort-by control. */
  sortByOptions?: SortByOption[];
  /** Extra caller-supplied toolbar content. */
  toolbar?: ReactNode;
  /** Alias for `toolbar` (v1 name) — deleted before the 2.0.0 release. */
  customToolbar?: ReactNode;
  /** Whether a filters affordance should render. */
  hasFilters: boolean;
  /** Number shown on the filters badge. */
  activeFilterCount: number;
  /** Whether the filter container is open (drives `aria-expanded`). */
  filtersOpen: boolean;
  /** Toggle the filter container (popover and drawer alike). */
  onToggleFilters: () => void;
  /**
   * Bind to the trigger's `onPointerDown` (see
   * {@link useFilterTriggerToggle}) so a click on the open trigger CLOSES
   * the popover instead of racing the kit's outside-close and reopening.
   */
  onFiltersTriggerPointerDown?: () => void;
  /** Whether to show the rows-per-page control (infinite mode). */
  showRowsPerPage: boolean;
  /** Built column-menu node, when `enableColumnMenu` is set. */
  columnMenu?: ReactNode;
  /**
   * When set, render the Export CSV toolbar button and call this on click.
   * Built by {@link makeExportCsvHandler} from the `exportCsv` prop.
   */
  onExportCsv?: () => void;
  /** Text direction, for adapters whose toolbar needs explicit RTL hints. */
  dir?: "ltr" | "rtl";
}

/**
 * The shared prop surface every adapter's bulk-action bar needs. Extracted
 * so the identical shape isn't re-declared (and flagged as duplication) in
 * each adapter's chrome.
 */
export interface BulkBarChromeProps {
  /** Current selection state. */
  selection: SelectionState;
  /**
   * Total rows in the filtered set — drives the "select all N matching"
   * banner when a full page is selected and more rows match elsewhere.
   */
  total: number;
  /** Caller-supplied bulk actions. */
  bulkActions: BulkAction[];
  /** Confirmation handler for actions that declare a `confirm` block. */
  confirm: ConfirmHandler;
  /** Resolved labels. */
  labels: Required<TableLabels>;
}

/**
 * Which body region a `DataTable` should render. Named `TableBodyRegion`
 * (not `TableBody`) so it never collides with MUI's `TableBody` component
 * in consumer imports.
 */
export type TableBodyRegion = "skeleton" | "empty" | "mobile" | "desktop";

/** The shared, UI-agnostic orchestration result for an adapter table. */
export interface TableChrome<TRow> {
  /**
   * The source as the VIEW sees it. Identical to the caller's source —
   * except with grouping armed, where the table renders the full filtered
   * set and this facade presents that set (full rows, one page, matching
   * total) so footer numbers, select-all scope and page-scope CSV export
   * agree with the screen. Adapters read THIS, never the raw source.
   */
  source: TableSource<TRow>;
  /** The headless table state + prop-getters. */
  table: UseDataTableResult<TRow>;
  /** Resolved mobile layout flag. */
  isMobile: boolean;
  /** Resolved confirmation handler. */
  confirm: ConfirmHandler;
  /** Row id extractor (selection id, falling back to rowKey). */
  getRowId: (row: TRow) => string;
  /** Derived chips: label-driven merged with caller `extraChips`. */
  mergedChips: readonly ActiveFilterChip[];
  /** Active filter count (override, or merged chip count). */
  activeFilterCount: number;
  /** Whether the resolved pagination mode is `"paged"`. */
  isPaged: boolean;
  /** Which body region to render. */
  body: TableBodyRegion;
  /**
   * Why the body is empty: `"noResults"` when an active search/filter
   * produced zero rows (offer a clear-filters CTA), `"noData"` when the
   * source itself is empty. Only meaningful while `body === "empty"`.
   */
  emptyVariant: "noData" | "noResults";
  /**
   * A background refresh is in flight (`isFetching` without `isLoading`):
   * rows on screen are potentially stale. Adapters show a subtle,
   * non-blocking indicator (thin progress bar / `aria-busy`).
   */
  isRefreshing: boolean;
  /**
   * Clear-filters handler: the caller's `onClearFilters`, falling back to
   * `source.clearExtras` — so chips, the drawer and the no-results CTA can
   * always offer a working "clear".
   */
  clearFilters: () => void;
  /**
   * Row-detail bundle — present iff `renderRowDetail` is set, so ONE guard
   * narrows both the renderer and the expansion state (no correlated
   * optionals to re-check).
   */
  detail?: {
    /** The caller's detail-panel renderer. */
    render: (row: TRow) => ReactNode;
    /** Expansion state for the chevrons. */
    expansion: RowExpansionState;
  };
  /**
   * Inline cell-editing bundle — present iff `onCellEdit` is set, so ONE
   * guard narrows both the host channel and the state machine. Omit
   * `onCellEdit` and editing stays fully dormant (no UI, no keyboard).
   */
  editing?: {
    /** Host change channel — the table never mutates rows. */
    onCellEdit: (row: TRow, key: string, nextValue: unknown) => void;
    /** Headless active-cell / draft / keyboard state. */
    state: CellEditingState;
  };
  /**
   * Row-grouping bundle — present iff an effective `groupBy` is set AND the
   * source can supply a full filtered set (`allFilteredRows`). Omit
   * `groupBy` and grouping stays fully dormant (package DNA: opt-in).
   */
  grouping?: {
    groupBy: string;
    collapsed: GroupCollapseState;
    aggregates?: GroupAggregatesFn<TRow>;
    /** Flat group-header + leaf entries for adapters to render. */
    entries: readonly GroupedFlatEntry<TRow>[];
    setGroupBy: (key: string | null) => void;
  };
  /**
   * The rows the editing layer must treat as present: the grouped leaf set
   * (in render order) while grouping renders the full filtered set, the
   * page slice otherwise. Adapters pass THIS — never `source.rows` — as the
   * `rows` context for editable cells, so an edit on a row outside the
   * current page slice survives and Tab-advance follows the rendered order.
   */
  editingRows: readonly TRow[];
  /** Whether the paged footer should render. */
  showFooter: boolean;
  /** User column-layout state + mutators (visibility, order, …). */
  columnLayout: UseColumnLayoutResult<TRow>;
  /** All declared columns (pre layout/device filtering) for the column menu. */
  allColumns: ColumnDef<TRow>[];
}

/**
 * Run the shared orchestration every adapter `<DataTable>` needs: resolve
 * the layout + confirm handler, build the headless table, merge filter
 * chips, compute the active-filter count, and decide which body region and
 * footer to show. Adapters then render their kit-specific markup from this.
 *
 * @typeParam TRow - The row type.
 * @param props - The adapter's {@link BaseDataTableProps}.
 * @returns The {@link TableChrome} orchestration result.
 */
export function useTableChrome<TRow>(
  props: BaseDataTableProps<TRow>
): TableChrome<TRow> {
  const {
    source,
    columns,
    rowKey,
    tableLabel,
    labels,
    dir,
    forceMobile,
    isMobile: isMobileProp,
    mobileIdentityColumns,
    onRowsChange,
    bulkActions,
    selectionGetId,
    selectedIds: selectedIdsProp,
    onSelectionChange,
    filterLabels,
    onClearFilters,
    extraChips,
    activeFilterCount: activeFilterCountProp,
    confirm: confirmProp,
    columnLayout: columnLayoutProp,
    onColumnLayoutChange,
    defaultColumnLayout,
  } = props;

  const autoMobile = useIsMobile();
  const isMobile = forceMobile ?? isMobileProp ?? autoMobile;
  const confirm = confirmProp ?? defaultConfirm;

  // Declarative defaults (auto headers, dot-path accessors) resolve once
  // here, so the layout, the column menu and the table all see them.
  const resolvedColumns = useMemo(
    () => resolveColumns(columns, props.locale),
    [columns, props.locale]
  );

  // User column layout (hide/order/…) applied on top of the declared columns,
  // before device filtering inside useDataTable. The menu uses `allColumns`.
  const columnLayout = useColumnLayout<TRow>({
    columns: resolvedColumns,
    layout: columnLayoutProp,
    onLayoutChange: onColumnLayoutChange,
    defaultColumnLayout,
  });

  // Effective groupBy: prop wins when provided (including `null` to force
  // off); otherwise the URL/source value. Empty string is treated as unset.
  //
  // With grouping armed the table is a FULL-SET view: grouped mode renders
  // every filtered row, so the source the chrome reasons about presents
  // that same set — footer numbers, select-all scope and page-scope CSV
  // export all describe exactly what is on screen instead of the page
  // slice. Mutators pass through untouched; the overlay disappears (and
  // real pagination resumes) the moment grouping is cleared.
  const requestedGroupBy =
    props.groupBy === undefined ? source.groupBy : (props.groupBy ?? undefined);
  const effectiveGroupBy =
    requestedGroupBy && requestedGroupBy.length > 0
      ? requestedGroupBy
      : undefined;
  const groupingArmed = Boolean(effectiveGroupBy && source.allFilteredRows);
  const viewSource = useMemo<TableSource<TRow>>(() => {
    if (!groupingArmed || !source.allFilteredRows) return source;
    const all = source.allFilteredRows;
    return {
      ...source,
      rows: all,
      page: 1,
      limit: Math.max(all.length, 1),
      total: all.length,
      hasNextPage: false,
      isFetchingNextPage: false,
    };
  }, [groupingArmed, source]);

  const table = useDataTable<TRow>({
    source: viewSource,
    columns: columnLayout.visibleColumns,
    rowKey,
    tableLabel,
    labels,
    dir,
    isMobile,
    mobileIdentityColumns,
    bulkActions,
    selectionGetId,
    selectedIds: selectedIdsProp,
    onSelectedIdsChange: onSelectionChange,
    filterLabels,
    multiSort: props.multiSort,
    searchDebounceMs: props.searchDebounceMs,
    locale: props.locale,
  });

  useEffect(() => {
    onRowsChange?.(table.rows);
  }, [onRowsChange, table.rows]);

  // Selection observer (uncontrolled only): the Set identity only changes
  // when the selection does, so this fires exactly once per user-visible
  // change (including automatic resets and the documented mount fire with
  // the empty selection). The handler is read through a ref-latch — the
  // documented inline-arrow usage is a fresh identity every render, and
  // keying the effect on it loops forever when the handler stores the ids
  // in state. In the CONTROLLED mode the parent already receives change
  // requests synchronously through useSelection's onChange — echoing them
  // here would double-fire (and feed loops).
  const controlledSelection = selectedIdsProp !== undefined;
  const selectedIds = table.selection?.selectedIds;
  const notifySelectionChange = useEventCallback((ids: string[]) => {
    onSelectionChange?.(ids);
  });
  useEffect(() => {
    if (!controlledSelection && selectedIds) {
      notifySelectionChange([...selectedIds]);
    }
  }, [controlledSelection, selectedIds, notifySelectionChange]);

  const mergedChips = useMemo<readonly ActiveFilterChip[]>(
    () => mergeFilterChips(table.filterChips, extraChips),
    [table.filterChips, extraChips]
  );

  const activeFilterCount = resolveActiveFilterCount(
    activeFilterCountProp,
    mergedChips.length
  );

  const isPaged = source.paginationMode === "paged";

  let body: TableBodyRegion;
  if (viewSource.isLoading && viewSource.rows.length === 0) body = "skeleton";
  else if (table.isEmpty) body = "empty";
  else if (isMobile) body = "mobile";
  else body = "desktop";

  // Zero rows under an active search/filter is "nothing MATCHED", not
  // "nothing exists" — the empty state should say so and offer a clear.
  const emptyVariant =
    activeFilterCount > 0 || source.search !== "" ? "noResults" : "noData";

  // `isFetchingNextPage` is load-more, not a refresh of what's on screen.
  const isRefreshing = Boolean(
    source.isFetching && !source.isLoading && !source.isFetchingNextPage
  );

  // `onClearFilters` is a pure NOTIFICATION: the chrome always performs
  // the clear itself, then tells the host. (It used to REPLACE the clear,
  // so a logging handler silently broke the button — take full control
  // via `source.clearExtras` instead.)
  const clearFilters = useCallback(() => {
    source.clearExtras();
    onClearFilters?.();
  }, [onClearFilters, source]);

  // Hooks run unconditionally; the state is simply unused (and unexposed)
  // when the caller renders no row details.
  const expansionState = useRowExpansion();
  const renderRowDetail = props.renderRowDetail;
  const detail = useMemo(
    () =>
      renderRowDetail
        ? { render: renderRowDetail, expansion: expansionState }
        : undefined,
    [renderRowDetail, expansionState]
  );

  // Same opt-in pattern as `detail`: the hook always runs (Rules of Hooks),
  // but `editing` is only exposed when the host passes `onCellEdit`.
  const cellEditingState = useCellEditing();
  const onCellEdit = props.onCellEdit;
  const editing = useMemo(
    () => (onCellEdit ? { onCellEdit, state: cellEditingState } : undefined),
    [onCellEdit, cellEditingState]
  );
  // Half-configured editing is a silent trap: `editable: true` on a column
  // does NOTHING without the table-level change channel. Say so in dev.
  const hasEditableColumn = resolvedColumns.some((column) => column.editable);
  useEffect(() => {
    if (!hasEditableColumn || onCellEdit) return;
    devWarn(
      "columns declare `editable` but no `onCellEdit` handler is set — cell editing stays inert. Pass `onCellEdit` on the table to enable it."
    );
  }, [hasEditableColumn, onCellEdit]);

  // If the active row leaves the rendered set, drop the draft without
  // committing — the host never receives a stale edit. The check runs
  // against `editingRows` (defined after grouping below): the grouped body
  // renders the FULL filtered leaf set, so validating against the page
  // slice would silently kill edits on every off-page row (each group's
  // rows beyond page 1 froze as display-only).

  const groupCollapse = useGroupCollapse({
    collapsedGroupIds: props.collapsedGroupIds,
    onCollapsedGroupIdsChange: props.onCollapsedGroupIdsChange,
  });

  useEffect(() => {
    if (!effectiveGroupBy) return;
    if (source.allFilteredRows) return;
    devWarn(
      "groupBy is only supported on the frontend data tier (in-memory rows with allFilteredRows). Server-paginated sources cannot regroup a full result set; grouping is ignored."
    );
  }, [effectiveGroupBy, source.allFilteredRows]);

  // Depend on the two stable members, never the whole props/source objects
  // (both fresh every render) — keying on them rebuilt the grouping bundle,
  // and the O(filtered rows) grouped flat model behind it, on every
  // keystroke.
  const { onGroupByChange } = props;
  const { setGroupBy: sourceSetGroupBy } = source;
  // `onGroupByChange` is a pure NOTIFICATION: the chrome always applies
  // the grouping change itself, then tells the host. (It used to REPLACE
  // the mutator, so a logging handler silently broke grouping — take full
  // control via `source.setGroupBy` instead.)
  const setGroupBy = useCallback(
    (key: string | null) => {
      sourceSetGroupBy(key ?? undefined);
      onGroupByChange?.(key);
    },
    [onGroupByChange, sourceSetGroupBy]
  );

  const getRowId = selectionGetId ?? rowKey;
  const grouping = useMemo(() => {
    if (!effectiveGroupBy || !source.allFilteredRows) return undefined;
    const entries = buildGroupedFlatModel({
      rows: source.allFilteredRows,
      groupBy: effectiveGroupBy,
      columns: columnLayout.visibleColumns,
      getRowId,
      collapsedIds: groupCollapse.collapsedIds,
      aggregates: props.groupAggregates,
    });
    return {
      groupBy: effectiveGroupBy,
      collapsed: groupCollapse,
      aggregates: props.groupAggregates,
      entries,
      setGroupBy,
    };
  }, [
    effectiveGroupBy,
    source.allFilteredRows,
    columnLayout.visibleColumns,
    getRowId,
    groupCollapse,
    props.groupAggregates,
    setGroupBy,
  ]);

  // See TableChrome.editingRows — the row universe the editing layer
  // validates against must match what the body renders.
  const editingRows = useMemo<readonly TRow[]>(() => {
    if (!grouping) return viewSource.rows;
    const leaves: TRow[] = [];
    for (const entry of grouping.entries) {
      if (entry.kind === "row") leaves.push(entry.row);
    }
    return leaves;
  }, [grouping, viewSource.rows]);

  useEffect(() => {
    if (!editing) return;
    editing.state.discardIfRowMissing(editingRows, (row) =>
      rowKey(row as TRow)
    );
  }, [editing, editingRows, rowKey]);

  const showFooter =
    isPaged &&
    !viewSource.error &&
    (viewSource.total > 0 || viewSource.isLoading || viewSource.isFetching);

  return {
    source: viewSource,
    table,
    isMobile,
    confirm,
    getRowId,
    mergedChips,
    activeFilterCount,
    isPaged,
    body,
    emptyVariant,
    isRefreshing,
    clearFilters,
    detail,
    editing,
    grouping,
    editingRows,
    showFooter,
    columnLayout,
    allColumns: resolvedColumns,
  };
}

/** Result of {@link useChromeBodyData}. */
export interface ChromeBodyData<TRow> {
  /** Row/card window virtualization state (disabled unless eligible). */
  virtualization: TableVirtualization<TRow>;
  /**
   * When grouping is armed, the (possibly virtual-windowed) flat entries
   * adapters should render. `undefined` when grouping is dormant.
   */
  groupingEntries?: readonly GroupedFlatEntry<TRow>[];
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
}

/**
 * The shared data-flow wiring between {@link useTableChrome} and an
 * adapter's body: window virtualization (eligible only for real rows in
 * infinite mode) and the infinite-scroll sentinel. Extracted because four
 * adapters repeated this block verbatim; antd opts out (it scrolls inside
 * its own `<Table>` container).
 *
 * @typeParam TRow - The row type.
 * @param chrome - The {@link useTableChrome} result.
 * @param props - The adapter's {@link BaseDataTableProps}.
 * @returns Virtualization state + the load-more sentinel.
 */
export function useChromeBodyData<TRow>(
  chrome: TableChrome<TRow>,
  props: BaseDataTableProps<TRow>
): ChromeBodyData<TRow> {
  const { rowKey, virtualize = false } = props;
  // The chrome's view facade, so grouped full-set state (no next page, all
  // rows present) drives the sentinel and virtualization too.
  const { source } = chrome;
  if (virtualize && props.renderRowDetail) {
    devWarn(
      "renderRowDetail with virtualize: desktop detail panels render as unmeasured sibling rows, so scroll heights can drift — prefer paged data with row details."
    );
  }
  if (virtualize && source.paginationMode === "paged") {
    devWarn(
      'virtualize only applies in infinite mode — this paged table renders unvirtualized. Pass paginationMode="infinite" to enable it.'
    );
  }
  const fetchNext = useCallback(() => {
    if (source.hasNextPage && !source.isFetchingNextPage) {
      source.fetchNextPage();
    }
  }, [source]);
  const scrollBoxRef = useRef<HTMLElement | null>(null);
  const virtualScrollRef = useCallback((node: HTMLElement | null) => {
    scrollBoxRef.current = node;
  }, []);
  const inScrollBox = props.maxHeight != null;
  const bodyEligible =
    !chrome.isPaged &&
    !source.error &&
    (chrome.body === "desktop" || chrome.body === "mobile");
  const groupingArmed = Boolean(chrome.grouping);
  const groupKeys = chrome.grouping?.entries.map((entry) => entry.key) ?? [];
  const estimateSize = chrome.isMobile
    ? (props.estimateCardSize ?? DEFAULT_CARD_SIZE_PX)
    : (props.estimateRowSize ?? DEFAULT_ROW_SIZE_PX);
  const scrollOpts = {
    overscan: props.virtualOverscan,
    scrollMargin: props.virtualScrollMargin,
    getScrollElement: inScrollBox ? () => scrollBoxRef.current : undefined,
    onEndReached: fetchNext,
    estimateSize,
  } as const;

  // Both hooks run unconditionally (Rules of Hooks); exactly one is enabled.
  const groupVirtualization = useKeyedVirtualization({
    keys: groupKeys,
    enabled: virtualize && groupingArmed && bodyEligible,
    ...scrollOpts,
  });
  const virtualization = useTableVirtualization({
    rows: source.rows,
    rowKey,
    enabled: virtualize && !groupingArmed && bodyEligible,
    ...scrollOpts,
  });

  const groupingEntries = chrome.grouping
    ? windowGroupedEntries(chrome.grouping.entries, groupVirtualization.indices)
    : undefined;

  const resolvedVirtualization = resolveBodyVirtualization(
    groupingArmed,
    groupVirtualization,
    virtualization
  );

  const boxVirtual = resolvedVirtualization.enabled && inScrollBox;
  const canLoadMore = !chrome.isPaged && !source.error && !boxVirtual;
  const loadMoreRef = useInfiniteScroll<HTMLDivElement>({
    hasNextPage: Boolean(source.hasNextPage),
    isFetchingNextPage: Boolean(source.isFetchingNextPage),
    fetchNextPage: fetchNext,
    itemCount: groupingArmed
      ? (chrome.grouping?.entries.length ?? 0)
      : source.rows.length,
    enabled: canLoadMore,
  });
  return {
    virtualization: resolvedVirtualization,
    groupingEntries,
    loadMoreRef,
    canLoadMore,
    virtualScrollRef,
  };
}

function resolveBodyVirtualization<TRow>(
  groupingArmed: boolean,
  groupVirtualization: ReturnType<typeof useKeyedVirtualization>,
  virtualization: TableVirtualization<TRow>
): TableVirtualization<TRow> {
  if (!(groupingArmed && groupVirtualization.enabled)) return virtualization;
  return {
    enabled: true,
    rows: [],
    paddingTop: groupVirtualization.paddingTop,
    paddingBottom: groupVirtualization.paddingBottom,
    measureElement: groupVirtualization.measureElement,
  };
}

/**
 * The shared scroll-restoration wiring every adapter `<DataTable>` needs:
 * when search / sort / page / filters change, scroll the table back below
 * the sticky chrome. Extracted so the identical block isn't repeated (and
 * flagged as duplication) in each adapter.
 *
 * @typeParam TRow - The row type.
 * @param ref - The adapter's root element.
 * @param chrome - The {@link useTableChrome} result.
 * @param props - The adapter's {@link BaseDataTableProps}.
 */
export function useChromeScrollReset<TRow>(
  ref: RefObject<HTMLElement | null>,
  chrome: TableChrome<TRow>,
  props: BaseDataTableProps<TRow>
): void {
  const { source } = props;
  // In infinite mode a page increment means "the window grew at the
  // bottom" (the sentinel loaded more) — yanking the reader back to the
  // table top would fight the scroll they are mid-way through. Only paged
  // navigation is a real page change worth resetting for.
  const pageDep = source.paginationMode === "paged" ? source.page : 0;
  useScrollToTableTop({
    ref,
    deps: [
      source.search,
      source.sortBy ?? "",
      source.sortDir ?? "",
      pageDep,
      chrome.activeFilterCount,
    ],
    enabled: props.scrollToTopOnChange,
    offset: props.stickyTop,
    gap: props.scrollTopGap,
  });
}

/** Pointer/click handlers returned by {@link useFilterTriggerToggle}. */
export interface FilterTriggerToggle {
  onPointerDown: () => void;
  onClick: () => void;
}

/**
 * A toggle for the Filters trigger that survives every kit's outside-close
 * behavior. Some kits (Chakra `closeOnBlur`, outside `mousedown` handlers)
 * close the popover on the trigger's own pointer-down — a plain
 * `setOpen(o => !o)` on click then instantly REOPENS it, so the button can
 * never close the popover. This records whether the popover was open at
 * pointer-down: if the kit closed it in between, the click is swallowed;
 * otherwise the click toggles normally (kits that exclude the trigger from
 * outside-close keep working unchanged).
 */
export function useFilterTriggerToggle(
  open: boolean,
  setOpen: (next: boolean | ((current: boolean) => boolean)) => void
): FilterTriggerToggle {
  const wasOpenAtPointerDown = useRef(false);
  return {
    onPointerDown: useCallback(() => {
      wasOpenAtPointerDown.current = open;
    }, [open]),
    onClick: useCallback(() => {
      const closedByKit = wasOpenAtPointerDown.current && !open;
      wasOpenAtPointerDown.current = false;
      if (closedByKit) return;
      setOpen((current) => !current);
    }, [open, setOpen]),
  };
}
