import { useMediaQuery } from "./useMediaQuery";

/** The media query that matches when the user prefers reduced motion. */
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Whether the user has requested reduced motion. Animation hooks gate on
 * this so AdaptTable never animates against an accessibility preference.
 *
 * @returns `true` when the user prefers reduced motion.
 *
 * @internal
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery(REDUCED_MOTION_QUERY);
}
