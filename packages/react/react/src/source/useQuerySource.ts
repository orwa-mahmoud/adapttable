import {
  type ColumnMetadata,
  type InfiniteQueryLike,
  type PageSelector,
  type PaginatedResponse,
  type PaginationMode,
  type QueryAggregate,
  type QuerySupport,
  type TableQueryParams,
  type TableSource,
} from "@adapttable/core";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { useIsMobile } from "../hooks/useIsMobile";
import {
  useTableUrlState,
  type UseTableUrlStateOptions,
} from "../url/useTableUrlState";

export type { InfiniteQueryLike, PageSelector } from "@adapttable/core";

import {
  createQuerySource,
  type QuerySource,
  resolvePaginationMode,
} from "@adapttable/core/binding";

/**
 * Options for {@link useQuerySource}.
 *
 * @public
 */
export interface UseQuerySourceOptions<
  TRow,
  TParams extends TableQueryParams,
  TPage,
> extends Pick<
  UseTableUrlStateOptions,
  | "urlAdapter"
  | "urlSync"
  | "defaults"
  | "numberExtraKeys"
  | "arrayExtraKeys"
  | "urlKey"
  | "store"
> {
  /**
   * The caller's paginated-query hook, built on `useInfiniteQuery`. It
   * receives the merged params and must return an {@link InfiniteQueryLike}.
   */
  usePaginatedQuery: (params: Partial<TParams>) => InfiniteQueryLike<TPage>;
  /**
   * Page → `{ rows, total? }` selector. Defaults to reading {@link PaginatedResponse}.
   *
   * The selector is read through a ref so the rows memo only refires when
   * upstream query data, pagination mode, or {@link UseQuerySourceOptions.selectorKey}
   * changes. An unmemoized inline selector that changes identity — or
   * closed-over values — without a data or key change will not re-project.
   */
  selectPage?: PageSelector<TRow, TPage>;
  /**
   * Explicit invalidation for {@link UseQuerySourceOptions.selectPage}.
   * Omitting it preserves today's behavior: the latest selector is used on
   * the next fetch, not on the next render. Pass a stable string or number
   * (never an object or function) when a memoized selector closes over a
   * projection input that can change without new query data.
   */
  selectorKey?: string | number;
  /**
   * Static params merged into every query call (e.g. a parent scope id).
   * The live table state always wins on collision: `page`, `limit`,
   * `search`, `sortBy`, `sortDir`, `groupBy` and `filters` come from the
   * table itself and can never be overridden here — seed state through
   * `defaults` instead.
   */
  baseParams?: Partial<TParams>;
  /** Pagination mode. Defaults to `"auto"` (mobile → infinite). */
  paginationMode?: PaginationMode;
  /** Final scrubber on the merged params before they reach the query. */
  sanitizeParams?: (params: Partial<TParams>) => Partial<TParams>;
  /** Force the resolved mobile state instead of a media query (test/SSR seam). */
  forceMobile?: boolean;
  /**
   * The width, in pixels, at or below which `paginationMode="auto"` resolves
   * to infinite scroll. Defaults to 768. Pass the table's `mobileBreakpoint`
   * so the mode follows the same rule as the card layout.
   */
  mobileBreakpoint?: number;
  /**
   * What the endpoint can answer, exactly as {@link useServerData} takes it.
   * Only a declared capability is ever sent; an undeclared one is dropped
   * before the request rather than sent and ignored.
   */
  supports?: QuerySupport;
  /**
   * Aggregates to ask the server for — `[{ key: "budget", fn: "sum" }]`.
   *
   * Sent only when the source declares `supports.aggregates`. With grouping
   * armed the server computes them per group; without it, over the whole
   * result set.
   */
  aggregates?: readonly QueryAggregate[];
  /**
   * Columns used to refuse a stale or disallowed aggregate request before
   * it is sent. The same `aggregatable` rules the panel and column menu
   * resolve; omit them and only the backend's listed operations are gated.
   */
  columns?: readonly ColumnMetadata<TRow>[];
  /**
   * The tree nodes the reader has open, when the hierarchy lives on the server.
   * Sent as `expandedIds` only if the source declares
   * `supports: { tree: true }`, so the response can carry the children of every
   * open branch alongside the page. Hold the same array in the table's
   * `expandedIds` and one piece of state drives both.
   */
  expandedIds?: readonly string[];
  /**
   * The token that opens the NEXT page, read from the page the query just
   * returned — pass it and declare `supports: { cursor: true }` to page by
   * cursor instead of by offset.
   *
   * Rows inserted or deleted mid-read shift every offset after them, which is
   * how an offset pager duplicates or skips rows; a cursor names a position in
   * the result rather than a distance into it.
   */
  nextCursor?: (page: TPage) => string | null | undefined;
  /**
   * Filter keys to ask the server for distinct-value counts. Sent as
   * `query.facets` only when `supports.facets` is set.
   */
  facetKeys?: readonly string[];
}

