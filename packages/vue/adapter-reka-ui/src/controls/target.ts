import type { Attrs } from "@adapttable/vue";
import { elementRef } from "@adapttable/vue/adapter";
import type { ComponentPublicInstance } from "vue";

/** Reka forwards its public $el to the primitive's semantic DOM target. */
export function rekaElement(
  component: ComponentPublicInstance
): HTMLElement | null {
  const element: unknown = component.$el;
  return typeof HTMLElement !== "undefined" && element instanceof HTMLElement
    ? element
    : null;
}

/** Preserve a Chrome DOM ref across Reka's public component boundary. */
export function targetAttrs(attrs: Attrs): Record<string, unknown> {
  const { ref, ...rest } = attrs;
  if (typeof ref !== "function") return { ...rest, ...(ref ? { ref } : {}) };
  return {
    ...rest,
    ref: elementRef((element) => ref(element), rekaElement),
  };
}
