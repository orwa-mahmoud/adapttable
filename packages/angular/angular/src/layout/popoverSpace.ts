import { DOCUMENT } from "@angular/common";
import {
  afterRenderEffect,
  DestroyRef,
  inject,
  type Signal,
  signal,
} from "@angular/core";

/**
 * Track room below an open popover's origin. The adapter retains its native
 * positioning and chooses the space reserved for its arrow, padding and gutter.
 * No surface or control is rendered; server rendering does not access a window.
 * @public
 */
export function injectPopoverSpace(options: {
  readonly origin: () => HTMLElement | undefined;
  readonly open: () => boolean;
  readonly reserve: number;
}): Signal<number> {
  const viewport = inject(DOCUMENT).defaultView;
  const height = signal(360);
  const measure = (): void => {
    const origin = options.origin();
    if (!viewport || !options.open() || !origin) return;
    height.set(
      Math.max(
        80,
        viewport.innerHeight -
          origin.getBoundingClientRect().bottom -
          options.reserve
      )
    );
  };
  afterRenderEffect(measure);
  viewport?.addEventListener("resize", measure);
  viewport?.addEventListener("scroll", measure, true);
  inject(DestroyRef).onDestroy(() => {
    viewport?.removeEventListener("resize", measure);
    viewport?.removeEventListener("scroll", measure, true);
  });
  return height.asReadonly();
}
