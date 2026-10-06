import type { Attrs } from "@adapttable/vue";
import { useElementRef } from "@adapttable/vue/adapter";
import { type ButtonInstance, ElButton } from "element-plus";
import {
  defineComponent,
  h,
  mergeProps,
  shallowRef,
  type VNode,
  type VNodeChild,
} from "vue";

import { isElementRef } from "./ref";

const ElementButton = defineComponent(
  (
    props: { readonly attrs: Attrs; readonly content: VNodeChild },
    { attrs }
  ) => {
    const control = shallowRef<ButtonInstance>();
    useElementRef(
      () => {
        const target: unknown = control.value?.$el;
        if (target == null) return null;
        return target instanceof HTMLButtonElement ? target : null;
      },
      () => (isElementRef(props.attrs.ref) ? props.attrs.ref : undefined)
    );
    return () => {
      const incoming = mergeProps(props.attrs, attrs);
      const nativeAttrs = Object.fromEntries(
        Object.entries(incoming).filter(
          ([name]) => name !== "ref" && name !== "type"
        )
      );
      const type = incoming.type;
      const nativeType =
        type === "submit" || type === "reset" ? type : "button";
      return h(
        ElButton,
        { ...nativeAttrs, nativeType, ref: control },
        { default: () => props.content }
      );
    };
  },
  { name: "ElementButton", props: ["attrs", "content"], inheritAttrs: false }
);

/** Element Plus retains its native button; one setup scope owns its DOM ref. */
export function elementButton(attrs: Attrs, content: VNodeChild): VNode {
  const key = attrs.key;
  return h(ElementButton, {
    key:
      typeof key === "string" ||
      typeof key === "number" ||
      typeof key === "symbol"
        ? key
        : undefined,
    attrs,
    content,
  });
}
