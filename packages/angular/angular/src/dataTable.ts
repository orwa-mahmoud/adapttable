/**
 * The headless table: sorting, search, pagination, visible columns, labels
 * and the attributes every table element carries, as signals over a
 * `TableSource`. Renders nothing — the component that calls it draws
 * its own markup and applies the attributes with {@link AdaptAttrs}.
 */
import {
  autoSizeColumns,
  columnFlexShares,
  type ColumnGroupRecord,
  computePagination,
  deriveSortByOptions,
  devWarn,
  type Direction,
  gridContainerAttributes,
  gridRowAttributes,
  nextSort,
  pageSizeOptions,
  type PaginationInfo,
  type PaginationSlot,
  paginationSlots,
  PIN_Z,
  pinnedCellStyle,
  resolveLabels,
  SEARCH_DEBOUNCE_MS,
  type SortByOption,
  type SortDirection,
  tableErrorState,
  type TableLabels,
  type TableSource,
  visibleColumns,
} from "@adapttable/core";
import {
  bodyCanLoadMore,
  cardSetSize,
  cellAttributes,
  type ChromeBodyRegion,
  chromeBodyRegion,
  chromeEmptyVariant,
  chromeIsRefreshing,
  chromeShowFooter,
  clearChromeFilters,
  type CssProperties,
  type FeatureHostState,
  fetchNextBodyPage,
  headerCellAttributes,
  headerRowAttributes,
  type HtmlGroupedHeaderCell,
  htmlGroupedHeaderPlan,
  rowAttributes,
  searchInputAttributes,
  sortButtonAttributes,
  sourceWindowStart,
  tableAttributes,
} from "@adapttable/core/binding";
import {
  assertInInjectionContext,
  computed,
  effect,
  inject,
  Injector,
  type Signal,
  signal,
  type TemplateRef,
} from "@angular/core";

import { trackTableStatus } from "./a11y/tableStatusState";
import type { Attrs } from "./attrContracts";
import type { AdaptCellTemplate } from "./cellTemplate";
import {
  type CellContext,
  type ColumnDef,
  type ColumnInput,
  flattenColumns,
  resolveColumns,
} from "./columnDef";
import {
  type ColumnLayout,
  columnLayoutFor,
  type ColumnLayoutOptions,
} from "./columns/columnLayout";
import {
  type AdaptTableFeature,
  featureHostFor,
  featureOptionsOf,
  featureSlotFillsOf,
  tableFeaturesOf,
} from "./featureHost";
import { createFeatureState, type FeatureState } from "./featureState";
import { createSearchInput } from "./searchInput";
import type { RowSelection } from "./selection/selection";
import type { SlotFills } from "./slotContracts";
import { type MaybeSignal, type MaybeSignalOptional, readMaybe } from "./store";

/**
 * Options for {@link injectDataTable}.
 *
 * @public
 */
