import {
  createContext,
  createElement,
  type ReactNode,
  useContext,
} from "react";

import { useMediaQuery } from "./useMediaQuery";

/** The media query that matches when the user prefers reduced motion. */
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const KitMotionOff = createContext(false);

/**
 * Marks a table whose UI library has turned motion off. Descendants that
 * call {@link usePrefersReducedMotion} then stay still, the same way they
 * do for the operating-system preference. The scope sits above the table
 * body so overlays mounted under it see the flag.
 *
 * @public
 */
export function ReducedMotionScope({
  off,
  children,
}: {
  /** When true, motion stops even if the operating system allows it. */
  off: boolean;
  children: ReactNode;
}): ReactNode {
  return createElement(KitMotionOff.Provider, { value: off }, children);
}

/**
 * Whether motion should stay off. True when the operating system requests
 * reduced motion, or when a {@link ReducedMotionScope} above this component
 * says the UI library has turned motion off.
 *
 * @returns `true` when animation and overlay motion should not run.
 *
 * @public
 */
export function usePrefersReducedMotion(): boolean {
  const kitOff = useContext(KitMotionOff);
  const os = useMediaQuery(REDUCED_MOTION_QUERY);
  return kitOff || os;
}
