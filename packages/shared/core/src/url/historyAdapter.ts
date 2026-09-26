/**
 * The two `UrlStateAdapter`s the table ships with, and the rule that picks
 * one.
 *
 * {@link createHistoryAdapter} talks to the browser History API and is the
 * default. {@link createMemoryAdapter} holds the query string in memory, for
 * SSR, tests and tables with URL sync turned off. Router integrations
 * implement the same three methods — `routerUrlAdapter` builds one.
 */
import { isBrowser } from "../utils/env";
import type { UrlStateAdapter } from "./urlStateAdapter";

/**
 * Browser History-API adapter. A single instance is shared per `window`
 * (the query string is global state), so this is safe to memoise as a
 * module singleton via {@link getHistoryAdapter}.
 *
 * @returns A `UrlStateAdapter` backed by `window.history` + `popstate`.
 *
 * @public
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
 *
 * @public
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
 *
 * @public
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
 * Pick the `UrlStateAdapter` one piece of URL-synced state reads and writes.
 *
 * `enabled` is checked first and beats an explicit adapter: "not syncing"
 * means writes land in `local`, whoever supplied the adapter, so a disabled
 * state never writes to the caller's real URL. An enabled state takes the
 * explicit adapter, then the shared history adapter in a browser, and falls
 * back to `local` under SSR.
 *
 * @param adapter - Explicit adapter (router integration), if any.
 * @param enabled - Whether this state syncs to the URL at all.
 * @param local - The caller's own memory adapter, stable across calls.
 * @returns The adapter to read and write the query string through.
 *
 * @public
 */
export function resolveUrlAdapter(
  adapter: UrlStateAdapter | undefined,
  enabled: boolean,
  local: UrlStateAdapter
): UrlStateAdapter {
  if (!enabled) return local;
  if (adapter) return adapter;
  if (!isBrowser()) return local;
  return getHistoryAdapter();
}
