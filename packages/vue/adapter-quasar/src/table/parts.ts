import type { Attrs } from "@adapttable/vue";
import { mergeVueAttrs } from "@adapttable/vue/adapter";
import { h, type VNode, type VNodeChild } from "vue";

import QuasarNativeTarget from "./QuasarNativeTarget.vue";
import QuasarPart from "./QuasarPart.vue";

/** Public kit roots retain the exact native target supplied by the model. */
export function part(
  kind: "row" | "header" | "cell" | "card" | "section" | "separator",
  attrs: Attrs,
  content: VNodeChild = []
): VNode {
  return h(
    QuasarPart,
    {
      kind,
      attrs,
      key:
        typeof attrs.key === "string" ||
        typeof attrs.key === "number" ||
        typeof attrs.key === "symbol"
          ? attrs.key
          : undefined,
    },
    { default: () => content }
  );
}

export function paint(attrs: Attrs, name: string, className?: unknown): Attrs {
  return mergeVueAttrs(attrs, {
    "data-adapttable-part": name,
    class: className,
  });
}

/** Native semantic boundaries still own refs in setup rather than render time. */
export function nativePart(
  tag: "table" | "div" | "dd",
  attrs: Attrs,
  content: VNodeChild
) {
  return h(QuasarNativeTarget, { tag, attrs }, { default: () => content });
}
