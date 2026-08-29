import { useEffect, useMemo, useRef, useState } from "react";

import type { FacetMap } from "../filters/facets";
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
import {
  applyQuerySupport,
  type QueryExtensions,
  type QuerySupport,
} from "./queryContract";
import type { TableSource } from "./TableSource";

/**
 * One consolidated snapshot of everything a server query needs.
 *
 * The fields below the baseline come from {@link QueryExtensions} and are all
 * optional: a source receives one only after declaring it can answer it
 * (`supports`), so an endpoint written before a capability existed keeps
 * receiving exactly the query it was written against.
 *
 * @public
 */
export interface TableQuery extends QueryExtensions {
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

/**
 * Options for `useServerData`.
 *
 * @public
 */
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
  /**
   * Cursor pagination: the token the last response returned for the page
   * after the one on screen, or `null` when that was the last page.
   *
   * Only read when the source declares `supports.cursor`. With it, position
   * comes from the token rather than an offset, so rows that shift while the
   * user reads never duplicate or skip an entry — the failure mode
   * offset-based paging cannot avoid.
   *
   * A cursor is opaque, so the table only ever hands back one the server
   * gave it. That makes "next" always possible, "back" possible for pages
   * already visited, and a jump to an arbitrary unvisited page impossible —
   * the honest shape of cursor pagination, not a limitation to work around.
   */
  nextCursor?: string | null;
  /** Whether a request is currently in flight. */
  loading?: boolean;
  /** Forwarded error to display. */
  error?: Error | null;
  /** Pagination mode. Defaults to `"auto"` (mobile → infinite). */
  paginationMode?: PaginationMode;
  /** Force the resolved mobile state instead of a media query (test/SSR seam). */
  forceMobile?: boolean;
  /**
   * What this endpoint can answer beyond the baseline query. Declare a
   * capability and the matching field starts arriving in `onQueryChange`;
   * leave it out and the field is never sent, with a development warning if
   * the UI wanted it. See {@link QuerySupport}.
   */
  supports?: QuerySupport;
  /**
   * The tree nodes the reader has open, when the hierarchy lives on the server.
   * Sent as `query.expandedIds` only if the source declares
   * `supports: { tree: true }`, so the response can carry the children of every
   * open branch alongside the page. Hold the same array in the table's
   * `expandedIds` and one piece of state drives both.
   */
  expandedIds?: readonly string[];
  /**
   * Filter keys to ask the server for distinct-value counts. Sent as
   * `query.facets` only when `supports.facets` is set.
   */
  facetKeys?: readonly string[];
  /**
   * Distinct-value counts from the last fetch. Surfaces on the source
   * so a checklist can render without holding the full result set.
   */
  facets?: FacetMap;
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
 *
 * @public
 */
export function useServerData<TRow>(
  options: UseServerDataOptions<TRow>
): TableSource<TRow> {
  const {
    rows,
    total,
    nextCursor = null,
    loading = false,
    error = null,
    paginationMode = "auto",
    forceMobile,
    supports,
    expandedIds,
    facetKeys,
    facets,
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

  // Cursor mode keeps every token the server has handed out, indexed by the
  // page it opens: `cursors[0]` is always `undefined` (page 1 needs no token)
  // and `cursors[n]` is the token for page n+1. Keeping the trail rather than
  // just the latest token is what lets the user page back through what they
  // have already seen, which a single "next cursor" cannot do.
  const cursorMode = supports?.cursor === true;
  const [cursors, setCursors] = useState<readonly (string | undefined)[]>([
    undefined,
  ]);
  const cursor = cursorMode ? cursors[page - 1] : undefined;

  const query = useMemo<TableQuery>(
    () => ({
      page,
      limit,
      search,
      sortBy,
      sortDir,
      sortLevels,
      filters: extra,
      // Everything past the baseline is gated on what the source declared —
      // an undeclared capability is dropped here, never sent and ignored.
      ...applyQuerySupport(
        {
          groupBy: groupBy ? [groupBy] : undefined,
          cursor,
          expandedIds,
          filterTree: state.filterTree,
          facets: facetKeys,
        },
        supports
      ),
    }),
    [
      page,
      limit,
      search,
      sortBy,
      sortDir,
      sortLevels,
      extra,
      groupBy,
      cursor,
      supports,
      expandedIds,
      state.filterTree,
      facetKeys,
    ]
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
    // Cursor mode has no offset arithmetic to clamp against — a page is
    // reachable only if its token is already in hand, which the trail below
    // enforces directly.
    if (cursorMode || loading || total <= 0) return;
    const lastPage = Math.max(1, Math.ceil(total / Math.max(limit, 1)));
    if (page > lastPage) setPage(lastPage);
  }, [cursorMode, loading, total, limit, page, setPage]);

  // Record the token for the page after the one on screen, so "next" has
  // something to send and a later "back" can retrace the trail.
  useEffect(() => {
    if (!cursorMode || loading || nextCursor === null) return;
    setCursors((prev) => {
      if (prev[page] === nextCursor) return prev;
      const next = prev.slice();
      next[page] = nextCursor;
      return next;
    });
  }, [cursorMode, loading, nextCursor, page]);

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

  // A new sort, filter, search or page size makes every token the server
  // issued meaningless — they describe a position in a result set that no
  // longer exists. Drop the trail and start again from page 1.
  const cursorBaseRef = useRef(baseKey);
  useEffect(() => {
    if (!cursorMode || cursorBaseRef.current === baseKey) return;
    cursorBaseRef.current = baseKey;
    setCursors([undefined]);
    setPage(1);
  }, [cursorMode, baseKey, setPage]);

  const displayRows = useMemo<readonly TRow[]>(() => {
    if (!appending) return rows;
    return appendPending ? stash.rows : [...stash.rows, ...rows];
  }, [appending, appendPending, stash, rows]);

  // Offset mode knows the end from the count; cursor mode only knows there
  // is more because the server said so by returning another token.
  const moreToLoad = cursorMode
    ? cursors[page] !== undefined
    : page * limit < total;
  const hasNextPage = !paged && moreToLoad;
  // Without a token a page cannot be requested at all, so in cursor mode
  // navigation is limited to pages already visited plus the next one. A pager
  // click beyond that is ignored rather than silently re-serving page 1,
  // which is what sending an absent cursor would do.
  const setPageSafely = useEventCallback((next: number) => {
    if (cursorMode && next > cursors.length) return;
    setPage(next);
  });

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
    defaultLimit: state.defaultLimit,
    search,
    sortBy,
    sortDir,
    groupBy,
    extra,
    facets,
    filterTree: state.filterTree,
    isLoading,
    isFetching: loading,
    isFetchingNextPage: appendPending,
    hasNextPage,
    error,
    paginationMode: resolvedMode,
    setPage: setPageSafely,
    setLimit: state.setLimit,
    setSort: state.setSort,
    setGroupBy: state.setGroupBy,
    sortLevels: state.sortLevels,
    toggleSortLevel: state.toggleSortLevel,
    setSearch: state.setSearch,
    setExtra: state.setExtra,
    setExtras: state.setExtras,
    setFilterTree: state.setFilterTree,
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
