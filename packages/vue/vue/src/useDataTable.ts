/** Destructurable readonly projections and stable actions, with no rendered UI. */
import {
  autoSizeColumns,
  devWarn,
  type Direction,
  pageSizeOptions,
  paginationSlots,
  PIN_Z,
  pinnedCellStyle,
  type TableLabels,
  type TableSource,
  visibleColumns,
} from "@adapttable/core";
import {
  bodyCanLoadMore,
  cardSetSize,
  cellAttributes,
  chromeBodyRegion,
  chromeEmptyVariant,
  chromeIsRefreshing,
  chromeShowFooter,
  clearChromeFilters,
  clearSearchAndFilters,
  columnFlexShares,
  columnPinInsets,
  commitSearchOnBlur,
  computePagination,
  deriveSortByOptions,
  desktopChromeMetrics,
  fetchNextBodyPage,
  gridContainerAttributes,
  gridRowAttributes,
  headerCellAttributes,
  headerRowAttributes,
  htmlGroupedHeaderPlan,
  type MeasuredRailWidths,
  nextSort,
  observeRailWidths,
  resolveTableLabels,
  resolveTableStatus,
  rowAttributes,
  rowClickProps,
  SEARCH_DEBOUNCE_MS,
  searchInputAttributes,
  sortButtonAttributes,
  sourceWindowStart,
  tableAttributes,
  tableErrorState,
  type TableStatusSignature,
} from "@adapttable/core/binding";
import {
  computed,
  type ComputedRef,
  type MaybeRefOrGetter,
  onScopeDispose,
  shallowReadonly,
  type ShallowRef,
  shallowRef,
  toValue,
  watch,
  watchEffect,
} from "vue";