/**
 * Server-paginated {@link TableSource}. Wraps a caller's
 * `useInfiniteQuery` hook and exposes the uniform contract: flattening
 * pages in infinite mode, returning the latest page in paged mode, and
 * keeping query params in sync with URL state.
 *
 * @returns A {@link TableSource} backed by the server query.
 *
 * @public
 */
export function useQuerySource<
  TRow,
  TParams extends TableQueryParams = TableQueryParams,
  TPage = PaginatedResponse<TRow>,
>(options: UseQuerySourceOptions<TRow, TParams, TPage>): TableSource<TRow> {
  // The source is mutable and must see every render's inputs; its own state
  // re-renders through the subscription below, and the result is memoized
  // explicitly, so the compiler's cache would only skip updates.
  "use no memo";
  const {
    usePaginatedQuery,
    selectPage,
    selectorKey,
    baseParams,
    paginationMode = "auto",
    sanitizeParams,
    forceMobile,
    mobileBreakpoint,
    supports,
    aggregates,
    columns,
    expandedIds,
    nextCursor,
    facetKeys,
    ...urlOptions
  } = options;

  const mediaMobile = useIsMobile(mobileBreakpoint);
  const isMobile = forceMobile ?? mediaMobile;
  const resolvedMode = resolvePaginationMode(paginationMode, isMobile);

  const state = useTableUrlState(urlOptions);
  const { page, limit, search, sortBy, sortDir, groupBy } = state;
  const { groupAggregateOverrides, extra } = state;

  const [source] = useState<QuerySource<TRow, TParams, TPage>>(
    createQuerySource<TRow, TParams, TPage>
  );
  // The cursor trail and the aggregate operations re-render through here.
  useSyncExternalStore(source.subscribe, source.revision, source.revision);

  const params = source.params(
    {
      paginationMode: resolvedMode,
      baseParams,
      sanitizeParams,
      supports,
      aggregates,
      columns,
      expandedIds,
      facetKeys,
      nextCursor,
    },
    state
  );
  const query = usePaginatedQuery(params);
  const frame = source.update({ query, selectPage, selectorKey });
  const { rows, total, facets, groupAggregations } = frame;
  // Once React accepts the render: record the cursor, restart a stale trail,
  // settle the aggregate operations and clamp a page past the end.
  useEffect(() => {
    source.commit();
  });
  const { fetchNextPage, refetch } = source;

  // Memoised so the returned source keeps its identity across unrelated
  // renders — a fresh object every render defeated downstream memoization
  // (this hook opts out of the React Compiler, so it memoizes by hand).
  // The mutators are destructured because the url-state RESULT object is
  // itself fresh every render; its members are the stable parts.
  const {
    setPage,
    setLimit,
    setSort,
    setGroupBy,
    initializeGroupBy,
    setGroupAggregateOverrides,
    sortLevels,
    toggleSortLevel,
    setSearch,
    setExtra,
    setExtras,
    setFilterTree,
    clearExtras,
    clearAll,
  } = state;
  return useMemo(
    () => ({
      rows,
      total,
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      isFetchingNextPage: frame.isFetchingNextPage,
      hasNextPage: frame.hasNextPage,
      fetchNextPage,
      error: query.error,
      refetch,
      paginationMode: resolvedMode,
      page,
      limit,
      defaultLimit: state.defaultLimit,
      search,
      sortBy,
      sortDir,
      groupBy,
      groupAggregateOverrides,
      groupAggregations,
      queryAggregates: aggregates,
      aggregateOperations: supports?.aggregateOperations,
      honorsAggregates:
        Boolean(supports?.aggregates) || Boolean(supports?.aggregateOperations),
      extra,
      facets,
      filterTree: state.filterTree,
      setPage,
      setLimit,
      setSort,
      setGroupBy,
      initializeGroupBy,
      setGroupAggregateOverrides,
      sortLevels,
      toggleSortLevel,
      setSearch,
      setExtra,
      setExtras,
      setFilterTree,
      clearExtras,
      clearAll,
    }),
    [
      rows,
      total,
      query.isLoading,
      query.isFetching,
      frame.isFetchingNextPage,
      frame.hasNextPage,
      fetchNextPage,
      query.error,
      refetch,
      resolvedMode,
      page,
      limit,
      state.defaultLimit,
      search,
      sortBy,
      sortDir,
      groupBy,
      groupAggregateOverrides,
      groupAggregations,
      aggregates,
      supports,
      extra,
      facets,
      state.filterTree,
      setPage,
      setLimit,
      setSort,
      setGroupBy,
      initializeGroupBy,
      setGroupAggregateOverrides,
      sortLevels,
      toggleSortLevel,
      setSearch,
      setExtra,
      setExtras,
      setFilterTree,
      clearExtras,
      clearAll,
    ]
  );
}
