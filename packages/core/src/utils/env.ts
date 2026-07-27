/**
 * Whether a DOM `window` is available. Returns `false` under SSR / in a
 * plain Node environment, so callers can fall back to non-DOM behaviour.
 *
 * Reads through a cast because the DOM lib types declare `window` as
 * always present, which it isn't on the server.
 *
 * @returns `true` when running in a browser-like environment.
 */
export function isBrowser(): boolean {
  return (globalThis as { window?: unknown }).window !== undefined;
}

/**
 * `localStorage` when it is actually usable, else `undefined`. The GETTER
 * itself throws a SecurityError when storage is blocked (Safari private
 * mode, sandboxed iframes, some embedded webviews), so even touching
 * `globalThis.localStorage` must be guarded.
 *
 * @returns The storage object, or `undefined` under SSR / blocked storage.
 */
export function safeLocalStorage():
  | Pick<Storage, "getItem" | "setItem" | "removeItem">
  | undefined {
  if (!isBrowser()) return undefined;
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}
