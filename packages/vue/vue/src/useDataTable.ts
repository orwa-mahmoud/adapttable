/** Destructurable readonly projections and stable actions, with no rendered UI. */
import {
  autoSizeColumns,
  columnFlexShares,
  columnPinInsets,
  computePagination,
  deriveSortByOptions,
  devWarn,
  type Direction,
  gridContainerAttributes,
  gridRowAttributes,
  nextSort,
  pageSizeOptions,
  paginationSlots,
  PIN_Z,
  pinnedCellStyle,
  resolveLabels,
  resolveTableStatus,
  SEARCH_DEBOUNCE_MS,
  tableErrorState,
  type TableLabels,
  type TableSource,
  type TableStatusSignature,
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
  fetchNextBodyPage,
  headerCellAttributes,
  headerRowAttributes,
  htmlGroupedHeaderPlan,
  rowAttributes,
  searchInputAttributes,
  sortButtonAttributes,
  sourceWindowStart,
  tableAttributes,
} from "@adapttable/core/binding";
import {
  computed,
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
  useScopeActivity,
} from "./store";
export interface UseDataTableOptions<TRow> extends ColumnLayoutOptions {
  readonly source: MaybeRefOrGetter<TableSource<TRow>>;
  readonly columns: MaybeRefOrGetter<readonly ColumnInput<TRow>[]>;
  readonly rowKey: (row: TRow) => string;
  readonly tableLabel?: MaybeRefOrGetterOptional<string>;
  readonly labels?: MaybeRefOrGetterOptional<TableLabels>;
  readonly dir?: MaybeRefOrGetter<Direction>;
  readonly forceMobile?: MaybeRefOrGetter<boolean>;
  readonly mobileBreakpoint?: MaybeRefOrGetterOptional<number>;
  readonly locale?: MaybeRefOrGetterOptional<string>;
  readonly searchDebounceMs?: number;
  readonly multiSort?: MaybeRefOrGetter<boolean>;
  readonly fitColumns?: MaybeRefOrGetter<boolean>;
  readonly columnWidths?: MaybeRefOrGetterOptional<
    Readonly<Record<string, number>>
  >;
  readonly collapsibleColumnGroups?: MaybeRefOrGetter<boolean>;
  readonly selection?: RowSelection;
  readonly activeFilterCount?: MaybeRefOrGetter<number>;
  readonly onClearFilters?: () => void;
}
export function useDataTable<TRow>(
  input: MaybeRefOrGetter<UseDataTableOptions<TRow>>
) {
  requireScope("useDataTable");
  const options = computed(() => toValue(input));
  const active = useScopeActivity();
  const source = computed(() => toValue(options.value.source));
  const rows = computed(() => source.value.rows);
  const labels = computed(() =>
    resolveLabels(toValue<TableLabels | undefined>(options.value.labels))
  );
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
  const cancelSearch = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
    timer = undefined;
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
      timer = undefined;
      source.value.setSearch(value);
    }, delay);
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
  const pinStyle = (key: string, header: boolean) =>
    pinnedCellStyle(
      layout.value.pinOffset(key),
      header ? PIN_Z.headerPinned : PIN_Z.body
    );
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
    clearSearchAndFilters: (): void => {
      setSearch("");
      clearChromeFilters(source.value, options.value.onClearFilters);
    },
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
      return toVueAttrs({
        ...attrs,
        "data-pinned": layout.value.pinOffset(column.key)?.side,
        style: { ...attrs.style, ...pinStyle(column.key, true) },
      });
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
    rowAttrs: (row: TRow, index: number) =>
      toVueAttrs({
        ...rowAttributes(
          rowKey(row),
          index,
          options.value.selection?.isSelected(rowKey(row))
        ),
        ...gridRowAttributes(
          { enabled: false, windowed: windowed.value },
          windowStart.value + index
        ),
      }),
    cellAttrs: (column: ColumnDef<TRow>) => {
      const attrs = cellAttributes(column, sizing.value);
      return toVueAttrs({
        ...attrs,
        "data-pinned": layout.value.pinOffset(column.key)?.side,
        style: { ...attrs.style, ...pinStyle(column.key, false) },
      });
    },
    cardAttrs: (row: TRow, index: number) => {
      const size = cardSetSize(source.value, windowStart.value);
      return toVueAttrs({
        "data-adapttable-part": "card",
        "data-row-id": rowKey(row),
        "data-index": index,
        "data-selected": options.value.selection?.isSelected(rowKey(row))
          ? ""
          : undefined,
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
