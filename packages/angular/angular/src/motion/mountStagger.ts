/**
 * Entrance stagger for rows and cards, using the shared mount timing.
 */
import { MOUNT_STAGGER } from "@adapttable/core/binding";

/**
 * Play the shared entrance on every `[data-stagger]` descendant.
 *
 * `rows` and `mobile` are read by the caller so a new row set or a switch
 * between rows and cards runs the entrance again. They do not change the
 * timing.
 */
export function staggerMounted(request: {
  readonly root: HTMLElement | undefined;
  readonly enabled: boolean;
  readonly reduced: boolean;
  readonly rows: number;
  readonly mobile: boolean;
}): void {
  if (!request.enabled || request.reduced || !request.root) return;
  request.root
    .querySelectorAll<HTMLElement>(MOUNT_STAGGER.selector)
    .forEach((element, index) => {
      if (typeof element.animate !== "function") return;
      element.animate([...MOUNT_STAGGER.keyframes], {
        duration: MOUNT_STAGGER.durationMs,
        delay: index * MOUNT_STAGGER.stepMs,
        easing: MOUNT_STAGGER.easing,
        fill: "both",
      });
    });
}
