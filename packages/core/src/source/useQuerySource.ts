import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { FacetMap } from "../filters/facets";
import { parseGroupBy } from "../grouping/groupKeys";
import { resolvePaginationMode, useIsMobile } from "../hooks/useIsMobile";
import type {
  PaginatedResponse,
  PaginationMode,
  TableQueryParams,
} from "../types";
import {
  useTableUrlState,
  type UseTableUrlStateOptions,
} from "../url/useTableUrlState";
import {
  applyQuerySupport,
  type QueryAggregate,
  type QuerySupport,
} from "./queryContract";
import type { TableSource } from "./TableSource";

/**
 * The minimal shape `useQuerySource` reads from a `useInfiniteQuery`
 * result. Declared structurally so `@tanstack/react-query` stays an
 * optional, type-only peer dependency (no runtime import).
 *
 * @typeParam TPage - The page type returned by each fetch.
 *
 * @public
 */
export interface InfiniteQueryLike<TPage> {
  /** The pages fetched so far, absent before the first one lands. */
  data: { pages: TPage[]; pageParams: unknown[] } | undefined;
  /** Whether the first page is still in flight. */
  isLoading: boolean;
  /** Whether any fetch is in flight, first page or not. */
  isFetching: boolean;
  /** Whether the next page in particular is in flight. */
  isFetchingNextPage: boolean;
  /** Whether another page exists to fetch. */
  hasNextPage: boolean;
  /** Fetches the next page. */
  fetchNextPage: () => Promise<unknown> | void;
  /** Re-fetches from the first page. */
  refetch: () => Promise<unknown> | void;
  /** The failure from the last fetch, or null. */
  error: Error | null;
}

/**
 * Project a fetched page to its rows (and optional total).
 *
 * @public
 */
