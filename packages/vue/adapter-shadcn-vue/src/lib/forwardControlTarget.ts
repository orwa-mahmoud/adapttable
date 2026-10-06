import type { ComponentPublicInstance, VNodeRef } from "vue";

/** Reka's public $el contract exposes its real interactive root. */
export function forwardControlTarget(
  callback: ((element: Element | null) => void) | undefined
): VNodeRef | undefined {
  if (!callback) return undefined;
  return (instance: Element | ComponentPublicInstance | null): void => {
    const target: unknown =
      instance && "$el" in instance ? instance.$el : instance;
    callback(target instanceof Element ? target : null);
  };
}
