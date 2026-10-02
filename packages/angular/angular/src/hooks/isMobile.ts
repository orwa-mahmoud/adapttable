/**
 * Whether the viewport is at or below the mobile breakpoint, as a signal.
 */
import { MOBILE_BREAKPOINT_PX } from "@adapttable/core";
import {
  assertInInjectionContext,
  inject,
  Injector,
  type Signal,
} from "@angular/core";

import { injectMediaQuery } from "./mediaQuery";

/**
 * Options for {@link injectIsMobile}.
 *
 * @public
 */
export interface IsMobileOptions {
  /** The width, in pixels, at or below which the card layout takes over. */
  readonly breakpoint?: number;
  /** The injector to run in. Omit to use the current injection context. */
  readonly injector?: Injector;
}

/**
 * A signal that is `true` while the viewport is at or below the breakpoint
 * (768px unless given). Without `matchMedia` — on the server — it is `false`.
 *
 * @param options - See {@link IsMobileOptions}.
 * @returns The signal.
 *
 * @public
 */
export function injectIsMobile(options: IsMobileOptions = {}): Signal<boolean> {
  if (!options.injector) assertInInjectionContext(injectIsMobile);
  const px = options.breakpoint ?? MOBILE_BREAKPOINT_PX;
  return injectMediaQuery(
    `(max-width: ${String(px)}px)`,
    options.injector ?? inject(Injector)
  );
}
