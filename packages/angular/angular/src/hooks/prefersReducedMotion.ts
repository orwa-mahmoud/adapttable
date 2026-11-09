/**
 * Whether motion should stay off: the operating system, or a UI library
 * that turned its own animation off.
 */
import {
  assertInInjectionContext,
  computed,
  inject,
  InjectionToken,
  type Injector,
  runInInjectionContext,
  type Signal,
} from "@angular/core";

import { injectMediaQuery } from "./mediaQuery";

/** The media query a reduced-motion preference answers. */
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * A UI library's "turn motion off" switch. Provide a signal that is `true`
 * only when that library has disabled animation. An absent token, or a
 * signal that stays `false`, leaves the operating system in charge.
 * Providing `false` never turns motion back on.
 *
 * @public
 */
export const ADAPTTABLE_KIT_MOTION_OFF = new InjectionToken<Signal<boolean>>(
  "ADAPTTABLE_KIT_MOTION_OFF"
);

/**
 * A signal that is `true` while motion should stay off.
 *
 * True when the reader prefers reduced motion, or when
 * {@link ADAPTTABLE_KIT_MOTION_OFF} says the UI library turned animation off.
 *
 * @param injector - The injector to run in. Omit inside an injection context.
 * @returns The signal.
 *
 * @public
 */
export function injectPrefersReducedMotion(
  injector?: Injector
): Signal<boolean> {
  const read = (): Signal<boolean> => {
    const kitOff = inject(ADAPTTABLE_KIT_MOTION_OFF, { optional: true });
    const os = injectMediaQuery(REDUCED_MOTION_QUERY, injector);
    if (kitOff == null) return os;
    return computed(() => kitOff() || os());
  };
  if (injector) return runInInjectionContext(injector, read);
  assertInInjectionContext(injectPrefersReducedMotion);
  return read();
}
