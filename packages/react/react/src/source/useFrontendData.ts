import {
  createFrontendSource,
  type ExtraFilters,
  type FrontendSource,
  type PaginationMode,
  type QueryFilterGroup,
  resolvePaginationMode,
  type SortableValue,
  type TableSource,
} from "@adapttable/core";
import { useCallback, useLayoutEffect, useState } from "react";

import type { ColumnDef } from "../columnDef";
import { useIsMobile } from "../hooks/useIsMobile";
import {
  useTableUrlState,
  type UseTableUrlStateOptions,
} from "../url/useTableUrlState";

export { defaultFrontendRowId, defaultSearchText } from "@adapttable/core";

/**
 * Options for {@link useFrontendData}.
 *
 * @public
 */
export interface UseFrontendDataOptions<TRow> extends Pick<
  UseTableUrlStateOptions,
  | "urlAdapter"
  | "urlSync"
  | "defaults"
  | "numberExtraKeys"
  | "arrayExtraKeys"
  | "urlKey"
> {
  /** The source array. Filtered / sorted / sliced internally by state. */
  data: readonly TRow[];
  /**
   * How a row's id is derived — the same function {@link applyRowPatches}
   * used. Defaults to `String(row.id)` when the row has an `id`.
   */
  getRowId?: (row: TRow) => string;
  /**
   * Project a row to its searchable text. Defaults to a flatten of the
   * row's own values; override to reach nested fields.
   */
  getSearchText?: (row: TRow) => string;
  /**
   * Resolve a row's sort value for a column key. Falls back to the
   * matching column's `sortValue`.
   */
  getSortValue?: (row: TRow, columnKey: string) => SortableValue;
  /** Columns — read for per-column `sortValue` when sorting. */
  columns?: readonly ColumnDef<TRow>[];
  /**
   * Client-side filter predicate applied after search. Receives the active
   * `extra` filter bag (driven by the filter drawer's `setExtra` calls), so a
   * filter UI filters the rows with no extra wiring. Omit for no filtering.
   */
  filterFn?: (row: TRow, extra: ExtraFilters) => boolean;
  /**
   * Evaluate the URL's AND/OR filter tree against a row. Omit and the
   * tree is stored but not applied (server tiers send it instead).
   */
  filterTreeFn?: (row: TRow, tree: QueryFilterGroup) => boolean;
  /** Re-evaluate unchanged rows when the filter predicates' meaning changes. */
  filterKey?: string | number;
  /** Pagination mode. Defaults to `"auto"` (mobile → infinite). */
  paginationMode?: PaginationMode;
  /** Forwarded error to display (e.g. from a query that produced `data`). */
  error?: Error | null;
  /** Forwarded refetch. */
  refetch?: () => Promise<unknown> | void;
  /** Forwarded fetching flag. */
  isFetching?: boolean;
  /** Forwarded loading flag. */
  isLoading?: boolean;
  /**
   * Active locale tag. Sorting reads each column's `i18n` path for it, the
   * same path its cells and filters read.
   */
  locale?: string;
  /**
   * Force the resolved mobile state instead of using a media query.
   * Primarily a testing/SSR seam.
   */
  forceMobile?: boolean;
  /**
   * The width, in pixels, at or below which `paginationMode="auto"` resolves
   * to infinite scroll. Defaults to 768. Pass the table's `mobileBreakpoint`
   * so the mode follows the same rule as the card layout.
   */
  mobileBreakpoint?: number;
}

/**
 * In-memory {@link TableSource}: reads URL/local state and filters, sorts,
 * and slices a caller-supplied array. The mirror of `useQuerySource` —
 * the table cannot tell which produced it.
 *
 * A {@link rowPatchLog} on `data` continues the live {@link IncrementalView}
 * so only touched rows re-run search, filters and sort. Spreading the
 * patched array drops the log and falls back to a full rebuild.
 *
 * @typeParam TRow - The row item type.
 * @param options - See {@link UseFrontendDataOptions}.
 * @returns A {@link TableSource} over the in-memory data.
 *
 * @public
 */
export function useFrontendData<TRow>(
  options: UseFrontendDataOptions<TRow>
): TableSource<TRow> {
  // The source is mutable and must see every render's inputs, and the base
  // bundle carries this hook: the compiler's cache would skip updates and add
  // weight without adding hits.
  "use no memo";
  const {
    data,
    getRowId,
    getSearchText,
    getSortValue,
    columns,
    filterFn,
    filterTreeFn,
    filterKey,
    paginationMode = "auto",
    error = null,
    refetch,
    isFetching = false,
    isLoading = false,
    forceMobile,
    mobileBreakpoint,
    locale,
    ...urlOptions
  } = options;

  const mediaMobile = useIsMobile(mobileBreakpoint);
  const isMobile = forceMobile ?? mediaMobile;
  const resolvedMode = resolvePaginationMode(paginationMode, isMobile);

  const state = useTableUrlState(urlOptions);
  const { limit, search, sortBy, sortDir, groupBy } = state;

  const [source] = useState<FrontendSource<TRow>>(createFrontendSource);
  // The frame is read from the engine's candidate; the committed engine — the
  // one an agent or a second component holds — stays on the table that is on
  // screen until React accepts this render, which is where it is published.
  const frame = source.update(
    {
      data,
      getRowId,
      getSearchText,
      getSortValue,
      columns,
      filterFn,
      filterTreeFn,
      filterKey,
      locale,
      paginationMode: resolvedMode,
    },
    state
  );
  useLayoutEffect(() => {
    source.commit();
  });

  const { page: safePage, total, hasNextPage } = frame;
  const fetchNextPage = useCallback(() => {
    if (hasNextPage) state.setPage(safePage + 1);
  }, [hasNextPage, safePage, state]);

  return {
    rows: frame.rows,
    allFilteredRows: frame.allFilteredRows,
    allSearchedRows: frame.allSearchedRows,
    total,
    isLoading,
    isFetching,
    isFetchingNextPage: false,
    hasNextPage,
    fetchNextPage,
    error,
    refetch,
    paginationMode: resolvedMode,
    page: safePage,
    limit,
    defaultLimit: state.defaultLimit,
    search,
    sortBy,
    sortDir,
    groupBy,
    groupAggregateOverrides: state.groupAggregateOverrides,
    extra: state.extra,
    filterTree: state.filterTree,
    setPage: state.setPage,
    setLimit: state.setLimit,
    setSort: state.setSort,
    setGroupBy: state.setGroupBy,
    initializeGroupBy: state.initializeGroupBy,
    setGroupAggregateOverrides: state.setGroupAggregateOverrides,
    sortLevels: state.sortLevels,
    toggleSortLevel: state.toggleSortLevel,
    setSearch: state.setSearch,
    setExtra: state.setExtra,
    setExtras: state.setExtras,
    setFilterTree: state.setFilterTree,
    clearExtras: state.clearExtras,
    clearAll: state.clearAll,
    tableEngine: source.engine,
  };
}
