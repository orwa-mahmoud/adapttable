/**
 * The server tier for Angular: the table owns the query state and emits one
 * consolidated query per real change; the host runs the request and hands
 * back the page. The rules — keying and sending the query, aborting the one
 * it supersedes, the first-load latch, page clamping, the cursor trail,
 * infinite appends — are `@adapttable/core`'s server source.
 */
import {
  type ColumnMetadata,
  createServerSource,
  type FacetMap,
  type PaginationMode,
  type QueryAggregate,
  type QuerySupport,
  resolvePaginationMode,
  type TableQuery,
  type TableSource,
} from "@adapttable/core";
import {
  assertInInjectionContext,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
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
 * What the server tier calls with each new query: run the request, and abort
 * it when `info.signal` says a newer query superseded it.
 *
 * @public
 */
export type TableQueryHandler = (
  query: TableQuery,
  info: { signal: AbortSignal; key: string }
) => void | Promise<void>;

/**
 * Options for {@link injectServerData}.
 *
 * @public
 */
export interface ServerDataOptions<TRow> extends Omit<
  TableUrlStateOptions,
  "injector"
> {
  /** The current page of rows, exactly as the server returned them. */
  readonly rows: MaybeSignal<readonly TRow[]>;
  /** Total row count across all pages (drives the pager). */
  readonly total: MaybeSignal<number>;
  /**
   * Cursor pagination: the token the last response returned for the page
   * after the one on screen, or `null` when that was the last page. Read
   * only when `supports.cursor` is declared.
   */
  readonly nextCursor?: MaybeSignalOptional<string | null>;
  /** Whether a request is currently in flight. */
  readonly loading?: MaybeSignalOptional<boolean>;
  /** The failure from the last request, to display. */
  readonly error?: MaybeSignalOptional<Error | null>;
  /** Pagination mode. Defaults to `"auto"` (mobile → infinite). */
  readonly paginationMode?: MaybeSignal<PaginationMode>;
  /** Force the mobile state instead of reading the viewport. */
  readonly forceMobile?: MaybeSignalOptional<boolean>;
  /** The width, in pixels, at or below which `"auto"` means infinite. */
  readonly mobileBreakpoint?: number;
  /** What this endpoint can answer beyond the baseline query. */
  readonly supports?: MaybeSignalOptional<QuerySupport>;
  /** Aggregate requests to send when the endpoint supports them. */
  readonly aggregates?: MaybeSignalOptional<readonly QueryAggregate[]>;
  /** Columns, to refuse a disallowed aggregate request before it is sent. */
  readonly columns?: MaybeSignalOptional<readonly ColumnMetadata<TRow>[]>;
  /** The `key` of the query these rows answer, echoed from the request. */
  readonly responseKey?: MaybeSignalOptional<string>;
  /** Tree nodes the reader has open, sent with `supports.tree`. */
  readonly expandedIds?: MaybeSignalOptional<readonly string[]>;
  /** Filter keys to count distinct values for, sent with `supports.facets`. */
  readonly facetKeys?: MaybeSignalOptional<readonly string[]>;
  /** Distinct-value counts from the last fetch. */
  readonly facets?: MaybeSignalOptional<FacetMap>;
  /**
   * Called with the consolidated query whenever it changes — including once
   * on first render with the URL-restored values. The previous call's
   * `signal` is aborted when a newer query supersedes it. A signal holding
   * none sends nothing.
   */
  readonly onQueryChange?: MaybeSignalOptional<TableQueryHandler>;
  /** The injector to run in. Omit to use the current injection context. */
  readonly injector?: Injector;
}

/**
 * A server-backed `TableSource`, as a signal.
 *
 * The query is sent once Angular has run the effects that follow a change —
 * after the frame that shows it — and the request in flight is aborted when
 * the injection context is destroyed.
 *
 * @param options - See {@link ServerDataOptions}.
 * @returns The source.
 *
 * @public
 */
export function injectServerData<TRow>(
  options: ServerDataOptions<TRow>
): Signal<TableSource<TRow>> {
  if (!options.injector) assertInInjectionContext(injectServerData);
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
  const source = createServerSource<TRow>();
  // The source's own state — an append, the cursor trail, a refetch, the
  // aggregate operations — moves the frame through this revision.
  const revision = fromStore(
    { getSnapshot: source.revision, subscribe: source.subscribe },
    { injector }
  );
  const supports = computed(() => readMaybe(options.supports));
  const aggregates = computed(() => readMaybe(options.aggregates));
  const loading = computed(() => readMaybe(options.loading) ?? false);
  const error = computed(() => readMaybe(options.error) ?? null);

  const frame = computed(() => {
    revision();
    return source.update(
      {
        rows: readMaybe(options.rows),
        total: readMaybe(options.total),
        nextCursor: readMaybe(options.nextCursor) ?? null,
        loading: loading(),
        error: error(),
        paginationMode: mode(),
        supports: supports(),
        aggregates: aggregates(),
        columns: readMaybe(options.columns),
        responseKey: readMaybe(options.responseKey),
        expandedIds: readMaybe(options.expandedIds),
        facetKeys: readMaybe(options.facetKeys),
        onQueryChange: readMaybe(options.onQueryChange),
      },
      { ...url.state(), setPage: url.setPage }
    );
  });
  // Once the frame is on screen: send a changed query, latch the first load,
  // clamp, record the cursor, and settle the aggregate operations.
  effect(
    () => {
      frame();
      untracked(() => {
        source.commit();
      });
    },
    { injector }
  );
  injector.get(DestroyRef).onDestroy(source.dispose);

  return computed(() => {
    const current = frame();
    const state = url.state();
    const support = supports();
    return {
      rows: current.rows,
      total: readMaybe(options.total),
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
      facets: readMaybe(options.facets),
      filterTree: state.filterTree,
      isLoading: current.isLoading,
      isFetching: loading(),
      isFetchingNextPage: current.isFetchingNextPage,
      hasNextPage: current.hasNextPage,
      error: error(),
      paginationMode: mode(),
      setPage: source.setPage,
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
      fetchNextPage: source.fetchNextPage,
      refetch: source.refetch,
    };
  });
}
