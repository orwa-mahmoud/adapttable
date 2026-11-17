/** Hand one element to several refs. */
import type { Ref, RefCallback } from "react";

/**
 * One ref callback that hands the element to every ref given, so a kit
 * control can take a ref from its overlay and the binding's `elementRef`.
 *
 * @param refs - The refs to fill; absent ones are skipped.
 * @returns The combined ref callback.
 *
 * @public
 */
export function mergeRefs<T>(
  ...refs: readonly (Ref<T> | undefined)[]
): RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as { current: T | null }).current = node;
    }
  };
}
