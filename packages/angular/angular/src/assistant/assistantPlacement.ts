/** Responsive placement shared with every binding, with DOM listener disposal. */
import {
  ASSISTANT_FLOATING_MIN_WIDTH,
  assistantFloatingFits,
  assistantFloatingStyle,
  assistantLauncherStyle,
  type TableAssistantBoundary,
} from "@adapttable/core/binding";
import {
  assertInInjectionContext,
  DestroyRef,
  inject,
  type Signal,
  signal,
} from "@angular/core";
export type { TableAssistantBoundary } from "@adapttable/core/binding";
export const FLOATING_MIN_WIDTH = ASSISTANT_FLOATING_MIN_WIDTH;
export const floatingFits = assistantFloatingFits;
/** Place a floating window in its requested boundary. @public */
export function floatingStyle(boundary: TableAssistantBoundary) {
  return assistantFloatingStyle(boundary !== "viewport");
}
/** Keep its launcher in the same logical corner. @public */
export function launcherStyle(boundary: TableAssistantBoundary) {
  return assistantLauncherStyle(boundary !== "viewport");
}
/** Follow width changes, even in browsers without matchMedia. @public */
export function injectAssistantFloatingFits(): Signal<boolean> {
  assertInInjectionContext(injectAssistantFloatingFits);
  const destroy = inject(DestroyRef);
  const fits = signal(
    typeof window === "undefined" || floatingFits(window.innerWidth)
  );
  if (typeof window !== "undefined") {
    const notify = () => {
      fits.set(floatingFits(window.innerWidth));
    };
    const query =
      typeof window.matchMedia === "function"
        ? window.matchMedia(`(min-width: ${String(FLOATING_MIN_WIDTH)}px)`)
        : undefined;
    if (typeof query?.addEventListener === "function") {
      query.addEventListener("change", notify);
      destroy.onDestroy(() => {
        query.removeEventListener("change", notify);
      });
    } else {
      window.addEventListener("resize", notify);
      destroy.onDestroy(() => {
        window.removeEventListener("resize", notify);
      });
    }
  }
  return fits.asReadonly();
}
