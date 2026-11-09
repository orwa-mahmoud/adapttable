/**
 * Entrance stagger for rows and cards, using the shared mount timing.
 */
import { MOUNT_STAGGER } from "@adapttable/core/binding";
import { onScopeDispose, type ShallowRef, shallowRef, watch } from "vue";

/** Per-item timing. Omitted fields use {@link MOUNT_STAGGER}. */
export interface MountStaggerOptions {
  /** Master switch. When `false`, nothing animates. */
  readonly enabled: boolean;
  /** Per-item delay in ms. Defaults to 40. */
  readonly step?: number;
  /** Tween duration in ms. Defaults to 320. */
  readonly duration?: number;
}

/**
 * Animates `[data-stagger]` descendants of `root` when `enabled` is true.
 * A no-op under `prefers-reduced-motion` and when the Web Animations API is
 * missing. Re-runs when `deps` change, after the DOM has updated.
 */
export function useMountStagger(
  root: Readonly<ShallowRef<HTMLElement | null>>,
  deps: () => readonly unknown[],
  options: () => MountStaggerOptions
): void {
  const reduced = shallowRef(false);
  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function"
  ) {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = (): void => {
      reduced.value = media.matches;
    };
    read();
    media.addEventListener("change", read);
    onScopeDispose(() => {
      media.removeEventListener("change", read);
    });
  }
  let generation = "";
  watch(
    () =>
      [
        options().enabled,
        reduced.value,
        deps().map(String).join("|"),
        root.value,
      ] as const,
    ([enabled, prefersReduced, key, element]) => {
      const marked =
        element?.querySelectorAll(MOUNT_STAGGER.selector).length ?? 0;
      const next = `${enabled}:${prefersReduced}:${key}:${marked}`;
      if (!enabled || prefersReduced) {
        generation = next;
        return;
      }
      if (!element || marked === 0 || next === generation) return;
      generation = next;
      const current = options();
      staggerMounted(element, current.step, current.duration);
    },
    { flush: "post", immediate: true }
  );
}

/** Play the shared entrance on every marked descendant. */
export function staggerMounted(
  root: ParentNode,
  step?: number,
  duration?: number
): void {
  const delayStep = step ?? MOUNT_STAGGER.stepMs;
  const tween = duration ?? MOUNT_STAGGER.durationMs;
  root
    .querySelectorAll<HTMLElement>(MOUNT_STAGGER.selector)
    .forEach((element, index) => {
      if (typeof element.animate !== "function") return;
      element.animate([...MOUNT_STAGGER.keyframes], {
        duration: tween,
        delay: index * delayStep,
        easing: MOUNT_STAGGER.easing,
        fill: "both",
      });
    });
}
