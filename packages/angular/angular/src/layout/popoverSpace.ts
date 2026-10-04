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
  /** Include room above the origin for a native overlay that can flip. */
  readonly allowAbove?: () => boolean;
}): Signal<number> {
  const viewport = inject(DOCUMENT).defaultView;
  const height = signal(360);
  const measure = (): void => {
    const origin = options.origin();
    if (!viewport || !options.open() || !origin) return;
    const rect = origin.getBoundingClientRect();
    const below = viewport.innerHeight - rect.bottom - options.reserve;
    if (!options.allowAbove?.()) {
      height.set(Math.max(80, below));
      return;
    }
    const clamp = (edge: number) =>
      Math.max(0, Math.min(viewport.innerHeight, edge));
    height.set(
      Math.max(
        80,
        viewport.innerHeight - clamp(rect.bottom) - options.reserve,
        clamp(rect.top) - options.reserve
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
