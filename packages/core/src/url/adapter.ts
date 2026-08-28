/**
 * The injectable seam that decouples AdaptTable's URL-synced state from
 * any particular router. A `UrlStateAdapter` is a tiny store over the
 * current query string; the table reads it via `useSyncExternalStore`
 * and writes through it.
 *
 * Core ships two implementations — {@link createHistoryAdapter} (browser
 * History API, the default) and {@link createMemoryAdapter} (in-memory,
 * for SSR/tests/URL-sync-disabled). Framework adapters (react-router,
 * Next.js) implement the same three methods.
 */
import { useRef } from "react";

import { isBrowser } from "../utils/env";

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

/**
 * Browser History-API adapter. A single instance is shared per `window`
 * (the query string is global state), so this is safe to memoise as a
 * module singleton via {@link getHistoryAdapter}.
 *
 * @returns A `UrlStateAdapter` backed by `window.history` + `popstate`.
 */
export function createHistoryAdapter(): UrlStateAdapter {
  const listeners = new Set<() => void>();

  const notify = (): void => {
    for (const listener of listeners) listener();
  };

  return {
    getSearch() {
      return globalThis.location.search.replace(/^\?/, "");
    },
    setSearch(search, options) {
      const { location, history } = globalThis;
      const url =
        location.pathname + (search ? `?${search}` : "") + location.hash;
      if (options?.push) {
        history.pushState(null, "", url);
      } else {
        history.replaceState(null, "", url);
      }
      notify();
    },
    subscribe(onChange) {
      if (listeners.size === 0) {
        globalThis.addEventListener("popstate", notify);
      }
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
        if (listeners.size === 0) {
          globalThis.removeEventListener("popstate", notify);
        }
      };
    },
  };
}

/**
 * In-memory adapter. Holds the query string in a closure with its own
 * subscriber set — used for SSR, tests, and when URL sync is disabled
 * (the table still gets fully working local state).
 *
 * @param initialSearch - Optional starting query string (without `"?"`).
 * @returns A self-contained `UrlStateAdapter`.
 */
export function createMemoryAdapter(initialSearch = ""): UrlStateAdapter {
  let current = initialSearch.replace(/^\?/, "");
  const listeners = new Set<() => void>();

  return {
    getSearch() {
      return current;
    },
    setSearch(search) {
      current = search;
      for (const listener of listeners) listener();
    },
    subscribe(onChange) {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
  };
}

let historySingleton: UrlStateAdapter | undefined;

/**
 * Lazily create and reuse one History-API adapter per runtime. Returns a
 * fresh memory adapter when there is no `window` (SSR).
 *
 * @returns The shared history adapter, or a memory adapter under SSR.
 */
export function getHistoryAdapter(): UrlStateAdapter {
  if (!isBrowser()) {
    return createMemoryAdapter();
  }
  historySingleton ??= createHistoryAdapter();
  return historySingleton;
}

/**
 * Reset the cached history singleton. Test-only seam so suites don't leak
 * adapter state across cases.
 *
 * @internal
 */
export function resetHistoryAdapter(): void {
  historySingleton = undefined;
}

/**
 * Resolve which `UrlStateAdapter` a URL-synced hook should use: an
 * explicit `adapter` wins; otherwise the shared history adapter in the
 * browser, or a stable per-hook memory adapter when disabled or under SSR.
 *
 * @param adapter - Optional explicit adapter (router integration).
 * @param enabled - When false, always use the local memory adapter.
 * @returns The adapter to read/write the query string through.
 */
export function useResolvedAdapter(
  adapter: UrlStateAdapter | undefined,
  enabled: boolean
): UrlStateAdapter {
  // A per-hook memory adapter, created once, used when disabled or SSR.
  const memoryRef = useRef<UrlStateAdapter | null>(null);
  memoryRef.current ??= createMemoryAdapter();

  // `enabled` is checked FIRST and beats an explicit adapter: "not syncing"
  // has to mean writes land in memory, whoever supplied the adapter. With the
  // checks the other way round a disabled hook kept writing to the caller's
  // real adapter, and every disabled hook sharing one adapter also collided
  // in the namespace registry — which made a single table warn about itself.
  if (!enabled) return memoryRef.current;
  if (adapter) return adapter;
  if (!isBrowser()) return memoryRef.current;
  return getHistoryAdapter();
}
