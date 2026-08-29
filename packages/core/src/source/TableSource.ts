import type { FacetMap } from "../filters/facets";
import type { TableStateMutators } from "../tableStateMutators";
import type {
  ExtraFilters,
  ResolvedPaginationMode,
  SortDirection,
} from "../types";
import type { QueryFilterGroup } from "./queryContract";
import type { QueryGroupRow } from "./queryGroups";

/**
 * The uniform contract a table consumes regardless of whether its rows
 * came from an API (`useQuerySource`) or an in-memory array
 * (`useFrontendData`). The table renders without knowing which produced
 * it — every difference between "fetched" and "filtered locally" is
 * captured here.
 *
 * @typeParam TRow - The row item type.
 *
 * @public
 */
export interface TableSource<TRow> extends TableStateMutators {
  /* ── Data ────────────────────────────────────────────────────────── */
  /** The current materialised rows for the active page/slice. */
  readonly rows: readonly TRow[];
  /**
   * Every row matching the active search/filters/sort, unpaginated.
   * Frontend sources set this; server sources typically omit it (only the
   * current page is loaded). CSV `scope: "all"` prefers this when present.
   */
  readonly allFilteredRows?: readonly TRow[];
  /**
   * Rows after search, before extra filters. Facet counts (#281) start
   * here so a checklist can exclude its own filter and still see the
   * other values. Frontend sources set this; server sources omit it.
   */
  readonly allSearchedRows?: readonly TRow[];
  /**
   * Distinct-value counts per filter key. Frontend chrome computes them
   * from `allSearchedRows` with each facet's own filter removed.
   * A server that declared `supports.facets` supplies the same shape
   * from `query.facets`.
   */
  readonly facets?: FacetMap;
  /** Total row count across all pages (server total or full array length). */
  readonly total: number;
  /**
   * True during the FIRST load only (no load has completed yet). A
   * background refresh never re-raises it — not even one that empties
   * `rows`; watch `isFetching` for those.
   */
  readonly isLoading: boolean;
  /** True whenever a fetch is in flight (initial or background). */
  readonly isFetching: boolean;
  /**
   * True while an APPEND fetch started by `fetchNextPage` is in
   * flight. Always false in paged mode.
   */
  readonly isFetchingNextPage: boolean;
  /**
   * Whether `fetchNextPage` can append more rows. Infinite mode
   * only — always false in paged mode, where navigation is `setPage`.
   */
  readonly hasNextPage: boolean;
  /**
   * Append the next page's rows to those on screen (server fetch or
   * in-memory slice extension). No-op in paged mode, while an append is
   * already in flight, or when the data is exhausted.
   */
  fetchNextPage: () => void;
  /** The most recent error, or `null`. */
  readonly error: Error | null;
  /** Re-run the underlying fetch. No-op for purely in-memory sources. */
  refetch?: () => Promise<unknown> | void;
  /** The resolved pagination mode (after `"auto"` → device resolution). */
  readonly paginationMode: ResolvedPaginationMode;

  /* ── State (read) ────────────────────────────────────────────────── */
  /** Current 1-based page. */
  readonly page: number;
  /** Current page size. */
  readonly limit: number;
  /**
   * Page size applied when the URL has no `limit` param (`defaults.limit`,
   * or 25). The rows-per-page list keeps this value after the user picks
   * another size, so a table that starts at 500 can return to 500.
   */
  readonly defaultLimit: number;
  /** Current committed search term. */
  readonly search: string;
  /** Active sort column key, if any. */
  readonly sortBy: string | undefined;
  /** Active sort direction, if any. */
  readonly sortDir: SortDirection | undefined;
  /** The extra-filter bag. */
  readonly extra: ExtraFilters;
  /** Nested AND/OR filter tree, when one is active. */
  readonly filterTree?: QueryFilterGroup;
  /**
   * Active row-grouping keys, comma-separated, if any. Frontend chrome
   * builds the grouped flat model when set; server sources may echo the URL
   * param but grouping stays dormant without `allFilteredRows`.
   */
  readonly groupBy: string | undefined;
  /**
   * Groups the SERVER computed, when it answered `query.groupBy` itself.
   * Present only on a server tier that declared `supports.grouping`; the table
   * then renders these instead of grouping the page it holds, which it could
   * not do correctly anyway with one page of the data.
   */
  readonly groups?: readonly QueryGroupRow<TRow>[];

  /* State (write) is the shared {@link TableStateMutators} contract. */
}