export interface DataTableOptions<TRow> extends ColumnLayoutOptions {
  /** The rows and view state, from `injectFrontendData` or your own tier. */
  readonly source: Signal<TableSource<TRow>>;
  /** Column definitions, and header groups over them. */
  readonly columns: MaybeSignal<readonly ColumnInput<TRow>[]>;
  /** A row's stable id. */
  readonly rowKey: (row: TRow) => string;
  /** The table's accessible name. Defaults to the `table` label. */
  readonly tableLabel?: MaybeSignalOptional<string>;
  /** Translated labels, merged over the English defaults. */
  readonly labels?: MaybeSignalOptional<TableLabels>;
  /** Text direction. Defaults to `"ltr"`. */
  readonly dir?: MaybeSignal<Direction>;
  /** Show the mobile layout's columns. Defaults to `false`. */
  readonly forceMobile?: MaybeSignal<boolean>;
  /** Active locale for columns that read by `i18n` path. */
  readonly locale?: MaybeSignalOptional<string>;
  /** How long the search box waits after typing stops, in ms. Defaults to 300. */
  readonly searchDebounceMs?: number;
  /** Shift-click adds a column to the sort instead of replacing it. */
  readonly multiSort?: boolean;
  /** Columns share the container's width instead of overflowing it. */
  readonly fitColumns?: MaybeSignal<boolean>;
  /** User widths, which win over everything else. */
  readonly columnWidths?: MaybeSignalOptional<Readonly<Record<string, number>>>;
  /**
   * Cell templates declared in the component's own template with
   * `adaptCellTemplate` — pass `viewChildren(AdaptCellTemplate)`. A template
   * fills the cell of the column whose key it names, unless the column has
   * its own `cell`.
   */
  readonly cellTemplates?: Signal<readonly AdaptCellTemplate[]>;
  /**
   * Row selection from `injectRowSelection`. With it, every row states
   * whether it is selected.
   */
  readonly selection?: RowSelection;
  /** Called after the table clears its filters from the empty state. */
  readonly onClearFilters?: () => void;
  /**
   * How many filters are set, from `filterChipsFor`. An empty table under an
   * active filter says nothing matched rather than that nothing exists.
   */
  readonly activeFilterCount?: Signal<number>;
  /** Features this table composes, beside the provided ones. */
  readonly features?: MaybeSignalOptional<readonly AdaptTableFeature[]>;
  /** The injector to run in. Omit to use the current injection context. */
  readonly injector?: Injector;
}

/**
 * Everything a headless Angular table renders from.
 *
 * @public
 */
