import type { Attrs } from "@adapttable/vue";
import { elementRef } from "@adapttable/vue/adapter";
import { ElButton } from "element-plus";
import { h, type VNode, type VNodeChild } from "vue";

import { isElementRef } from "./ref";

/** Element Plus retains the semantic native button as its root. */
export function elementButton(attrs: Attrs, content: VNodeChild): VNode {
  const { type, ref, ...rest } = attrs;
  return h(
    ElButton,
    {
      ...rest,
      ref: isElementRef(ref)
        ? elementRef(
            (element) => ref(element),
            (component) => {
              const target: unknown = component.$el;
              return target instanceof HTMLButtonElement ? target : null;
            }
          )
        : undefined,
      nativeType: type === "submit" || type === "reset" ? type : "button",
    },
    { default: () => content }
  );
}
