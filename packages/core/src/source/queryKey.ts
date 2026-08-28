/**
 * Cache keys for a table query.
 *
 * Wiring the table to TanStack Query or SWR means turning the emitted
 * {@link TableQuery} into a cache key, and hand-rolling that goes wrong in two
 * ways that are hard to see:
 *
 * - **The key changes when nothing did.** A key built from an object literal
 *   depends on property order and on `filters` being a new object each render,
 *   so the cache misses and the table refetches on every keystroke.
 * - **Invalidation hits too much or too little.** Refetching after a save
 *   should refresh every page of the current view, not the whole endpoint and
 *   not only the page on screen.
 *
 * {@link tableQueryKey} and {@link tableQueryBaseKey} answer both. The base key
 * covers everything that defines *which* rows — search, filters, sort,
 * grouping, page size — and the full key appends *where* in them the table is
 * — page and cursor. Since the full key starts with the base key, a library
 * that matches by prefix invalidates every page of a view with the base key
 * alone:
 *
 * ```ts
 * useInfiniteQuery({
 *   queryKey: tableQueryKey(query),
 *   queryFn: ({ signal }) => fetchPeople(query, signal),
 * });
 *
 * // after a save — every page of this view, nothing else
 * queryClient.invalidateQueries({ queryKey: tableQueryBaseKey(query) });
 * ```
 *
 * SWR takes a single string; join the key or pass it straight to `useSWR`,
 * which serialises arrays itself.
 *
 * Both are pure functions of the query. Neither library is imported here and
 * neither is a dependency — these are plain arrays that happen to be exactly
 * what both expect.
 */
import { stableKey } from "../utils/stableKey";
import type { TableQuery } from "./useServerData";

/**
 * Options for {@link tableQueryKey} and {@link tableQueryBaseKey}.
 *
 * @public
 */
export interface TableQueryKeyOptions {
  /**
   * Namespace for this table, so two tables on one page never share a cache
   * entry. Defaults to `"table"` — name it when there is more than one.
   */
  scope?: string;
}

/**
 * Position rather than identity. These belong to the full key only, so that
 * the base key can stand for every page of a view at once.
 */
const POSITION_FIELDS = new Set(["page", "cursor"]);

/** The fields that decide WHICH rows, as opposed to where in them. */
function identityOf(query: TableQuery): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(query).filter(([field]) => !POSITION_FIELDS.has(field))
  );
}

/**
 * The key for one page of a view: stable across renders, distinct per page.
 *
 * @param query - The query the table emitted.
 * @param options - See {@link TableQueryKeyOptions}.
 *
 * @public
 */
export function tableQueryKey(
  query: TableQuery,
  options: TableQueryKeyOptions = {}
): readonly unknown[] {
  return [
    ...tableQueryBaseKey(query, options),
    // A cursor identifies the page on its own; page number does when there is
    // no cursor. Both are included so neither mode has to be special-cased.
    stableKey({ page: query.page, cursor: query.cursor }),
  ];
}

/**
 * The key shared by every page of a view — what to invalidate after a write.
 *
 * @param query - The query the table emitted.
 * @param options - See {@link TableQueryKeyOptions}.
 *
 * @public
 */
export function tableQueryBaseKey(
  query: TableQuery,
  options: TableQueryKeyOptions = {}
): readonly unknown[] {
  return ["adapttable", options.scope ?? "table", stableKey(identityOf(query))];
}
