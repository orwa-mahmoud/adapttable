/**
 * The query-library tier for Angular: the table's view state becomes the
 * params of the host's infinite query — built with
 * `@tanstack/angular-query-experimental`'s `injectInfiniteQuery`, or anything
 * with the same signals — and the pages it returns become the rows. The
 * rules — flattening pages when infinite, the cursor trail, the aggregate
 * operations, clamping — are `@adapttable/core`'s query source.
 */
import {
  type ColumnMetadata,
  createQuerySource,
  type InfiniteQueryLike,
  type PageSelector,
  type PaginatedResponse,
  type PaginationMode,
  type QueryAggregate,
  type QuerySupport,
  resolvePaginationMode,
  type TableQueryParams,
  type TableSource,
} from "@adapttable/core";
import {
  assertInInjectionContext,
  computed,
  effect,
  inject,
  Injector,
  runInInjectionContext,
  type Signal,
  untracked,
} from "@angular/core";

import { injectIsMobile } from "../hooks/isMobile";
import {
  fromStore,
  type MaybeSignal,
  type MaybeSignalOptional,
  readMaybe,
} from "../store";
import {
  injectTableUrlState,
  type TableUrlStateOptions,
} from "../url/tableUrlState";

/**
 * An infinite query read through signals — what
 * `@tanstack/angular-query-experimental`'s `injectInfiniteQuery` returns.
 *
 * @public
 */
export interface InfiniteQuerySignals<TPage> {
  /** The pages fetched so far, absent before the first one lands. */
  readonly data: Signal<{ pages: TPage[]; pageParams: unknown[] } | undefined>;
  /** Whether the first page is still in flight. */
  readonly isLoading: Signal<boolean>;
  /** Whether any fetch is in flight, first page or not. */
  readonly isFetching: Signal<boolean>;
  /** Whether the next page in particular is in flight. */
  readonly isFetchingNextPage: Signal<boolean>;
  /** Whether another page exists to fetch. */
  readonly hasNextPage: Signal<boolean>;
  /** The failure from the last fetch, or null. */
  readonly error: Signal<Error | null>;
  /** When the last successful response landed. */
  readonly dataUpdatedAt?: Signal<number>;
  /** Fetches the next page. */
  readonly fetchNextPage: () => Promise<unknown> | void;
  /** Re-fetches from the first page. */
  readonly refetch: () => Promise<unknown> | void;
}

/**
 * Options for {@link injectQuerySource}.
 *
 * @public
 */
export interface QuerySourceOptions<
  TRow,
  TParams extends TableQueryParams,
  TPage,
> extends Omit<TableUrlStateOptions, "injector"> {
  /**
   * Build the host's infinite query from the table's params, a signal that
   * moves with the view. Called once, in the injection context. Pass a named
   * function that returns `injectInfiniteQuery(() => ({ queryKey: ["people",
   * params()], … }))`, so the query's types come from its own options.
   */
  readonly query: (
    params: Signal<Partial<TParams>>
  ) => InfiniteQuerySignals<TPage>;
  /** Page → rows, total and facets. Defaults to reading `PaginatedResponse`. */
  readonly selectPage?: PageSelector<TRow, TPage>;
  /** Re-project when this changes, even with no new query data. */
  readonly selectorKey?: MaybeSignalOptional<string | number>;
  /**
   * Static params merged under every query. The live view always wins on a
   * collision.
   */
  readonly baseParams?: MaybeSignalOptional<Partial<TParams>>;
  /** Pagination mode. Defaults to `"auto"` (mobile → infinite). */
  readonly paginationMode?: MaybeSignal<PaginationMode>;
  /** Final scrubber on the merged params before they reach the query. */
  readonly sanitizeParams?: (params: Partial<TParams>) => Partial<TParams>;
  /** Force the mobile state instead of reading the viewport. */
  readonly forceMobile?: MaybeSignalOptional<boolean>;
  /** The width, in pixels, at or below which `"auto"` means infinite. */
  readonly mobileBreakpoint?: number;
  /** What the endpoint can answer beyond the baseline params. */
  readonly supports?: MaybeSignalOptional<QuerySupport>;
  /** Aggregate requests to send when the endpoint supports them. */
  readonly aggregates?: MaybeSignalOptional<readonly QueryAggregate[]>;
  /** Columns, to refuse a disallowed aggregate request before it is sent. */
  readonly columns?: MaybeSignalOptional<readonly ColumnMetadata<TRow>[]>;
  /** Tree nodes the reader has open, sent with `supports.tree`. */
  readonly expandedIds?: MaybeSignalOptional<readonly string[]>;
  /**
   * The token that opens the page after one the query returned. Read only
   * when `supports.cursor` is declared.
   */
  readonly nextCursor?: (page: TPage) => string | null | undefined;
  /** Filter keys to count distinct values for, sent with `supports.facets`. */
  readonly facetKeys?: MaybeSignalOptional<readonly string[]>;
  /** The injector to run in. Omit to use the current injection context. */
  readonly injector?: Injector;
}

