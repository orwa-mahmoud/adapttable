import type { Attrs } from "@adapttable/vue";
import { useElementRef } from "@adapttable/vue/adapter";
import { Button } from "ant-design-vue";
import {
  type ComponentPublicInstance,
  defineComponent,
  h,
  mergeProps,
  type PropType,
  shallowRef,
  type VNode,
  type VNodeChild,
} from "vue";

import { isElementRef } from "./ref";

const AntdButton = defineComponent(
  (
    props: {
      readonly attrs: Attrs;
      readonly content: VNodeChild;
    },
    { attrs }
  ) => {
    const control = shallowRef<ComponentPublicInstance>();
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
          ([name]) => name !== "ref" && name !== "type" && name !== "text"
        )
      );
      const type = incoming.type;
      const htmlType = type === "submit" || type === "reset" ? type : "button";
      return h(
        Button,
        {
          ...nativeAttrs,
          htmlType,
          type: incoming.text === true ? "text" : undefined,
          ref: control,
        },
        { default: () => props.content }
      );
    };
  },
  {
    name: "AntdButton",
    props: {
      attrs: { type: Object as PropType<Attrs> },
      content: {
        type: [String, Number, Boolean, Array, Object] as PropType<VNodeChild>,
        default: undefined,
      },
    },
    inheritAttrs: false,
  }
);

/**
 * Ant Design Vue retains its native button; one setup scope owns its DOM ref.
 */
export function antdButton(attrs: Attrs, content: VNodeChild): VNode {
  const key = attrs.key;
  return h(AntdButton, {
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
