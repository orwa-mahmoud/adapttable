import { useEffect, useMemo, useRef, useState } from "react";

import { useEventCallback } from "../hooks/useEventCallback";
import { resolvePaginationMode, useIsMobile } from "../hooks/useIsMobile";
import type { SortLevel } from "../sort/compare";
import type { ExtraFilters, PaginationMode, SortDirection } from "../types";
import {
  useTableUrlState,
  type UseTableUrlStateOptions,
} from "../url/useTableUrlState";
import { devWarn } from "../utils/devWarn";
import { stableKey } from "../utils/stableKey";
import type { TableSource } from "./TableSource";

/** One consolidated snapshot of everything a server query needs. */
export interface TableQuery {
  /** 1-based page. */
  page: number;
  /** Page size. */
  limit: number;
  /** Committed (debounced) search term. */
  search: string;
  /** Active sort column key, if any. */
  sortBy: string | undefined;
  /** Active sort direction, if any. */
  sortDir: SortDirection | undefined;
  /** The multi-sort chain (empty unless multi-sort is in use). */
  sortLevels: readonly SortLevel[];
  /** The active filter values. */
  filters: ExtraFilters;
}

/** Options for {@link useServerData}. */
export interface UseServerDataOptions<TRow> extends Pick<
  UseTableUrlStateOptions,
  | "urlAdapter"
  | "urlSync"
  | "defaults"
  | "numberExtraKeys"
  | "arrayExtraKeys"
  | "urlKey"
> {
  /** The current page of rows, exactly as the server returned them. */
  rows: readonly TRow[];
  /** Total row count across all pages (drives the pager). */
  total: number;
  /** Whether a request is currently in flight. */
  loading?: boolean;
  /** Forwarded error to display. */
  error?: Error | null;
  /** Pagination mode. Defaults to `"auto"` (mobile → infinite). */
  paginationMode?: PaginationMode;
  /** Force the resolved mobile state instead of a media query (test/SSR seam). */
  forceMobile?: boolean;
  /**
   * Fired with the consolidated {@link TableQuery} whenever it changes —
   * including once on mount with the URL-restored values. The previous
   * call's `signal` is aborted when a newer query supersedes it; forward it
   * to `fetch` and out-of-order responses die at the source.
   */
  onQueryChange?: (
    query: TableQuery,
    info: { signal: AbortSignal }
  ) => void | Promise<void>;
}

/**
 * The hand-rolled-fetch server tier: the table owns the query state (URL,
 * widgets, chips, debounce) and emits ONE consolidated event per real
 * change; the caller's only job is to run the request and hand back
 * `rows` + `total`. No query library required — and the full
 * `useQuerySource` tier remains for callers who want one.
 *
 * Implements the shared source contract: `isLoading` covers the first
 * load only, `isFetching` any in-flight request, and in infinite mode
 * `fetchNextPage` APPENDS the next page's rows to those on screen
 * (accumulating across `onQueryChange` round-trips) instead of replacing
 * them.
 *
 * @typeParam TRow - The row type.
 */