export interface DataTable<TRow> {
  /** The source the table reads. */
  readonly source: Signal<TableSource<TRow>>;
  /** The rows on the current page. */
  readonly rows: Signal<readonly TRow[]>;
  /** Whether there are no rows and nothing is loading. */
  readonly isEmpty: Signal<boolean>;
  /** The columns visible in the current layout, defaults filled. */
  readonly columns: Signal<readonly ColumnDef<TRow>[]>;
  /** Every declared column, hidden ones included, defaults filled. */
  readonly allColumns: Signal<readonly ColumnDef<TRow>[]>;
  /** The header groups over the columns, by id. */
  readonly columnGroups: Signal<ReadonlyMap<string, ColumnGroupRecord<TRow>>>;
  /**
   * The header rows while any column sits in a group — group cells spanning
   * their columns, then the columns — or `null` for one plain header row.
   */
  readonly headerPlan: Signal<HtmlGroupedHeaderCell[][] | null>;
  /**
   * The user's column layout: hidden, ordered, pinned, resized and renamed
   * columns, and every change a column menu makes.
   */
  readonly layout: Signal<ColumnLayout<TRow>>;
  /**
   * Whether a header can rename its column: the host passed `onColumnRename`.
   */
  readonly canRenameColumns: boolean;
  /** Whether the mobile layout's columns show. */
  readonly isMobile: Signal<boolean>;
  /** Labels: English defaults with the overrides merged. */
  readonly labels: Signal<Required<TableLabels>>;
  /** Text direction. */
  readonly dir: Signal<Direction>;
  /** Page count and the visible range. */
  readonly pagination: Signal<PaginationInfo>;
  /** The active sort column. */
  readonly sortBy: Signal<string | undefined>;
  /** The active sort direction. */
  readonly sortDir: Signal<SortDirection | undefined>;
  /** Sort choices derived from the sortable columns, for a sort select. */
  readonly sortByOptions: Signal<SortByOption[]>;
  /** The committed search term. */
  readonly search: Signal<string>;
  /** What the search box shows: the term as typed, before it commits. */
  readonly searchValue: Signal<string>;
  /**
   * Which body renders: a skeleton on the first load, the empty state, the
   * card list on a phone or the table on a desktop.
   */
  readonly bodyRegion: Signal<ChromeBodyRegion>;
  /**
   * Why the body is empty: `"noResults"` when a search or filter matched
   * nothing, `"noData"` when there is nothing at all.
   */
  readonly emptyVariant: Signal<"noData" | "noResults">;
  /** Whether the paged footer shows. */
  readonly showFooter: Signal<boolean>;
  /** The numbered pager's pages and gaps, keyed. */
  readonly pagerSlots: Signal<PaginationSlot[]>;
  /** The page sizes a rows-per-page control offers. */
  readonly pageSizeOptions: Signal<readonly number[]>;
  /**
   * Whether an infinite list has more rows to load — what a phone shows in
   * place of the pager.
   */
  readonly canLoadMore: Signal<boolean>;
  /** Where the rendered rows start in the dataset. */
  readonly windowStart: Signal<number>;
  /**
   * What the table says after a sort or a page: empty on the first settle,
   * and whenever nothing a reader cares about moved. Render it in a live
   * region that is present from the first paint.
   */
  readonly statusAnnouncement: Signal<string>;
  /**
   * The failure to show in place of the rows, or absent when the load
   * succeeded. Retry is offered only when the source can ask again.
   */
  readonly errorState: Signal<
    | {
        readonly error: Error;
        readonly retry?: () => void;
        readonly retrying: boolean;
      }
    | undefined
  >;
  /**
   * A background refresh: fetching, while the rows already on screen stay.
   */
  readonly isRefreshing: Signal<boolean>;
  /** The features composed on this table. */
  readonly featureHost: FeatureHostState;
  /** Typed values mounted features share with this table's slot components. */
  readonly featureState: FeatureState;
  /**
   * The configuration the features merge (`enableColumnMenu`,
   * `densityChooser` and the rest), from the current composition.
   */
  readonly featureOptions: Readonly<Record<string, unknown>>;
  /** Which components the features draw into each slot. */
  readonly slotFills: SlotFills;
  /** Whether any feature fills a slot. */
  readonly hasSlot: (slot: { readonly id: string }) => boolean;
  /** Advance a column's sort: ascending, descending, then off. */
  readonly toggleSort: (key: string) => void;
  /** Commit a search term now, trimmed. */
  readonly setSearch: (term: string) => void;
  /** Type into the search box; the term commits once typing pauses. */
  readonly setSearchValue: (text: string) => void;
  /** Go to a 1-based page. */
  readonly setPage: (page: number) => void;
  /** Change the page size. */
  readonly setLimit: (limit: number) => void;
  /** Clear every filter, then call `onClearFilters`. */
  readonly clearFilters: () => void;
  /**
   * Size every visible column to its rendered content, measured under
   * `root`, and keep the widths in the layout.
   */
  readonly autoSizeColumns: (root: Element | null) => void;
  /** Size one column to its rendered content. */
  readonly autoSizeColumn: (root: Element | null, key: string) => void;
  /** Load the next rows of an infinite list, unless they are loading. */
  readonly loadMore: () => void;
  /** A row's stable id. */
  readonly rowKey: (row: TRow) => string;
  /** A cell's accessor value. */
  readonly cellValue: (column: ColumnDef<TRow>, row: TRow) => unknown;
  /** The `<table>` element's attributes. */
  readonly tableAttrs: () => Attrs;
  /** The header row's attributes. */
  readonly headerRowAttrs: () => Attrs;
  /** A header cell's attributes: scope, sort state, alignment and size. */
  readonly headerCellAttrs: (column: ColumnDef<TRow>) => Attrs;
  /** A column's sort control: type, name, sort index and its click. */
  readonly sortButtonAttrs: (column: ColumnDef<TRow>) => Attrs;
  /** A body row's attributes. */
  readonly rowAttrs: (row: TRow, index: number) => Attrs;
  /** A body cell's attributes. */
  readonly cellAttrs: (column: ColumnDef<TRow>) => Attrs;
  /** A phone card's attributes: its row identity and place in the list. */
  readonly cardAttrs: (row: TRow, index: number) => Attrs;
  /**
   * The load-more area's attributes: once it scrolls near the viewport, the
   * next rows load, and it keeps loading while the list is too short to push
   * it away.
   */
  readonly loadMoreAttrs: () => Attrs;
  /** The load-more button's attributes: its label, its state and its click. */
  readonly loadMoreButtonAttrs: () => Attrs;
  /**
   * The search box's attributes: its text, and an input handler that commits
   * the term once typing pauses.
   */
  readonly searchInputAttrs: () => Attrs;
}

