import { useEffect, useMemo, useRef, useState } from "react";

import { useEventCallback } from "../hooks/useEventCallback";
import type { SortLevel } from "../sort/compare";
import type { ExtraFilters, SortDirection } from "../types";
import {
  useTableUrlState,
  type UseTableUrlStateOptions,
} from "../url/useTableUrlState";
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
  | "adapter"
  | "enabled"
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
 * `useBackendData` tier remains for callers who want one.
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
    onQueryChange,
    ...urlOptions
  } = options;
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

  return {
    rows,
    total,
    page,
    limit,
    search,
    sortBy,
    sortDir,
    groupBy,
    extra,
    isLoading: loading && rows.length === 0,
    isFetching: loading,
    isFetchingNextPage: false,
    hasNextPage: page * limit < total,
    error,
    paginationMode: "paged",
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
    fetchNextPage: () => state.setPage(page + 1),
    refetch: () => setGeneration((g) => g + 1),
  };
}
