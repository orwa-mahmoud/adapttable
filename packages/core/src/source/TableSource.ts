import type { TableStateMutators } from "../tableStateMutators";
import type {
  ExtraFilters,
  ResolvedPaginationMode,
  SortDirection,
} from "../types";

/**
 * The uniform contract a table consumes regardless of whether its rows
 * came from an API (`useQuerySource`) or an in-memory array
 * (`useFrontendData`). The table renders without knowing which produced
 * it — every difference between "fetched" and "filtered locally" is
 * captured here.
 *
 * @typeParam TRow - The row item type.
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
  /** Total row count across all pages (server total or full array length). */
  readonly total: number;
  /** True during the first load (no data yet). */
  readonly isLoading: boolean;
  /** True whenever a fetch is in flight (initial or background). */
  readonly isFetching: boolean;
  /** True while the next infinite page is loading. */
  readonly isFetchingNextPage: boolean;
  /** Whether another page can be loaded. */
  readonly hasNextPage: boolean;
  /** Load the next page (server fetch or in-memory slice extension). */
  fetchNextPage: () => void;
  /** The most recent error, or `null`. */
  readonly error: Error | null;
  /** Re-run the underlying query. No-op for purely in-memory sources. */
  refetch?: () => Promise<unknown> | void;
  /** The resolved pagination mode (after `"auto"` → device resolution). */
  readonly paginationMode: ResolvedPaginationMode;

  /* ── State (read) ────────────────────────────────────────────────── */
  /** Current 1-based page. */
  readonly page: number;
  /** Current page size. */
  readonly limit: number;
  /** Current committed search term. */
  readonly search: string;
  /** Active sort column key, if any. */
  readonly sortBy: string | undefined;
  /** Active sort direction, if any. */
  readonly sortDir: SortDirection | undefined;
  /** The extra-filter bag. */
  readonly extra: ExtraFilters;
  /**
   * Active single-level row-grouping column key, if any. Frontend chrome
   * builds the grouped flat model when set; server sources may echo the URL
   * param but grouping stays dormant without `allFilteredRows`.
   */
  readonly groupBy: string | undefined;

  /* State (write) is the shared {@link TableStateMutators} contract. */
}
