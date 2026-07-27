import { useCallback, useMemo } from "react";

import { resolvePaginationMode, useIsMobile } from "../hooks/useIsMobile";
import { sortRows, sortRowsMulti } from "../sort/compare";
import type {
  ColumnDef,
  ExtraFilters,
  PaginationMode,
  SortableValue,
} from "../types";
import {
  useTableUrlState,
  type UseTableUrlStateOptions,
} from "../url/useTableUrlState";
import { devWarn } from "../utils/devWarn";
import type { TableSource } from "./TableSource";

/** Narrows an accessor's `ReactNode` to a sortable primitive, else `null`. */
const toSortable = (value: unknown): SortableValue =>
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean"
    ? value
    : null;

/**
 * Dev-only: surface a sort that cannot resolve values (a silent no-op).
 * The most common cause is forgetting to pass `columns` to the hook.
 */
function warnUnresolvableSort<TRow>(
  sortBy: string,
  column: ColumnDef<TRow> | undefined,
  rows: readonly TRow[],
  getSortValue?: (row: TRow, columnKey: string) => SortableValue
): void {
  if (getSortValue) return;
  if (!column) {
    devWarn(
      `sortBy "${sortBy}" matches no column — pass \`columns\` (or \`getSortValue\`) to useFrontendData so client-side sorting can resolve values.`
    );
    return;
  }
  const first = rows[0];
  if (
    !column.sortValue &&
    first !== undefined &&
    toSortable(column.accessor?.(first)) === null
  ) {
    devWarn(
      `column "${sortBy}" has no sortable value — its accessor returns a non-primitive; add a \`sortValue\` extractor to the column.`
    );
  }
}

/** Options for {@link useFrontendData}. */
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
  /** Pagination mode. Defaults to `"auto"` (mobile → infinite). */
  paginationMode?: PaginationMode;
  /** Forwarded error to display (e.g. from the query that produced `data`). */
  error?: Error | null;
  /** Forwarded refetch. */
  refetch?: () => Promise<unknown> | void;
  /** Forwarded fetching flag. */
  isFetching?: boolean;
  /** Forwarded loading flag. */
  isLoading?: boolean;
  /**
   * Force the resolved mobile state instead of using a media query.
   * Primarily a testing/SSR seam.
   */
  forceMobile?: boolean;
}

/** Default searchable-text projector: flatten a row's own values. */
export function defaultSearchText<TRow>(row: TRow): string {
  if (row && typeof row === "object") {
    return Object.values(row)
      .map((v) => {
        if (v == null) return "";
        if (typeof v === "object") return JSON.stringify(v);
        return String(v as string | number | boolean);
      })
      .join(" ");
  }
  return String(row ?? "");
}

/**
 * In-memory {@link TableSource}: reads URL/local state and filters, sorts,
 * and slices a caller-supplied array. The mirror of `useQuerySource` —
 * the table cannot tell which produced it.
 *
 * @typeParam TRow - The row item type.
 * @param options - See {@link UseFrontendDataOptions}.
 * @returns A {@link TableSource} over the in-memory data.
 */
export function useFrontendData<TRow>(
  options: UseFrontendDataOptions<TRow>
): TableSource<TRow> {
  const {
    data,
    getSearchText = defaultSearchText,
    getSortValue,
    columns,
    filterFn,
    paginationMode = "auto",
    error = null,
    refetch,
    isFetching = false,
    isLoading = false,
    forceMobile,
    ...urlOptions
  } = options;

  const mediaMobile = useIsMobile();
  const isMobile = forceMobile ?? mediaMobile;
  const resolvedMode = resolvePaginationMode(paginationMode, isMobile);
  const paged = resolvedMode === "paged";

  const state = useTableUrlState(urlOptions);
  const { page, limit, search, sortBy, sortDir, groupBy } = state;

  // Project each row's searchable text ONCE per dataset — not once per row
  // per keystroke. On large arrays the projector (which may JSON.stringify
  // nested values) dominates search cost; the per-term work is then just a
  // string `includes` over this index.
  const searchIndex = useMemo(
    () => data.map((row) => getSearchText(row).toLowerCase()),
    [data, getSearchText]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const bySearch = term
      ? data.filter((_, index) => searchIndex[index]!.includes(term))
      : data;
    return filterFn
      ? bySearch.filter((row) => filterFn(row, state.extra))
      : bySearch;
  }, [data, searchIndex, search, filterFn, state.extra]);

  const sortLevels = state.sortLevels;
  const sorted = useMemo(() => {
    // Resolve a row's sort key: explicit `getSortValue`, else the column's
    // `sortValue`, else the accessor when it yields a sortable primitive — so
    // `sortable: true` works out of the box for plain string/number/boolean
    // cells while JSX accessors safely no-op.
    const resolveFor = (key: string) => {
      const column = columns?.find((c) => c.key === key);
      return (row: TRow): SortableValue =>
        getSortValue
          ? getSortValue(row, key)
          : (column?.sortValue?.(row) ?? toSortable(column?.accessor?.(row)));
    };
    // An active multi-sort chain supersedes the single sort. Resolvers are
    // hoisted per LEVEL: resolving inside the comparator cost an O(columns)
    // `find` plus a fresh closure per row per level.
    if (sortLevels.length > 0) {
      const resolvers = new Map(
        sortLevels.map((level) => [level.key, resolveFor(level.key)])
      );
      return sortRowsMulti(filtered, sortLevels, (row, key) =>
        resolvers.get(key)?.(row)
      );
    }
    if (!sortBy || !sortDir) return filtered;
    warnUnresolvableSort(
      sortBy,
      columns?.find((c) => c.key === sortBy),
      filtered,
      getSortValue
    );
    return sortRows(filtered, resolveFor(sortBy), sortDir);
  }, [filtered, sortBy, sortDir, sortLevels, getSortValue, columns]);

  const total = sorted.length;
  const lastPage = Math.max(1, Math.ceil(total / Math.max(limit, 1)));
  const safePage = Math.min(Math.max(page, 1), lastPage);

  const rows = useMemo<readonly TRow[]>(() => {
    if (paged) {
      const start = (safePage - 1) * limit;
      return sorted.slice(start, start + limit);
    }
    return sorted.slice(0, safePage * limit);
  }, [sorted, paged, safePage, limit]);

  const hasNextPage = !paged && safePage * limit < total;

  const fetchNextPage = useCallback(() => {
    if (paged || safePage * limit >= total) return;
    state.setPage(safePage + 1);
  }, [paged, safePage, limit, total, state]);

  return {
    rows,
    allFilteredRows: sorted,
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
    search,
    sortBy,
    sortDir,
    groupBy,
    extra: state.extra,
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
  };
}