export type PageSelector<TRow, TPage> = (page: TPage) => {
  /** The rows this page carries. */
  rows: readonly TRow[];
  /** Rows in the whole matching set, when the page reports it. */
  total?: number;
  /** Distinct-value counts, when the endpoint answered them. */
  facets?: FacetMap;
};

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
> {
  /**
   * The caller's paginated-query hook, built on `useInfiniteQuery`. It
   * receives the merged params and must return an {@link InfiniteQueryLike}.
   */
  usePaginatedQuery: (params: Partial<TParams>) => InfiniteQueryLike<TPage>;
  /** Page → `{ items, total }` selector. Defaults to reading {@link PaginatedResponse}. */
  selectPage?: PageSelector<TRow, TPage>;
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

const defaultSelectPage: PageSelector<unknown, PaginatedResponse<unknown>> = (
  page
) => ({ rows: page.rows ?? [], total: page.total, facets: page.facets });

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
  const {
    usePaginatedQuery,
    selectPage,
    baseParams,
    paginationMode = "auto",
    sanitizeParams,
    forceMobile,
    supports,
    aggregates,
    expandedIds,
    nextCursor,
    facetKeys,
    ...urlOptions
  } = options;

  const mediaMobile = useIsMobile();
  const isMobile = forceMobile ?? mediaMobile;
  const resolvedMode = resolvePaginationMode(paginationMode, isMobile);
  const paged = resolvedMode === "paged";

  const state = useTableUrlState(urlOptions);
  const { page, limit, search, sortBy, sortDir, groupBy, extra } = state;

  // Cursor mode keeps every token the server has handed out, indexed by the
  // page it opens: `cursors[0]` is always `undefined` (page 1 needs no token)
  // and `cursors[n]` opens page n+1. The trail is what lets the user page BACK
  // through what they have already seen — a single "next cursor" cannot.
  const cursorMode = supports?.cursor === true;
  const [cursors, setCursors] = useState<readonly (string | undefined)[]>([
    undefined,
  ]);
  const cursor = cursorMode ? cursors[page - 1] : undefined;

  const params = useMemo(() => {
    // baseParams are DEFAULTS: everything live is written after them, so a
    // static param can never beat the user's current state. Filter values
    // travel under their own `filters` key — a user filter named `sortBy`,
    // `search` or `groupBy` can never collide with a state param.
    const merged: Record<string, unknown> = { ...baseParams };
    merged.page = page;
    merged.limit = limit;
    merged.search = search || undefined;
    merged.sortBy = sortBy;
    merged.sortDir = sortDir;
    merged.groupBy = groupBy;
    merged.filters = extra;
    // Everything past the baseline is gated on what the source declared. The
    // grouping keys travel as a LIST even when there is one — the contract has
    // always been an array, so nesting needed no new field.
    Object.assign(
      merged,
      applyQuerySupport(
        {
          cursor,
          groupBy: parseGroupBy(groupBy),
          aggregates,
          expandedIds,
          filterTree: state.filterTree,
          facets: facetKeys,
        },
        supports
      )
    );
    const next = merged as Partial<TParams>;
    return sanitizeParams ? sanitizeParams(next) : next;
  }, [
    extra,
    baseParams,
    page,
    limit,
    search,
    sortBy,
    sortDir,
    groupBy,
    sanitizeParams,
    cursor,
    aggregates,
    expandedIds,
    supports,
    state.filterTree,
    facetKeys,
  ]);

  const query = usePaginatedQuery(params);

  // Record the token the CURRENT page handed back, so "next" has something to
  // send and a later "back" can retrace the trail. Read from the last page the
  // infinite query holds, which is the one the table is showing.
  const lastPage = query.data?.pages.at(-1);
  const token = cursorMode && lastPage ? nextCursor?.(lastPage) : undefined;
  useEffect(() => {
    if (!cursorMode || token === undefined || token === null) return;
    setCursors((prev) => {
      if (prev[page] === token) return prev;
      const next = [...prev];
      next[page] = token;
      return next;
    });
  }, [cursorMode, token, page]);

  // A query whose cursor trail is stale must start over rather than page into
  // a position that no longer exists: any change to what the query MEANS
  // (search, sort, filters, page size) invalidates every token already held.
  const trailKey = `${limit}|${search}|${sortBy ?? ""}|${sortDir ?? ""}|${groupBy ?? ""}|${JSON.stringify(extra)}`;
  const previousTrailKey = useRef(trailKey);
  useEffect(() => {
    if (!cursorMode || previousTrailKey.current === trailKey) return;
    previousTrailKey.current = trailKey;
    setCursors([undefined]);
  }, [cursorMode, trailKey]);

  // Route the selector through a ref so the rows memo only refires when
  // upstream data changes, not on every parent render (inline selectors
  // are a fresh reference each render).
  const selector = (selectPage ?? defaultSelectPage) as PageSelector<
    TRow,
    TPage
  >;
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const { rows, total, facets } = useMemo(() => {
    const pages = query.data?.pages;
    if (!pages?.length) {
      return { rows: [] as readonly TRow[], total: 0, facets: undefined };
    }
    const project = selectorRef.current;
    if (paged) {
      const lastPage = pages.at(-1)!;
      const projected = project(lastPage);
      return {
        rows: projected.rows,
        total: projected.total ?? projected.rows.length,
        facets: projected.facets,
      };
    }
    const acc: TRow[] = [];
    let lastTotal: number | undefined;
    let lastFacets: FacetMap | undefined;
    for (const pg of pages) {
      const projected = project(pg);
      acc.push(...projected.rows);
      if (projected.total !== undefined) lastTotal = projected.total;
      if (projected.facets) lastFacets = projected.facets;
    }
    // Mirror the paged branch / useFrontendData: when the source reports no
    // grand total, fall back to the accumulated row count rather than 0.
    return { rows: acc, total: lastTotal ?? acc.length, facets: lastFacets };
  }, [query.data, paged]);

  // Clamp out-of-range pages (hand-edited / stale shared links) once the
  // total is known and nothing is in flight.
  useEffect(() => {
    if (!paged || query.isLoading || query.isFetching || total <= 0) return;
    const lastPage = Math.max(1, Math.ceil(total / Math.max(limit, 1)));
    if (page > lastPage) state.setPage(lastPage);
  }, [paged, query.isLoading, query.isFetching, total, limit, page, state]);

  // Query libraries hand back a FRESH result object every render — latch
  // it so these two keep stable identity (they gate the source memo).
  // Shared contract: append semantics exist only in infinite mode — paged
  // navigation is `setPage`, so in paged mode `fetchNextPage` no-ops and
  // the append flags below read false instead of leaking TanStack's values.
  const queryRef = useRef(query);
  queryRef.current = query;
  const fetchNextPage = useCallback(() => {
    if (paged) return;
    const live = queryRef.current;
    if (live.hasNextPage && !live.isFetchingNextPage) void live.fetchNextPage();
  }, [paged]);

  const refetch = useCallback(() => queryRef.current.refetch(), []);

  // Memoised so the returned source keeps its identity across unrelated
  // renders — a fresh object every render defeated downstream memoization
  // (and the React Compiler bails on this hook, unlike useFrontendData).
  // The mutators are destructured because the url-state RESULT object is
  // itself fresh every render; its members are the stable parts.
  const {
    setPage,
    setLimit,
    setSort,
    setGroupBy,
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
      isFetchingNextPage: paged ? false : query.isFetchingNextPage,
      hasNextPage: paged ? false : query.hasNextPage,
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
      extra,
      facets,
      filterTree: state.filterTree,
      setPage,
      setLimit,
      setSort,
      setGroupBy,
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
      paged,
      query.isLoading,
      query.isFetching,
      query.isFetchingNextPage,
      query.hasNextPage,
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
      extra,
      facets,
      state.filterTree,
      setPage,
      setLimit,
      setSort,
      setGroupBy,
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
