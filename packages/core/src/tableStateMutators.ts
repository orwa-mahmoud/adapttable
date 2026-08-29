import type { SortLevel } from "./sort/compare";
import type { QueryFilterGroup } from "./source/queryContract";
import type { ExtraFilters, FilterValue, SortDirection } from "./types";

/**
 * The state-mutator half shared by {@link TableSource} and
 * `useTableUrlState`: the same setters exist whether the state lives in
 * the URL, in memory, or behind a server query. Every mutation that
 * changes which rows are visible also resets to page 1.
 *
 * @public
 */
export interface TableStateMutators {
  /** Set the 1-based page. Page `1` is the default (dropped from the URL). */
  setPage: (next: number) => void;
  /** Set the page size; resets to page 1. */
  setLimit: (next: number) => void;
  /**
   * Set or clear the single-column sort; resets to page 1 and resets any
   * multi-sort chain back to single-sorting.
   */
  setSort: (key: string | undefined, dir?: SortDirection) => void;
  /** The multi-sort chain (empty unless multi-sort is in use). */
  sortLevels: readonly SortLevel[];
  /**
   * Cycle a column inside the multi-sort chain: absent → asc → desc →
   * removed. Appends new keys at the end; resets to page 1.
   */
  toggleSortLevel: (key: string) => void;
  /** Set or clear the committed search term; resets to page 1. */
  setSearch: (next: string) => void;
  /** Set a single extra filter; resets to page 1. */
  setExtra: (key: string, value: FilterValue) => void;
  /** Set several extra filters in one commit; resets to page 1. */
  setExtras: (updates: ExtraFilters) => void;
  /** Replace the AND/OR filter tree; resets to page 1. Omit to clear. */
  setFilterTree?: (tree: QueryFilterGroup | undefined) => void;
  /** Clear every extra filter (and reset the page) — search/sort stay. */
  clearExtras: () => void;
  /** Clear search + sort + groupBy + page + every extra filter in one commit. */
  clearAll: () => void;
  /**
   * Set or clear the row-grouping keys, comma-separated; resets to page 1.
   * Frontend tier only — server sources may carry the URL param but chrome
   * ignores grouping without `allFilteredRows`.
   */
  setGroupBy: (key: string | undefined) => void;
}