/**
 * The headless table for an Angular component.
 *
 * @param options - See {@link DataTableOptions}.
 * @returns Signals and attribute getters; see {@link DataTable}.
 *
 * @public
 */
export function injectDataTable<TRow>(
  options: DataTableOptions<TRow>
): DataTable<TRow> {
  if (!options.injector) assertInInjectionContext(injectDataTable);
  const injector = options.injector ?? inject(Injector);
  const { source, rowKey } = options;

  const labels = computed(() =>
    resolveLabels(options.labels && readMaybe(options.labels))
  );
  const dir = computed(() => readMaybe(options.dir ?? "ltr"));
  const isMobile = computed(() => readMaybe(options.forceMobile ?? false));
  const columnWidths = computed(
    () => options.columnWidths && readMaybe(options.columnWidths)
  );

  const features = computed(() =>
    tableFeaturesOf(injector, readMaybe(options.features))
  );
  const featureOptions = computed(() => featureOptionsOf(features()));
  const featureHost = featureHostFor(injector, options.features);
  const tree = computed(() => flattenColumns(readMaybe(options.columns)));
  const columnGroups = computed(() => tree().groups);
  const collapsibleGroups = computed(
    () => featureOptions().collapsibleColumnGroups === true
  );
  const allColumns = computed(() => {
    const templates = options.cellTemplates?.() ?? [];
    const declared = tree().leaves.map((column) => {
      if (column.cell) return column;
      const template = templates.find(
        (candidate) => candidate.key() === column.key
      );
      return template
        ? {
            ...column,
            cell: template.template as TemplateRef<CellContext<TRow>>,
          }
        : column;
    });
    return resolveColumns(
      declared,
      options.locale && readMaybe(options.locale)
    );
  });

  // Duplicate keys corrupt sorting, selection and column layout — every
  // feature targets columns by key.
  effect(
    () => {
      const seen = new Set<string>();
      for (const column of allColumns()) {
        if (seen.has(column.key)) {
          devWarn(
            `duplicate column key "${column.key}" — column keys must be unique; sorting, selection, and column layout all target keys.`
          );
        }
        seen.add(column.key);
      }
    },
    { injector }
  );

  const layout = columnLayoutFor(allColumns, options, injector, {
    columnGroups,
    get collapsible() {
      return collapsibleGroups();
    },
  });
  const columns = computed(() =>
    visibleColumns(
      layout().visibleColumns as ColumnDef<TRow>[],
      isMobile() ? "mobile" : "desktop"
    )
  );
  // A width the user dragged lives in the layout; the host's own widths win.
  const widths = computed(() => ({
    ...layout().state.widths,
    ...columnWidths(),
  }));
  const flexShares = computed(() =>
    columnFlexShares({
      columns: columns(),
      fitColumns:
        readMaybe(options.fitColumns ?? false) ||
        featureOptions().fitColumns === true,
      widths: widths(),
    })
  );
  const sizing = computed(() => ({
    flexShares: flexShares(),
    columnWidths: widths(),
  }));
  /** A pinned column's sticky style, at the header's layer or the body's. */
  const pinStyle = (key: string, header: boolean): CssProperties => ({
    ...pinnedCellStyle(
      layout().pinOffset(key),
      header ? PIN_Z.headerPinned : PIN_Z.body
    ),
  });

  const search = computed(() => source().search);
  const searchInput = createSearchInput(
    search,
    (term) => {
      source().setSearch(term);
    },
    options.searchDebounceMs ?? SEARCH_DEBOUNCE_MS,
    injector
  );

  const windowStart = computed(() => sourceWindowStart(source()));
  const isEmpty = computed(
    () => source().rows.length === 0 && !source().isLoading
  );
  /**
   * Whether the rendered rows are a slice of the dataset — a page, or a
   * window. A reader counts the rows it can reach, so a slice states the
   * real size.
   */
  const windowed = computed(() => source().total > source().rows.length);
  const canLoadMore = computed(
    () =>
      bodyCanLoadMore({
        isPaged: source().paginationMode === "paged",
        source: source(),
      }) && source().hasNextPage === true
  );
  const loadMore = (): void => {
    fetchNextBodyPage(source());
  };
  const loadMoreSentinel = watchLoadMore(
    canLoadMore,
    computed(() => source().rows.length),
    loadMore,
    injector
  );
  const statusAnnouncement = trackTableStatus(
    source,
    labels,
    allColumns,
    injector
  );

  const slotFills = computed(() => featureSlotFillsOf(features()));

  const toggleSort = (key: string): void => {
    const current = source();
    const next = nextSort({ key: current.sortBy, dir: current.sortDir }, key);
    current.setSort(next.key, next.dir);
  };

  return {
    source,
    rows: computed(() => source().rows),
    isEmpty,
    columns,
    allColumns,
    columnGroups,
    headerPlan: computed(() =>
      htmlGroupedHeaderPlan(
        columns(),
        layout().state.collapsedGroups ?? [],
        collapsibleGroups(),
        columnGroups()
      )
    ),
    layout,
    get canRenameColumns() {
      return options.onColumnRename !== undefined;
    },
    isMobile,
    labels,
    dir,
    pagination: computed(() => {
      const { page, limit, total } = source();
      return computePagination({ page, limit, total });
    }),
    sortBy: computed(() => source().sortBy),
    sortDir: computed(() => source().sortDir),
    sortByOptions: computed(() => deriveSortByOptions(columns())),
    search,
    searchValue: searchInput.value,
    bodyRegion: computed(() =>
      chromeBodyRegion({
        isLoading: source().isLoading,
        rowCount: source().rows.length,
        isEmpty: isEmpty(),
        isMobile: isMobile(),
      })
    ),
    emptyVariant: computed(() =>
      chromeEmptyVariant({
        activeFilterCount: options.activeFilterCount?.() ?? 0,
        extra: source().extra,
        search: source().search,
      })
    ),
    showFooter: computed(() => chromeShowFooter(source())),
    pagerSlots: computed(() => {
      const { safePage, totalPages } = computePagination(source());
      return paginationSlots(safePage, totalPages);
    }),
    pageSizeOptions: computed(() =>
      pageSizeOptions([source().limit, source().defaultLimit])
    ),
    canLoadMore,
    windowStart,
    statusAnnouncement,
    errorState: computed(() => tableErrorState(source())),
    isRefreshing: computed(() => chromeIsRefreshing(source())),
    get featureHost() {
      return featureHost();
    },
    featureState: createFeatureState(),
    get featureOptions() {
      return featureOptions();
    },
    get slotFills() {
      return slotFills();
    },
    hasSlot: (slot) => slotFills().has(slot.id),
    toggleSort,
    setSearch: searchInput.commit,
    setSearchValue: searchInput.setValue,
    setPage: (page) => {
      source().setPage(page);
    },
    setLimit: (limit) => {
      source().setLimit(limit);
    },
    loadMore,
    autoSizeColumns: (root) => {
      autoSizeColumns(
        root,
        columns().map((column) => column.key),
        layout().setWidth
      );
    },
    autoSizeColumn: (root, key) => {
      autoSizeColumns(root, [key], layout().setWidth);
    },
    clearFilters: () => {
      clearChromeFilters(source(), options.onClearFilters);
    },
    rowKey,
    cellValue: (column, row) => column.accessor?.(row) ?? null,
    tableAttrs: () => ({
      ...tableAttributes(
        dir(),
        (options.tableLabel && readMaybe(options.tableLabel)) ?? labels().table
      ),
      ...gridContainerAttributes({
        enabled: false,
        windowed: windowed(),
        columnsWindowed: false,
        rowCount: source().total,
        colCount: columns().length,
      }),
    }),
    headerRowAttrs: () => headerRowAttributes(),
    headerCellAttrs: (column) => {
      const { sortBy, sortDir, sortLevels } = source();
      const attributes = headerCellAttributes(
        column,
        { sortBy, sortDir, sortLevels },
        sizing()
      );
      return {
        ...attributes,
        "data-pinned": layout().pinOffset(column.key)?.side,
        style: { ...attributes.style, ...pinStyle(column.key, true) },
      };
    },
    sortButtonAttrs: (column) =>
      sortButtonAttributes(column, {
        sortLevels: source().sortLevels,
        sortByLabel: labels().sortBy,
        multiSort:
          options.multiSort === true || featureOptions().multiSort === true,
        toggleSort,
        toggleSortLevel: (key) => {
          source().toggleSortLevel(key);
        },
      }),
    rowAttrs: (row, index) => {
      const id = rowKey(row);
      return {
        ...rowAttributes(id, index, options.selection?.isSelected(id)),
        ...gridRowAttributes(
          { enabled: false, windowed: windowed() },
          windowStart() + index
        ),
      };
    },
    cellAttrs: (column) => {
      const attributes = cellAttributes(column, sizing());
      return {
        ...attributes,
        "data-pinned": layout().pinOffset(column.key)?.side,
        style: { ...attributes.style, ...pinStyle(column.key, false) },
      };
    },
    loadMoreAttrs: () => ({ ref: loadMoreSentinel }),
    loadMoreButtonAttrs: () => ({
      type: "button",
      disabled: source().isFetchingNextPage === true,
      onClick: loadMore,
    }),
    cardAttrs: (row, index) => {
      const id = rowKey(row);
      const setSize = cardSetSize(source(), windowStart());
      const partial = setSize > source().rows.length;
      return {
        "data-adapttable-part": "card",
        "data-row-id": id,
        "data-index": index,
        "data-selected": options.selection?.isSelected(id) ? "" : undefined,
        // A windowed list has only a slice of its items in the DOM, so each
        // one states where it sits; a complete list is simply counted.
        "aria-posinset": partial ? windowStart() + index + 1 : undefined,
        "aria-setsize": partial ? setSize : undefined,
      };
    },
    searchInputAttrs: () =>
      searchInputAttributes(
        searchInput.value(),
        labels(),
        searchInput.setValue
      ),
  };
}

/**
 * Load the next rows once the load-more area comes within 200px of the
 * viewport. The observer re-arms whenever the row count moves, so a page
 * too short to push the area away keeps loading until it fills or the rows
 * run out.
 *
 * @returns The `ref` that hands the area's element to the watcher.
 */
function watchLoadMore(
  enabled: Signal<boolean>,
  rowCount: Signal<number>,
  loadMore: () => void,
  injector: Injector
): (element: HTMLElement | null) => void {
  const element = signal<HTMLElement | null>(null);
  effect(
    (onCleanup) => {
      const target = element();
      rowCount();
      if (!target || !enabled()) return;
      if (typeof IntersectionObserver === "undefined") return;
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) loadMore();
        },
        { rootMargin: "200px" }
      );
      observer.observe(target);
      onCleanup(() => {
        observer.disconnect();
      });
    },
    { injector }
  );
  return (target) => {
    element.set(target);
  };
}
