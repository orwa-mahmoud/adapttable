/**
 * Whether the reader asked for reduced motion, as a signal.
 */
import type { Injector, Signal } from "@angular/core";

import { injectMediaQuery } from "./mediaQuery";

/** The media query a reduced-motion preference answers. */
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * A signal that is `true` while the reader prefers reduced motion.
 *
 * @param injector - The injector to run in. Omit inside an injection context.
 * @returns The signal.
 *
 * @public
 */
export function injectPrefersReducedMotion(
  injector?: Injector
): Signal<boolean> {
  return injectMediaQuery(REDUCED_MOTION_QUERY, injector);
}
