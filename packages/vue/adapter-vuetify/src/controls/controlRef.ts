import type { Attrs, ElementRef } from "@adapttable/vue";
import { useElementRef } from "@adapttable/vue/adapter";

function isElementRef(value: unknown): value is ElementRef {
  return typeof value === "function";
}

/** Consume Vuetify's documented controlRef without querying or changing its DOM. */
export function useControlRef(
  element: () => HTMLElement | undefined,
  attrs: () => Attrs
): void {
  useElementRef(element, () => {
    const callback = attrs().ref;
    return isElementRef(callback) ? callback : undefined;
  });
}

export function controlAttrs(attrs: Attrs): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(attrs).filter(([key]) => key !== "ref")
  );
}

/** v-model owns value updates; legacy native listeners must not request twice. */
export function valueControlAttrs(attrs: Attrs): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(attrs).filter(
      ([key]) =>
        key !== "ref" &&
        key !== "value" &&
        key !== "onInput" &&
        key !== "onChange"
    )
  );
}
