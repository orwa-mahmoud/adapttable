/**
 * The frontend tier for Angular: rows in memory, searched, filtered, sorted
 * and paged by `@adapttable/core`'s frontend source, driven by the
 * URL-synced view state.
 */
import {
  type ColumnMetadata,
  createFrontendSource,
  type ExtraFilters,
  type PaginationMode,
  type QueryFilterGroup,
  resolvePaginationMode,
  type SortableValue,
  type TableSource,
} from "@adapttable/core";
import {
  assertInInjectionContext,
  computed,
  effect,
  inject,
  Injector,
  type Signal,
  untracked,
} from "@angular/core";

import { injectIsMobile } from "../hooks/isMobile";
import {
  type MaybeSignal,
  type MaybeSignalOptional,
  readMaybe,
} from "../store";
import {
  injectTableUrlState,
  type TableUrlStateOptions,
} from "../url/tableUrlState";

/**
 * Options for {@link injectFrontendData}.
 *
 * @public
 */
export interface FrontendDataOptions<TRow> extends Omit<
  TableUrlStateOptions,
  "injector"
> {
  /** Every row. The host owns this array; pass a signal to follow changes. */
  readonly data: MaybeSignal<readonly TRow[]>;
  /** Columns, read for sort values and `i18n` paths. */
  readonly columns?: MaybeSignal<readonly ColumnMetadata<TRow>[]>;
  /** How a row's id is derived. Defaults to `String(row.id)`. */
  readonly getRowId?: (row: TRow) => string;
  /** A row's searchable text. Defaults to its own values, flattened. */
  readonly getSearchText?: (row: TRow) => string;
  /** A cell's sort value, overriding the column's own. */
  readonly getSortValue?: (row: TRow, columnKey: string) => SortableValue;
  /** Client filter over the extra-filter bag. */
  readonly filterFn?: (row: TRow, extra: ExtraFilters) => boolean;
  /** Client filter over the nested filter tree. */
  readonly filterTreeFn?: (row: TRow, tree: QueryFilterGroup) => boolean;
  /** Re-evaluate unchanged rows when the filter predicates' meaning changes. */
  readonly filterKey?: MaybeSignalOptional<string | number>;
  /** Active locale for `i18n` column paths. */
  readonly locale?: MaybeSignalOptional<string>;
  /** Pagination mode. Defaults to `"auto"` (mobile → infinite). */
  readonly paginationMode?: MaybeSignal<PaginationMode>;
  /** A loading flag to show, when the rows come from a request. */
  readonly isLoading?: MaybeSignalOptional<boolean>;
  /** A fetching flag to show, when the rows come from a request. */
  readonly isFetching?: MaybeSignalOptional<boolean>;
  /** A failure to show, when the rows come from a request. */
  readonly error?: MaybeSignalOptional<Error | null>;
  /** Re-run the request the rows came from. */
  readonly refetch?: () => Promise<unknown> | void;
  /** Force the mobile state instead of reading the viewport. */
  readonly forceMobile?: MaybeSignalOptional<boolean>;
  /** The mobile breakpoint in pixels. Defaults to 768. */
  readonly mobileBreakpoint?: number;
  /** The injector to run in. Omit to use the current injection context. */
  readonly injector?: Injector;
}

/**
 * An in-memory `TableSource`, as a signal: reads the URL-synced view
 * state and searches, filters, sorts and pages the rows it is given.
 *
 * The engine a source exposes as `tableEngine` publishes each frame once
 * Angular has run the effects that follow it, so an agent or a second reader
 * never sees a frame the view has not.
 *
 * @param options - See {@link FrontendDataOptions}.
 * @returns The source, recomputed whenever the rows or the view state move.
 *
 * @public
 */
export function injectFrontendData<TRow>(
  options: FrontendDataOptions<TRow>
): Signal<TableSource<TRow>> {
  if (!options.injector) assertInInjectionContext(injectFrontendData);
  const injector = options.injector ?? inject(Injector);
  const url = injectTableUrlState({ ...options, injector });
  const viewportMobile = injectIsMobile({
    breakpoint: options.mobileBreakpoint,
    injector,
  });
  const mode = computed(() =>
    resolvePaginationMode(
      readMaybe(options.paginationMode ?? "auto"),
      readMaybe(options.forceMobile) ?? viewportMobile()
    )
  );
  const source = createFrontendSource<TRow>();
  const frame = computed(() =>
    source.update(
      {
        data: readMaybe(options.data),
        columns: options.columns && readMaybe(options.columns),
        getRowId: options.getRowId,
        getSearchText: options.getSearchText,
        getSortValue: options.getSortValue,
        filterFn: options.filterFn,
        filterTreeFn: options.filterTreeFn,
        filterKey: readMaybe(options.filterKey),
        locale: options.locale && readMaybe(options.locale),
        paginationMode: mode(),
      },
      url.state()
    )
  );
  effect(
    () => {
      frame();
      untracked(() => {
        source.commit();
      });
    },
    { injector }
  );

  return computed(() => {
    const current = frame();
    const state = url.state();
    return {
      rows: current.rows,
      allFilteredRows: current.allFilteredRows,
      allSearchedRows: current.allSearchedRows,
      total: current.total,
      isLoading: readMaybe(options.isLoading) ?? false,
      isFetching: readMaybe(options.isFetching) ?? false,
      isFetchingNextPage: false,
      hasNextPage: current.hasNextPage,
      fetchNextPage: () => {
        if (current.hasNextPage) url.setPage(current.page + 1);
      },
      error: readMaybe(options.error) ?? null,
      refetch: options.refetch,
      paginationMode: mode(),
      page: current.page,
      limit: state.limit,
      defaultLimit: state.defaultLimit,
      search: state.search,
      sortBy: state.sortBy,
      sortDir: state.sortDir,
      sortLevels: state.sortLevels,
      groupBy: state.groupBy,
      groupAggregateOverrides: state.groupAggregateOverrides,
      extra: state.extra,
      filterTree: state.filterTree,
      setPage: url.setPage,
      setLimit: url.setLimit,
      setSort: url.setSort,
      setGroupBy: url.setGroupBy,
      initializeGroupBy: url.initializeGroupBy,
      setGroupAggregateOverrides: url.setGroupAggregateOverrides,
      toggleSortLevel: url.toggleSortLevel,
      setSearch: url.setSearch,
      setExtra: url.setExtra,
      setExtras: url.setExtras,
      setFilterTree: url.setFilterTree,
      clearExtras: url.clearExtras,
      clearAll: url.clearAll,
      tableEngine: source.engine,
    };
  });
}
