/**
 * How the table reads and writes the query string. Implement it to hand URL
 * state to a router; the default one talks to the browser directly.
 *
 * @public
 */
export interface UrlStateAdapter {
  /** Current query string WITHOUT the leading `"?"` (e.g. `"page=2&q=foo"`). */
  getSearch(): string;
  /**
   * Replace the query string.
   * @param search - The next query string (without `"?"`).
   * @param options - `push: true` adds a history entry; default replaces.
   */
  setSearch(search: string, options?: { push?: boolean }): void;
  /**
   * Subscribe to external changes (back/forward navigation, deep links).
   * @returns An unsubscribe function.
   */
  subscribe(onChange: () => void): () => void;
}
