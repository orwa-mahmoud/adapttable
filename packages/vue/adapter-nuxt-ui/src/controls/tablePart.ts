import type { Attrs } from "@adapttable/vue";
import { h, type VNode, type VNodeChild } from "vue";

import NuxtCard from "./NuxtCard.vue";
import NuxtTablePart from "./NuxtTablePart.vue";

function key(attrs: Attrs): string | number | symbol | undefined {
  const value = attrs.key;
  return typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "symbol"
    ? value
    : undefined;
}

/** These public Prose components render the corresponding native element. */
export function tablePart(
  part: "thead" | "tbody" | "tr" | "th" | "td",
  attrs: Attrs,
  children: VNodeChild = []
): VNode {
  return h(NuxtTablePart, { key: key(attrs), part, attrs }, () => children);
}

export function nuxtCard(attrs: Attrs, children: VNodeChild): VNode {
  return h(NuxtCard, { key: key(attrs), attrs }, () => children);
}