export function useServerData<TRow>(
  options: UseServerDataOptions<TRow>
): TableSource<TRow> {
  const {
    rows,
    total,
    loading = false,
    error = null,
    paginationMode = "auto",
    forceMobile,
    onQueryChange,
    ...urlOptions
  } = options;
  const mediaMobile = useIsMobile();
  const isMobile = forceMobile ?? mediaMobile;
  const resolvedMode = resolvePaginationMode(paginationMode, isMobile);
  const paged = resolvedMode === "paged";

  const state = useTableUrlState(urlOptions);
  const { page, limit, search, sortBy, sortDir, groupBy, sortLevels, extra } =
    state;

  const query = useMemo<TableQuery>(
    () => ({
      page,
      limit,
      search,
      sortBy,
      sortDir,
      sortLevels,
      filters: extra,
    }),
    [page, limit, search, sortBy, sortDir, sortLevels, extra]
  );
  // Value-keyed, so re-renders and StrictMode double-mounts never re-fire
  // an identical query; `refetch` bumps the generation to force one.
  const queryKey = stableKey(query);
  const [generation, setGeneration] = useState(0);

  const controllerRef = useRef<AbortController | null>(null);

  // Emits the LATEST query / handler when the value-keyed query changes,
  // without re-subscribing on every render.
  const emitQuery = useEventCallback(() => {
    if (!onQueryChange) return undefined;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    void onQueryChange(query, { signal: controller.signal });
    // Abort the in-flight request when the table unmounts.
    return () => controller.abort();
  });

  useEffect(() => emitQuery(), [queryKey, generation, emitQuery]);

  // `isLoading` covers the FIRST load only — TanStack's reference
  // semantics: fetching with no data yet. Once rows have ever been present
  // or one load has completed (loading transitions true → false), later
  // refreshes never re-raise it — even a refresh that empties `rows`.
  // Latched in an idempotent effect body so StrictMode's simulated remount
  // cannot mark it early.
  const rowsPresent = rows.length > 0;
  const sawLoadingRef = useRef(false);
  const firstLoadDoneRef = useRef(false);
  useEffect(() => {
    if (rowsPresent) firstLoadDoneRef.current = true;
    if (loading) sawLoadingRef.current = true;
    else if (sawLoadingRef.current) firstLoadDoneRef.current = true;
  }, [loading, rowsPresent]);
  const isLoading = loading && !rowsPresent && !firstLoadDoneRef.current;

  // Clamp out-of-range pages (hand-edited / stale shared links) once the
  // total is known and nothing is in flight — mirrors useQuerySource, so a
  // ?page=999 deep link self-heals to the last real page (and the URL is
  // rewritten) instead of showing an empty state the pager disagrees with.
  const { setPage } = state;
  useEffect(() => {
    if (loading || total <= 0) return;
    const lastPage = Math.max(1, Math.ceil(total / Math.max(limit, 1)));
    if (page > lastPage) setPage(lastPage);
  }, [loading, total, limit, page, setPage]);

  // Infinite-append accumulation: `fetchNextPage` stashes the rows already
  // on screen (plus the CURRENT `rows` prop identity) and advances the
  // page; the stashed rows alone stay on screen until the caller hands
  // back a NEW `rows` array for the advanced page, which is then appended.
  // Any base-query change (sort/filter/search/limit), a direct page jump,
  // or an error invalidates the stash, falling back to replacement.
  const baseKey = stableKey({
    limit,
    search,
    sortBy,
    sortDir,
    sortLevels,
    filters: extra,
  });
  const [stash, setStash] = useState<{
    key: string;
    page: number;
    rows: readonly TRow[];
    prevProp: readonly TRow[];
  } | null>(null);
  const appending =
    stash !== null && stash.key === baseKey && stash.page === page;
  // The advanced page's response hasn't landed while the caller still
  // passes the identical `rows` array the append started from.
  const appendPending = appending && rows === stash.prevProp;
  useEffect(() => {
    // Memory hygiene + failure recovery: a stash for a superseded base
    // query can never apply, and an errored append stops accumulating.
    if (stash !== null && (stash.key !== baseKey || error !== null)) {
      setStash(null);
    }
  }, [stash, baseKey, error]);

  const displayRows = useMemo<readonly TRow[]>(() => {
    if (!appending) return rows;
    return appendPending ? stash.rows : [...stash.rows, ...rows];
  }, [appending, appendPending, stash, rows]);

  const hasNextPage = !paged && page * limit < total;
  const fetchNextPage = useEventCallback(() => {
    if (paged || loading || appendPending || !hasNextPage) return;
    setStash({
      key: baseKey,
      page: page + 1,
      rows: displayRows,
      prevProp: rows,
    });
    setPage(page + 1);
  });

  return {
    rows: displayRows,
    total,
    page,
    limit,
    search,
    sortBy,
    sortDir,
    groupBy,
    extra,
    isLoading,
    isFetching: loading,
    isFetchingNextPage: appendPending,
    hasNextPage,
    error,
    paginationMode: resolvedMode,
    setPage: state.setPage,
    setLimit: state.setLimit,
    setSort: state.setSort,
    setGroupBy: state.setGroupBy,
    sortLevels: state.sortLevels,
    toggleSortLevel: state.toggleSortLevel,
    setSearch: state.setSearch,
    setExtra: state.setExtra,
    setExtras: state.setExtras,
    clearExtras: state.clearExtras,
    clearAll: state.clearAll,
    fetchNextPage,
    refetch: () => {
      // Re-emitting the query IS this tier's fetch mechanism — the caller
      // runs the request. Without a handler there is nothing to re-run.
      if (!onQueryChange) {
        devWarn(
          "refetch() has nothing to re-run without an `onQueryChange` handler."
        );
        return;
      }
      setGeneration((g) => g + 1);
    },
  };
}
