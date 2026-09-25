/**
 * Server query snapshot. Lives in core so URL/query keys compile without React.
 */
import type { SortLevel } from "../sort/compare";
import type { ExtraFilters, SortDirection } from "../types";
import type { QueryExtensions } from "./queryContract";

/**
 * One consolidated snapshot of everything a server query needs.
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
