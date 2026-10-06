import type { Attrs, ElementRef } from "@adapttable/vue";
import { onScopeDispose, watch } from "vue";

function isElementRef(value: unknown): value is ElementRef {
  return typeof value === "function";
}

/** Consume Vuetify's documented controlRef without querying or changing its DOM. */
export function useControlRef(
  element: () => HTMLElement | undefined,
  attrs: () => Attrs
): void {
  let release: (() => void) | undefined;
  watch(
    [element, () => attrs().ref],
    ([target, callback]) => {
      release?.();
      release = undefined;
      if (isElementRef(callback)) {
        callback(target ?? null);
        if (target) release = () => callback(null);
      }
    },
    { flush: "post", immediate: true }
  );
  onScopeDispose(() => release?.());
}

export function controlAttrs(attrs: Attrs): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(attrs).filter(([key]) => key !== "ref")
  );
}