/**
 * A `TableSource` backed by the host's infinite query, as a signal.
 *
 * @param options - See {@link QuerySourceOptions}.
 * @returns The source.
 *
 * @public
 */
export function injectQuerySource<
  TRow,
  TParams extends TableQueryParams = TableQueryParams,
  TPage = PaginatedResponse<TRow>,
>(
  options: QuerySourceOptions<TRow, TParams, TPage>
): Signal<TableSource<TRow>> {
  if (!options.injector) assertInInjectionContext(injectQuerySource);
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
  const source = createQuerySource<TRow, TParams, TPage>();
  // The cursor trail and the aggregate operations move through here.
  const revision = fromStore(
    { getSnapshot: source.revision, subscribe: source.subscribe },
    { injector }
  );
  const supports = computed(() => readMaybe(options.supports));
  const aggregates = computed(() => readMaybe(options.aggregates));

  const params = computed(() => {
    revision();
    return source.params(
      {
        paginationMode: mode(),
        baseParams: readMaybe(options.baseParams),
        sanitizeParams: options.sanitizeParams,
        supports: supports(),
        aggregates: aggregates(),
        columns: readMaybe(options.columns),
        expandedIds: readMaybe(options.expandedIds),
        facetKeys: readMaybe(options.facetKeys),
        nextCursor: options.nextCursor,
      },
      { ...url.state(), setPage: url.setPage }
    );
  });
  const query = runInInjectionContext(injector, () => options.query(params));
  const answer = computed<InfiniteQueryLike<TPage>>(() => ({
    data: query.data(),
    isLoading: query.isLoading(),
    isFetching: query.isFetching(),
    isFetchingNextPage: query.isFetchingNextPage(),
    hasNextPage: query.hasNextPage(),
    error: query.error(),
    dataUpdatedAt: query.dataUpdatedAt?.(),
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  }));
  const frame = computed(() => {
    params();
    return source.update({
      query: answer(),
      selectPage: options.selectPage,
      selectorKey: readMaybe(options.selectorKey),
    });
  });
  // Once the frame is on screen: record the cursor, restart a stale trail,
  // settle the aggregate operations and clamp a page past the end.
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
    const support = supports();
    const reply = answer();
    return {
      rows: current.rows,
      total: current.total,
      isLoading: reply.isLoading,
      isFetching: reply.isFetching,
      isFetchingNextPage: current.isFetchingNextPage,
      hasNextPage: current.hasNextPage,
      fetchNextPage: source.fetchNextPage,
      error: reply.error,
      refetch: source.refetch,
      paginationMode: mode(),
      page: state.page,
      limit: state.limit,
      defaultLimit: state.defaultLimit,
      search: state.search,
      sortBy: state.sortBy,
      sortDir: state.sortDir,
      sortLevels: state.sortLevels,
      groupBy: state.groupBy,
      groupAggregateOverrides: state.groupAggregateOverrides,
      groupAggregations: current.groupAggregations,
      queryAggregates: aggregates(),
      aggregateOperations: support?.aggregateOperations,
      honorsAggregates:
        Boolean(support?.aggregates) || Boolean(support?.aggregateOperations),
      extra: state.extra,
      facets: current.facets,
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
    };
  });
}