import { elementRef, toVueAttrs } from "./attrs";
import {
  type ColumnDef,
  type ColumnInput,
  flattenColumns,
  resolveColumns,
} from "./columnDef";
import {
  type ColumnLayout,
  type ColumnLayoutOptions,
  useColumnLayout,
} from "./columns/columnLayout";
import type { RowSelection } from "./selection/selection";
import { useViewportMobile } from "./source/sourceLifecycle";
import {
  type MaybeRefOrGetterOptional,
  requireScope,
  useOptionFields,
  useScopeActivity,
} from "./store";
export interface UseDataTableOptions<TRow> extends ColumnLayoutOptions {
  readonly source: MaybeRefOrGetter<TableSource<TRow>>;
  readonly columns: MaybeRefOrGetter<readonly ColumnInput<TRow>[]>;
  readonly rowKey: (row: TRow) => string;
  readonly tableLabel?: MaybeRefOrGetterOptional<string>;
  readonly labels?: MaybeRefOrGetterOptional<TableLabels>;
  /** The strings the composed features draw, merged over the base strings. */
  readonly featureLabels?: readonly Partial<TableLabels>[];
  readonly dir?: MaybeRefOrGetter<Direction>;
  readonly forceMobile?: MaybeRefOrGetter<boolean>;
  readonly mobileBreakpoint?: MaybeRefOrGetterOptional<number>;
  readonly locale?: MaybeRefOrGetterOptional<string>;
  readonly searchDebounceMs?: number;
  /** Stick the header while the body scrolls. Inside `maxHeight`, it sticks at 0. */
  readonly stickyHeader?: MaybeRefOrGetterOptional<boolean>;
  /** Page offset for a sticky header, in pixels. Ignored inside a scroll box. */
  readonly stickyTop?: MaybeRefOrGetterOptional<number>;
  /** The search box's placeholder. Defaults to the `searchPlaceholder` label. */
  readonly searchPlaceholder?: MaybeRefOrGetterOptional<string>;
  readonly multiSort?: MaybeRefOrGetter<boolean>;
  readonly fitColumns?: MaybeRefOrGetter<boolean>;
  readonly columnWidths?: MaybeRefOrGetterOptional<
    Readonly<Record<string, number>>
  >;
  readonly collapsibleColumnGroups?: MaybeRefOrGetter<boolean>;
  readonly selection?: RowSelection;
  readonly activeFilterCount?: MaybeRefOrGetter<number>;
  readonly onClearFilters?: () => void;
  /** Activate a row by clicking its body, Enter or Space. */
  readonly onRowClick?: (row: TRow) => void;
  /** Live changed-cell reader, such as `useChangedCellFlash().isFlashing`. */
  readonly isCellFlashing?: (rowId: string, columnKey: string) => boolean;
}
export function useDataTable<TRow>(
  input: MaybeRefOrGetter<UseDataTableOptions<TRow>>
) {
  requireScope("useDataTable");
  // Read option by option: a change to one option reaches its readers only.
  const options = useOptionFields(() => toValue(input));
  const active = useScopeActivity();
  const source = computed(() => toValue(options.value.source));
  const rows = computed(() => source.value.rows);
  const labels = computed(() => {
    const host = toValue<TableLabels | undefined>(options.value.labels);
    const placeholder = toValue(options.value.searchPlaceholder);
    return resolveTableLabels(
      placeholder === undefined
        ? host
        : { ...host, searchPlaceholder: placeholder },
      options.value.featureLabels
    );
  });
  const dir = computed(() => toValue(options.value.dir) ?? "ltr");
  const isMobile = useViewportMobile(options);
  const columnInputs = computed(() => toValue(options.value.columns));
  const columnLocale = computed(() => toValue(options.value.locale));
  const flattened = computed(() => flattenColumns(columnInputs.value));
  const columnGroups = computed(() => flattened.value.groups);
  const allColumns = computed(() =>
    resolveColumns(flattened.value.leaves, columnLocale.value)
  );
  watch(
    allColumns,
    (columns) => {
      const keys = new Set<string>();
      for (const column of columns) {
        if (keys.has(column.key))
          devWarn(
            `Duplicate column key "${column.key}". Column keys must be unique.`
          );
        keys.add(column.key);
      }
    },
    { immediate: true, flush: "sync" }
  );
  const collapsed = computed(
    () => toValue(options.value.collapsibleColumnGroups) ?? false
  );
  const authoredLayout = useColumnLayout(
    allColumns,
    options,
    columnGroups,
    collapsed
  );
  const effectiveColumns = computed(() => {
    const authored = authoredLayout.value;
    const columns = visibleColumns(
      authored.visibleColumns,
      isMobile.value ? "mobile" : "desktop"
    );
    const columnWidths = {
      ...authored.state.widths,
      ...toValue(options.value.columnWidths),
    };
    const insets = columnPinInsets(columns, {
      pinned: authored.state.pinned,
      widths: columnWidths,
    });
    const layout: ColumnLayout<TRow> = {
      ...authored,
      visibleColumns: columns,
      pinOffset: (key) => insets.get(key),
    };
    return {
      layout,
      sizing: {
        columnWidths,
        flexShares: columnFlexShares({
          columns,
          widths: columnWidths,
          fitColumns: toValue(options.value.fitColumns) ?? false,
        }),
      },
    };
  });
  const layout = computed(() => effectiveColumns.value.layout);
  const columns = computed(() => layout.value.visibleColumns);
  const sizing = computed(() => effectiveColumns.value.sizing);
  const columnWidths = computed<Readonly<Record<string, number>>>(
    () => sizing.value.columnWidths
  );
  const rowKey = (row: TRow): string => options.value.rowKey(row);
  const search = computed(() => source.value.search);
  const searchValue = shallowRef(search.value);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disarmBlur: (() => void) | undefined;
  const cancelSearch = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
    timer = undefined;
    disarmBlur?.();
    disarmBlur = undefined;
  };
  watch(
    [search, () => source.value.tableEngine, () => source.value.setSearch],
    () => {
      cancelSearch();
      searchValue.value = search.value;
    },
    { flush: "sync" }
  );
  watch(
    active,
    (enabled) => {
      if (!enabled) cancelSearch();
    },
    { flush: "sync" }
  );
  onScopeDispose(cancelSearch);
  const setSearch = (value: string): void => {
    cancelSearch();
    searchValue.value = value;
    source.value.setSearch(value);
  };
  const setSearchValue = (value: string): void => {
    cancelSearch();
    searchValue.value = value;
    const delay = options.value.searchDebounceMs ?? SEARCH_DEBOUNCE_MS;
    if (delay <= 0) {
      setSearch(value);
      return;
    }
    if (!active.value) return;
    timer = setTimeout(() => {
      cancelSearch();
      source.value.setSearch(value);
    }, delay);
    // Leaving the box commits now, so the next control the user reaches acts
    // on the term they typed rather than racing the delay.
    disarmBlur = commitSearchOnBlur(() => {
      cancelSearch();
      source.value.setSearch(value);
    });
  };
  const windowStart = computed(() => sourceWindowStart(source.value));
  const windowed = computed(() => source.value.total > rows.value.length);
  const isEmpty = computed(() => !rows.value.length && !source.value.isLoading);
  const canLoadMore = computed(
    () =>
      bodyCanLoadMore({
        isPaged: source.value.paginationMode === "paged",
        source: source.value,
      }) && source.value.hasNextPage === true
  );
  const loadMore = (): void => {
    fetchNextBodyPage(source.value);
  };
  const loadMoreElement = shallowRef<Element | null>(null);
  watch(
    [
      loadMoreElement,
      canLoadMore,
      () => rows.value.length,
      active,
      () => source.value.fetchNextPage,
      () => source.value.tableEngine,
    ],
    ([element, enabled, , mounted], _previous, onCleanup) => {
      if (
        !element ||
        !enabled ||
        !mounted ||
        typeof IntersectionObserver === "undefined"
      )
        return;
      let live = true;
      const observer = new IntersectionObserver(
        (entries) => {
          if (
            live &&
            active.value &&
            entries.some((entry) => entry.isIntersecting)
          )
            loadMore();
        },
        { rootMargin: "200px" }
      );
      observer.observe(element);
      onCleanup(() => {
        live = false;
        observer.disconnect();
      });
    },
    { flush: "post" }
  );
  const loadMoreRef = elementRef((element: Element | null): void => {
    loadMoreElement.value = element;
  });
  let signature: TableStatusSignature | undefined;
  const statusAnnouncement = shallowRef("");
  watchEffect(() => {
    const current = source.value;
    const next = resolveTableStatus(
      {
        labels: labels.value,
        total: current.total,
        shown: current.rows.length,
        page: current.page,
        limit: current.limit,
        paged: current.paginationMode === "paged",
        sortBy: current.sortBy,
        sortDir: current.sortDir,
        sortColumnName: allColumns.value.find(
          (column) => column.key === current.sortBy
        )?.header,
      },
      signature
    );
    signature = next.signature;
    statusAnnouncement.value = next.announcement;
  });
  const toggleSort = (
    key: string,
    event?: { readonly shiftKey?: boolean }
  ): void => {
    const current = source.value;
    if (toValue(options.value.multiSort) && event?.shiftKey) {
      current.toggleSortLevel(key);
      return;
    }
    const next = nextSort({ key: current.sortBy, dir: current.sortDir }, key);
    current.setSort(next.key, next.dir);
  };
  // Pinned columns sit past the rails (expand, reorder, selection, actions)
  // at their rendered widths, read from the header while anything is pinned.
  const railHead = shallowRef<Element | null>(null);
  const railWidths = shallowRef<MeasuredRailWidths>({});
  // Booleans, so a layout rebuilt for another reason redraws no rail.
  const pinnedSides = {
    start: computed(() =>
      Object.values(layout.value.state.pinned).includes("start")
    ),
    end: computed(() =>
      Object.values(layout.value.state.pinned).includes("end")
    ),
  };
  watch(
    [railHead, () => pinnedSides.start.value || pinnedSides.end.value],
    ([head, pinned], _previous, onCleanup) => {
      if (!head || !pinned) {
        if (Object.keys(railWidths.value).length > 0) railWidths.value = {};
        return;
      }
      onCleanup(
        observeRailWidths(head, (widths) => {
          railWidths.value = widths;
        })
      );
    },
    { flush: "post", immediate: true }
  );
  const railMetrics = computed(() => {
    const measured = railWidths.value;
    return desktopChromeMetrics({
      expandable: measured.expansion !== undefined,
      showReorder: measured.reorder !== undefined,
      hasSelection: measured.selection !== undefined,
      showActions: measured.actions !== undefined,
      measured,
    });
  });
  // Numbers, so a cell or rail redraws only when its own inset moves.
  const leadStart = computed(() => railMetrics.value.leads.start ?? 0);
  const leadEnd = computed(() => railMetrics.value.leads.end ?? 0);
  const railInsets: Readonly<Record<TableRail, ComputedRef<number>>> = {
    expand: computed(() => railMetrics.value.railInsets.expand),
    reorder: computed(() => railMetrics.value.railInsets.reorder),
    selection: computed(() => railMetrics.value.railInsets.selection),
    actions: computed(() => railMetrics.value.railInsets.actions),
  };
  // A kit may draw its rail cell as a component; its root is the cell.
  const holdRailHead = elementRef<Element>(
    (cell) => {
      if (cell) railHead.value = cell.closest("thead") ?? cell.parentElement;
    },
    (component) => (component.$el instanceof Element ? component.$el : null)
  );
  const pinStyle = (key: string, header: boolean) =>
    pinnedCellStyle(
      layout.value.pinOffset(key),
      header ? PIN_Z.headerPinned : PIN_Z.body,
      { start: leadStart.value, end: leadEnd.value }
    );
  /** A header cell's sticky-header style, when the header sticks. */
  const headerStickyStyle = () =>
    toValue(options.value.stickyHeader) === true
      ? {
          position: "sticky" as const,
          top: `${toValue(options.value.stickyTop) ?? 0}px`,
          zIndex: PIN_Z.header,
        }
      : undefined;
  /**
   * The row's selected state: what `state` says when it is given, without
   * reading the table's selection; else the table's.
   */
  const rowSelected = (
    row: TRow,
    state: { readonly selected?: boolean } | undefined
  ): boolean | undefined =>
    state ? state.selected : options.value.selection?.isSelected(rowKey(row));
  const readonlySearchValue: Readonly<ShallowRef<string>> =
    shallowReadonly(searchValue);
  const readonlyStatusAnnouncement: Readonly<ShallowRef<string>> =
    shallowReadonly(statusAnnouncement);
  return {
    source,
    rows,
    columns,
    columnWidths,
    allColumns,
    columnGroups,
    layout,
    labels,
    dir,
    isMobile,
    headerPlan: computed(() =>
      htmlGroupedHeaderPlan(
        columns.value,
        layout.value.state.collapsedGroups ?? [],
        collapsed.value,
        columnGroups.value
      )
    ),
    canRenameColumns: computed(
      () => options.value.onColumnRename !== undefined
    ),
    pagination: computed(() => computePagination(source.value)),
    pagerSlots: computed(() => {
      const info = computePagination(source.value);
      return paginationSlots(info.safePage, info.totalPages);
    }),
    pageSizeOptions: computed(() =>
      pageSizeOptions([source.value.limit, source.value.defaultLimit])
    ),
    sortBy: computed(() => source.value.sortBy),
    sortDir: computed(() => source.value.sortDir),
    sortByOptions: computed(() => deriveSortByOptions(columns.value)),
    search,
    searchValue: readonlySearchValue,
    isEmpty,
    bodyRegion: computed(() =>
      chromeBodyRegion({
        isLoading: source.value.isLoading,
        rowCount: rows.value.length,
        isEmpty: isEmpty.value,
        isMobile: isMobile.value,
      })
    ),
    emptyVariant: computed(() =>
      chromeEmptyVariant({
        activeFilterCount: toValue(options.value.activeFilterCount) ?? 0,
        extra: source.value.extra,
        search: search.value,
      })
    ),
    showFooter: computed(() => chromeShowFooter(source.value)),
    canLoadMore,
    windowStart,
    statusAnnouncement: readonlyStatusAnnouncement,
    errorState: computed(() => tableErrorState(source.value)),
    isRefreshing: computed(() => chromeIsRefreshing(source.value)),
    rowKey,
    cellValue: <TValue>(
      column: ColumnDef<TRow, TValue>,
      row: TRow
    ): TValue | undefined => column.accessor?.(row),
    toggleSort,
    setSearch,
    setSearchValue,
    setPage: (page: number): void => source.value.setPage(page),
    setLimit: (limit: number): void => source.value.setLimit(limit),
    clearFilters: (): void =>
      clearChromeFilters(source.value, options.value.onClearFilters),
    clearSearchAndFilters: (): void =>
      clearSearchAndFilters(
        source.value,
        setSearch,
        options.value.onClearFilters
      ),
    loadMore,
    autoSizeColumns: (root: HTMLElement | null): void => {
      if (root)
        autoSizeColumns(
          root,
          columns.value.map((column) => column.key),
          layout.value.setWidth
        );
    },
    autoSizeColumn: (root: HTMLElement | null, key: string): void => {
      if (root) autoSizeColumns(root, [key], layout.value.setWidth);
    },
    tableAttrs: () =>
      toVueAttrs({
        ...tableAttributesFor(),
        ...gridContainerAttributes({
          enabled: false,
          windowed: windowed.value,
          columnsWindowed: false,
          rowCount: source.value.total,
          colCount: columns.value.length,
        }),
      }),
    headerRowAttrs: () => toVueAttrs(headerRowAttributes()),
    headerCellAttrs: (column: ColumnDef<TRow>) => {
      const attrs = headerCellAttributes(column, source.value, sizing.value);
      const stickyStyle = headerStickyStyle();
      return toVueAttrs({
        ...attrs,
        "data-pinned": layout.value.pinOffset(column.key)?.side,
        "data-sticky": stickyStyle ? "" : undefined,
        style: {
          ...attrs.style,
          ...pinStyle(column.key, true),
          ...stickyStyle,
        },
      });
    },
    /**
     * A rail cell's attributes: sticky past the rails before it while a
     * column is pinned to its edge. A header rail also reports the header,
     * so pinned columns can be placed past the rails' rendered widths.
     */
    railAttrs: (rail: TableRail, header: boolean) => {
      const side = rail === "actions" ? "end" : "start";
      const pinned = pinnedSides[side].value;
      const inset = railInsets[rail].value;
      const stickyStyle = header ? headerStickyStyle() : undefined;
      const pinStyle = pinnedCellStyle(
        pinned ? { side, inset } : undefined,
        header ? PIN_Z.headerPinned : PIN_Z.body
      );
      // Only what applies, so an unpinned rail renders exactly as the kit
      // draws it.
      const attrs: Record<string, unknown> = {};
      if (header) attrs.ref = holdRailHead;
      if (pinned) attrs["data-pinned"] = side;
      if (stickyStyle) attrs["data-sticky"] = "";
      if (stickyStyle || pinStyle)
        attrs.style = { ...stickyStyle, ...pinStyle };
      return attrs;
    },
    sortButtonAttrs: (column: ColumnDef<TRow>) =>
      toVueAttrs(
        sortButtonAttributes(column, {
          sortLevels: source.value.sortLevels,
          sortByLabel: labels.value.sortBy,
          multiSort: toValue(options.value.multiSort) ?? false,
          toggleSort,
          toggleSortLevel: (key) => source.value.toggleSortLevel(key),
        })
      ),
    rowAttrs: (
      row: TRow,
      index: number,
      state?: { readonly selected?: boolean }
    ) => {
      const click = rowClickProps(row, options.value.onRowClick, index);
      return toVueAttrs({
        ...rowAttributes(rowKey(row), index, rowSelected(row, state)),
        ...gridRowAttributes(
          { enabled: false, windowed: windowed.value },
          windowStart.value + index
        ),
        ...click,
        "data-clickable": click ? "" : undefined,
        "data-stagger": "",
      });
    },
    /** Whether a live update to this cell is fresh enough to flash. */
    isCellFlashing: (row: TRow, columnKey: string) =>
      options.value.isCellFlashing?.(rowKey(row), columnKey) === true,
    cellAttrs: (column: ColumnDef<TRow>) => {
      const attrs = cellAttributes(column, sizing.value);
      return toVueAttrs({
        ...attrs,
        "data-pinned": layout.value.pinOffset(column.key)?.side,
        style: { ...attrs.style, ...pinStyle(column.key, false) },
      });
    },
    cardAttrs: (
      row: TRow,
      index: number,
      state?: { readonly selected?: boolean }
    ) => {
      const size = cardSetSize(source.value, windowStart.value);
      const click = rowClickProps(row, options.value.onRowClick, index);
      return toVueAttrs({
        ...click,
        "data-clickable": click ? "" : undefined,
        "data-adapttable-part": "card",
        "data-row-id": rowKey(row),
        "data-index": index,
        "data-selected": rowSelected(row, state) ? "" : undefined,
        "data-stagger": "",
        "aria-posinset":
          size > rows.value.length ? windowStart.value + index + 1 : undefined,
        "aria-setsize": size > rows.value.length ? size : undefined,
      });
    },
    searchInputAttrs: () =>
      toVueAttrs(
        searchInputAttributes(searchValue.value, labels.value, setSearchValue)
      ),
    loadMoreAttrs: () => ({ ref: loadMoreRef }),
    loadMoreButtonAttrs: () => ({
      type: "button" as const,
      disabled: source.value.isFetchingNextPage === true,
      onClick: loadMore,
    }),
  };
  function tableAttributesFor() {
    return tableAttributes(
      dir.value,
      toValue(options.value.tableLabel) ?? labels.value.table
    );
  }
}
export type UseDataTableResult<TRow> = ReturnType<typeof useDataTable<TRow>>;

/**
 * A rail the table draws beside the data columns.
 *
 * @public
 */
export type TableRail = "expand" | "reorder" | "selection" | "actions";
