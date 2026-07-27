import { useCallback, useSyncExternalStore } from "react";

/**
 * One `MediaQueryList` per (matchMedia implementation, query) pair.
 * `getSnapshot` runs on EVERY render of every subscriber, and
 * `matchMedia(query)` constructs a fresh list each call — caching turns
 * that hot path into a map lookup. Keyed by the implementation (WeakMap)
 * so tests that stub `matchMedia` never read a stale cache.
 */
const mqlCacheByImpl = new WeakMap<
  typeof globalThis.matchMedia,
  Map<string, MediaQueryList>
>();

function cachedMatchMedia(query: string): MediaQueryList | null {
  const impl = globalThis.matchMedia as
    | typeof globalThis.matchMedia
    | undefined;
  if (typeof impl !== "function") return null;
  let cache = mqlCacheByImpl.get(impl);
  if (!cache) {
    cache = new Map();
    mqlCacheByImpl.set(impl, cache);
  }
  let mql = cache.get(query);
  if (!mql) {
    mql = impl(query);
    cache.set(query, mql);
  }
  return mql;
}

/**
 * SSR-safe `matchMedia` hook built on `useSyncExternalStore`. Returns
 * `false` on the server and before hydration, then the live match.
 *
 * @param query - A CSS media query string, e.g. `"(max-width: 768px)"`.
 * @param defaultValue - Value used when `matchMedia` is unavailable (SSR).
 * @returns Whether the query currently matches.
 */
export function useMediaQuery(query: string, defaultValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = cachedMatchMedia(query);
      if (!mql) return () => undefined;
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query]
  );

  const getSnapshot = useCallback(() => {
    const mql = cachedMatchMedia(query);
    return mql ? mql.matches : defaultValue;
  }, [query, defaultValue]);

  const getServerSnapshot = useCallback(() => defaultValue, [defaultValue]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
