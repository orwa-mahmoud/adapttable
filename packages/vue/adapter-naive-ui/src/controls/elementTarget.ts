import type { ComponentPublicInstance } from "vue";

/** Public Vue host access for Naive primitives with a single HTML root. */
export function htmlRoot(
  instance: ComponentPublicInstance
): HTMLElement | null {
  const value: unknown = instance.$el;
  return typeof HTMLElement !== "undefined" && value instanceof HTMLElement
    ? value
    : null;
}
