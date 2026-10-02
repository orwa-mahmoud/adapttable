/**
 * Whether a CSS media query matches, as a signal that follows the viewport.
 */
import {
  assertInInjectionContext,
  DestroyRef,
  inject,
  Injector,
  type Signal,
  signal,
} from "@angular/core";

import { onBrowser } from "./platform";

/**
 * A signal that is `true` while the media query matches. On the server, or
 * without `matchMedia`, it is `false`.
 *
 * @param query - The media query, e.g. `(max-width: 768px)`.
 * @param injector - The injector to run in. Omit inside an injection context.
 * @returns The signal.
 *
 * @public
 */
export function injectMediaQuery(
  query: string,
  injector?: Injector
): Signal<boolean> {
  if (!injector) assertInInjectionContext(injectMediaQuery);
  const context = injector ?? inject(Injector);
  if (!onBrowser(context) || typeof globalThis.matchMedia !== "function") {
    return signal(false).asReadonly();
  }
  const list = globalThis.matchMedia(query);
  const matches = signal(list.matches);
  const onChange = (event: MediaQueryListEvent): void => {
    matches.set(event.matches);
  };
  list.addEventListener("change", onChange);
  context.get(DestroyRef).onDestroy(() => {
    list.removeEventListener("change", onChange);
  });
  return matches.asReadonly();
}
