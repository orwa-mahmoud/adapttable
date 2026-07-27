import { useCallback, useEffect, useMemo, useRef } from "react";

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
import type { TableSource } from "./TableSource";

/**
 * The minimal shape `useBackendData` reads from a `useInfiniteQuery`
 * result. Declared structurally so `@tanstack/react-query` stays an
 * optional, type-only peer dependency (no runtime import).
 *
 * @typeParam TPage - The page type returned by each fetch.
 */
export interface InfiniteQueryLike<TPage> {
  data: { pages: TPage[]; pageParams: unknown[] } | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => Promise<unknown> | void;
  refetch: () => Promise<unknown> | void;
  error: Error | null;
}

/** Project a fetched page to its rows (and optional total). */
export type PageSelector<TRow, TPage> = (page: TPage) => {
  items: readonly TRow[];
  total?: number;
};

/** Options for {@link useBackendData}. */
export interface UseBackendDataOptions<
  TRow,
  TParams extends TableQueryParams,
  TPage,
> extends Pick<
  UseTableUrlStateOptions,
  | "adapter"
  | "urlAdapter"
  | "enabled"
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
  /** Static params merged into every query call (e.g. a parent scope id). */
  baseParams?: Partial<TParams>;
  /** Pagination mode. Defaults to `"auto"` (mobile → infinite). */
  paginationMode?: PaginationMode;
  /** Final scrubber on the merged params before they reach the query. */
  sanitizeParams?: (params: Partial<TParams>) => Partial<TParams>;
  /** Force the resolved mobile state instead of a media query (test/SSR seam). */
  forceMobile?: boolean;
}

const defaultSelectPage: PageSelector<unknown, PaginatedResponse<unknown>> = (
  page
) => ({ items: page.items, total: page.total });

/**
 * Server-paginated {@link TableSource}. Wraps a caller's
 * `useInfiniteQuery` hook and exposes the uniform contract: flattening
 * pages in infinite mode, returning the latest page in paged mode, and
 * keeping query params in sync with URL state.
 *
 * @returns A {@link TableSource} backed by the server query.
 */
export function useBackendData<
  TRow,
  TParams extends TableQueryParams = TableQueryParams,
  TPage = PaginatedResponse<TRow>,
>(options: UseBackendDataOptions<TRow, TParams, TPage>): TableSource<TRow> {
  const {
    usePaginatedQuery,
    selectPage,
    baseParams,
    paginationMode = "auto",
    sanitizeParams,
    forceMobile,
    ...urlOptions
  } = options;

  const mediaMobile = useIsMobile();
  const isMobile = forceMobile ?? mediaMobile;
  const resolvedMode = resolvePaginationMode(paginationMode, isMobile);
  const paged = resolvedMode === "paged";

  const state = useTableUrlState(urlOptions);
  const { page, limit, search, sortBy, sortDir, groupBy, extra } = state;

  const params = useMemo(() => {
    const merged: Record<string, unknown> = { ...extra, ...baseParams };
    merged.page = page;
    merged.limit = limit;
    merged.search = search || undefined;
    merged.sortBy = sortBy;
    merged.sortDir = sortDir;
    merged.groupBy = groupBy;
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
  ]);

  const query = usePaginatedQuery(params);

  // Route the selector through a ref so the rows memo only refires when
  // upstream data changes, not on every parent render (inline selectors
  // are a fresh reference each render).
  const selector = (selectPage ?? defaultSelectPage) as PageSelector<
    TRow,
    TPage
  >;
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const { rows, total } = useMemo(() => {
    const pages = query.data?.pages;
    if (!pages?.length) return { rows: [] as readonly TRow[], total: 0 };
    const project = selectorRef.current;
    if (paged) {
      const lastPage = pages.at(-1)!;
      const projected = project(lastPage);
      return {
        rows: projected.items,
        total: projected.total ?? projected.items.length,
      };
    }
    const acc: TRow[] = [];
    let lastTotal: number | undefined;
    for (const pg of pages) {
      const projected = project(pg);
      acc.push(...projected.items);
      if (projected.total !== undefined) lastTotal = projected.total;
    }
    // Mirror the paged branch / useFrontendData: when the source reports no
    // grand total, fall back to the accumulated row count rather than 0.
    return { rows: acc, total: lastTotal ?? acc.length };
  }, [query.data, paged]);

  // Clamp out-of-range pages (hand-edited / stale shared links) once the
  // total is known and nothing is in flight.
  useEffect(() => {
    if (!paged || query.isLoading || query.isFetching || total <= 0) return;
    const lastPage = Math.max(1, Math.ceil(total / Math.max(limit, 1)));
    if (page > lastPage) state.setPage(lastPage);
  }, [paged, query.isLoading, query.isFetching, total, limit, page, state]);

  // Query libraries hand back a FRESH result object every render — latch
  // it so these two keep permanent identity (they gate the source memo).
  const queryRef = useRef(query);
  queryRef.current = query;
  const fetchNextPage = useCallback(() => {
    const live = queryRef.current;
    if (live.hasNextPage && !live.isFetchingNextPage) void live.fetchNextPage();
  }, []);

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
    clearExtras,
    clearAll,
  } = state;
  return useMemo(
    () => ({
      rows,
      total,
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      isFetchingNextPage: query.isFetchingNextPage,
      hasNextPage: query.hasNextPage,
      fetchNextPage,
      error: query.error,
      refetch,
      paginationMode: resolvedMode,
      page,
      limit,
      search,
      sortBy,
      sortDir,
      groupBy,
      extra,
      setPage,
      setLimit,
      setSort,
      setGroupBy,
      sortLevels,
      toggleSortLevel,
      setSearch,
      setExtra,
      setExtras,
      clearExtras,
      clearAll,
    }),
    [
      rows,
      total,
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
      search,
      sortBy,
      sortDir,
      groupBy,
      extra,
      setPage,
      setLimit,
      setSort,
      setGroupBy,
      sortLevels,
      toggleSortLevel,
      setSearch,
      setExtra,
      setExtras,
      clearExtras,
      clearAll,
    ]
  );
}
