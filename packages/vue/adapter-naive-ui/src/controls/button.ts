import type { Attrs, ElementRef } from "@adapttable/vue";
import { elementRef } from "@adapttable/vue/adapter";
import { type ButtonProps, NButton } from "naive-ui";
import { h, type VNode, type VNodeChild } from "vue";

import { htmlRoot } from "./elementTarget";

/** NButton's public attrType forwards the native type to its button. */
export function naiveButton(
  attrs: Attrs,
  content: VNodeChild,
  appearance: Pick<ButtonProps, "tag" | "text"> = {}
): VNode {
  const { type, ref, ...nativeAttrs } = attrs;
  return h(
    NButton,
    {
      ...appearance,
      ...nativeAttrs,
      attrType: type === "submit" || type === "reset" ? type : "button",
      size: "small",
      ref:
        typeof ref === "function"
          ? elementRef(ref as ElementRef, htmlRoot)
          : undefined,
    },
    { default: () => content }
  );
}
