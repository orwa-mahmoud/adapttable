import { type DependencyList, type RefObject, useEffect } from "react";

import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * Tuning for the mount stagger.
 *
 * @internal
 */
export interface MountStaggerOptions {
  /** Master switch. When `false`, the hook is a no-op. */
  enabled: boolean;
  /** Per-item delay in ms. Defaults to 40. */
  step?: number;
  /** Tween duration in ms. Defaults to 320. */
  duration?: number;
}

/**
 * Dependency-free entrance stagger using the Web Animations API. Animates
 * descendants marked with `data-stagger` once on mount (and whenever
 * `deps` change), honoring `prefers-reduced-motion`. Works without GSAP;
 * GSAP fans can swap in their own hook of the same shape.
 *
 * Kit-agnostic: every adapter emits `[data-stagger]` on its row/card
 * elements and calls this from its `<DataTable>` when `animate` is on.
 *
 * @param ref - Ref to the container whose `[data-stagger]` items animate.
 * @param deps - Re-run the stagger when these change (e.g. the row set).
 * @param options - See {@link MountStaggerOptions}.
 *
 * @internal
 */
export function useMountStagger(
  ref: RefObject<HTMLElement | null>,
  deps: DependencyList,
  options: MountStaggerOptions
): void {
  const reduced = usePrefersReducedMotion();
  const { enabled, step = 40, duration = 320 } = options;
  // Collapse the caller's deps to a primitive key so the effect's dependency
  // array stays a literal (no spread) and `exhaustive-deps` can verify it.
  // Pass primitive deps (e.g. a row count), not large objects.
  const depsKey = deps.map(String).join("|");

  useEffect(() => {
    if (!enabled || reduced) return;
    const root = ref.current;
    if (!root) return;
    const items = root.querySelectorAll<HTMLElement>("[data-stagger]");
    items.forEach((el, index) => {
      if (typeof el.animate !== "function") return;
      el.animate(
        [
          { opacity: 0, transform: "translateY(8px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        {
          duration,
          delay: index * step,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "both",
        }
      );
    });
  }, [enabled, reduced, step, duration, ref, depsKey]);
}
