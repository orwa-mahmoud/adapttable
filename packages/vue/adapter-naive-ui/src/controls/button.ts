import type { Attrs } from "@adapttable/vue";
import { type ButtonProps, NButton } from "naive-ui";
import { type VNode, type VNodeChild } from "vue";

import { naiveElement } from "../renderers/nativeElement";

/** NButton's public attrType forwards the native type to its button. */
export function naiveButton(
  attrs: Attrs,
  content: VNodeChild,
  appearance: Pick<ButtonProps, "tag" | "text"> = {}
): VNode {
  const { type, ...nativeAttrs } = attrs;
  return naiveElement(
    NButton,
    {
      ...appearance,
      ...nativeAttrs,
      attrType: type === "submit" || type === "reset" ? type : "button",
      size: "small",
    },
    () => content
  );
}
