import { OVERLAY_MOTION } from "@adapttable/core/binding";
import { useEffect, useState } from "react";

import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

export { OVERLAY_MOTION };

/**
 * Result of {@link useOverlayTransition}.
 *
 * @public
 */
export interface OverlayTransition {
  /**
   * Whether to render the overlay at all. Stays `true` through the exit, which
   * is the whole point: an overlay unmounted on the same tick it closes has
   * nothing left to animate.
   */
  rendered: boolean;
  /**
   * Which end of the transition the overlay is at. Drive the transform and
   * opacity from this, and expose it as `data-state` so consumers can style or
   * override the motion.
   */
  state: "open" | "closed";
}

/**
 * Turn an `open` boolean into something an overlay can animate on both edges.
 *
 * `rendered` outlives `open` by one exit, and `state` reports where in the
 * transition the overlay is. Two details make it work:
 *
 * - **Arriving needs a painted start value.** Mounting straight into the open
 *   state gives the browser nothing to transition from, so `state` holds
 *   `"closed"` for the frame after mount and flips on the next one.
 * - **Reduced motion skips both edges.** No frame delay arriving, no lingering
 *   node leaving. Nothing travels, and nothing is left in the tree waiting for
 *   a transition that will not run.
 *
 * The caller owns accessibility during the exit: while `state` is `"closed"`
 * the overlay is still in the DOM, so it must be made inert and hidden from
 * assistive technology, and focus must go back to the trigger immediately
 * rather than when the animation ends.
 *
 * @param open - Whether the overlay should be showing.
 * @param exitMs - How long the exit takes. Defaults to
 * `OVERLAY_MOTION.exitMs`; pass the real duration if the caller animates
 * for longer, or the node is removed mid-slide.
 * @returns Whether to render, and which end of the transition to render at.
 *
 * @public
 */
export function useOverlayTransition(
  open: boolean,
  exitMs: number = OVERLAY_MOTION.exitMs
): OverlayTransition {
  const reducedMotion = usePrefersReducedMotion();
  const [rendered, setRendered] = useState(open);
  const [state, setState] = useState<"open" | "closed">(
    open && reducedMotion ? "open" : "closed"
  );

  useEffect(() => {
    if (open) {
      setRendered(true);
      if (reducedMotion) {
        setState("open");
        return;
      }
      // Two frames, not one: the first lets the browser paint the closed
      // state, the second changes it. A single frame can be coalesced into
      // the same paint, and then the panel simply appears.
      let second = 0;
      const first = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => setState("open"));
      });
      return () => {
        cancelAnimationFrame(first);
        cancelAnimationFrame(second);
      };
    }

    setState("closed");
    if (reducedMotion) {
      setRendered(false);
      return;
    }
    const timer = setTimeout(() => setRendered(false), exitMs);
    return () => clearTimeout(timer);
  }, [open, reducedMotion, exitMs]);

  return { rendered, state };
}
