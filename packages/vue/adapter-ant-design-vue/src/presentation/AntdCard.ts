import type { Attrs } from "@adapttable/vue";
import { useElementRef } from "@adapttable/vue/adapter";
import { Card } from "ant-design-vue";
import {
  type ComponentPublicInstance,
  type CSSProperties,
  defineComponent,
  h,
  mergeProps,
  type PropType,
  shallowRef,
} from "vue";

import { isElementRef } from "../controls/ref";

/** The actual Ant Design Vue card root remains the semantic row and measurement target. */
export const AntdCard = defineComponent(
  (
    props: { readonly attrs: Attrs; readonly bodyStyle?: CSSProperties },
    { slots, attrs }
  ) => {
    const control = shallowRef<ComponentPublicInstance>();
    useElementRef(
      () => {
        const target: unknown = control.value?.$el;
        if (target == null) return null;
        return target instanceof HTMLElement ? target : null;
      },
      () => (isElementRef(props.attrs.ref) ? props.attrs.ref : undefined)
    );
    return () => {
      const incoming = mergeProps(props.attrs, attrs);
      const nativeAttrs = Object.fromEntries(
        Object.entries(incoming).filter(([name]) => name !== "ref")
      );
      return h(
        Card,
        {
          ...mergeProps(
            { class: "adapttable-ant-design-vue-card" },
            nativeAttrs
          ),
          bodyStyle: props.bodyStyle,
          ref: control,
        },
        slots
      );
    };
  },
  {
    name: "AntdCard",
    props: {
      attrs: { type: Object as PropType<Attrs> },
      bodyStyle: { type: Object as PropType<CSSProperties | undefined> },
    },
    inheritAttrs: false,
  }
);
