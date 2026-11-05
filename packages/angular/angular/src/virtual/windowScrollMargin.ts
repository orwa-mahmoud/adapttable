/**
 * Keep a window virtualizer's scroll margin equal to where the list starts on
 * the page, so a table offset down the page windows the rows actually in view.
 */
import { measureWindowScrollMargin } from "@adapttable/core/binding";
import {
  assertInInjectionContext,
  effect,
  inject,
  Injector,
  type Signal,
  signal,
  untracked,
} from "@angular/core";

import { onBrowser } from "../hooks/platform";
import { type MaybeSignal, readMaybe } from "../store";

export {
  documentOffsetTop,
  measureWindowScrollMargin,
  virtualListElement,
} from "@adapttable/core/binding";

/**
 * Options for {@link injectMeasuredWindowScrollMargin}.
 *
 * @public
 */
export interface MeasuredWindowScrollMarginOptions {
  /** Measure only while the page is the scroller. */
  readonly enabled: MaybeSignal<boolean>;
  /**
   * The table root or scroll box: any ancestor of the `tbody` or card list.
   * Read as a signal, so the margin follows the element once it renders.
   */
  readonly element: () => Element | null;
  /** The injector whose lifetime the measurement follows. */
  readonly injector?: Injector;
}

/**
 * The list's document offset, re-read whenever the element or the page
 * resizes.
 *
 * @param options - See {@link MeasuredWindowScrollMarginOptions}.
 * @returns The scroll margin in pixels; `0` while disabled.
 *
 * @public
 */
export function injectMeasuredWindowScrollMargin(
  options: MeasuredWindowScrollMarginOptions
): Signal<number> {
  if (!options.injector) {
    assertInInjectionContext(injectMeasuredWindowScrollMargin);
  }
  const injector = options.injector ?? inject(Injector);
  const margin = signal(0);
  effect(
    (onCleanup) => {
      const element = options.element();
      if (
        !readMaybe(options.enabled) ||
        element === null ||
        !onBrowser(injector)
      ) {
        margin.set(0);
        return;
      }
      const read = (): void => {
        const next = measureWindowScrollMargin(element);
        if (next !== untracked(margin)) margin.set(next);
      };
      read();
      if (typeof ResizeObserver === "undefined") return;
      const observer = new ResizeObserver(read);
      observer.observe(element);
      observer.observe(document.documentElement);
      globalThis.addEventListener("resize", read);
      onCleanup(() => {
        observer.disconnect();
        globalThis.removeEventListener("resize", read);
      });
    },
    { injector }
  );
  return margin.asReadonly();
}
