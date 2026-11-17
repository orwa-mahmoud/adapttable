import type { Attrs } from "@adapttable/vue";
import { type ButtonProps, NButton } from "naive-ui";
import { type VNode, type VNodeChild } from "vue";

import { naiveElement } from "../renderers/nativeElement";

/** NButton's public attrType forwards the native type to its button. */
export function naiveButton(
  attrs: Attrs,
  content: VNodeChild,
  appearance: Pick<ButtonProps, "tag" | "text" | "size" | "type"> = {}
): VNode {
  const { type, ...nativeAttrs } = attrs;
  return naiveElement(
    NButton,
    {
      ...appearance,
      // Naive's synthetic focus cancels mousedown, preventing native drags
      // from both a handle and a sortable button inside a draggable header.
      nativeFocusBehavior: true,
      ...nativeAttrs,
      attrType: type === "submit" || type === "reset" ? type : "button",
      size: appearance.size ?? "small",
    },
    () => content
  );
}
