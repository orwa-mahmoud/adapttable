import { useCallback, useEffect, useRef } from "react";

/**
 * Wrap a callback in a stable identity that always invokes the latest
 * render's version — the ref-latch pattern (a ref updated in an effect,
 * read inside the callback). Effects can call fresh props and state
 * through it without re-running when the caller passes a new closure
 * every render.
 *
 * Works across the full declared React peer range (`^18 || ^19`), unlike
 * `useEffectEvent`, which is only stable from React 19.2. The latch
 * updates in a passive effect, so the returned function is only safe to
 * call from effects that run after it — never during render.
 *
 * @typeParam TArgs - The callback's argument tuple.
 * @typeParam TReturn - The callback's return type.
 * @param callback - The callback to latch; may be a fresh closure each render.
 * @returns A stable function that always calls the latest `callback`.
 */
export function useEventCallback<TArgs extends readonly unknown[], TReturn>(
  callback: (...args: TArgs) => TReturn
): (...args: TArgs) => TReturn {
  const latest = useRef(callback);
  useEffect(() => {
    latest.current = callback;
  });
  return useCallback((...args: TArgs) => latest.current(...args), []);
}
