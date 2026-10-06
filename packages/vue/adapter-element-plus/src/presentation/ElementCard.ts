import type { Attrs } from "@adapttable/vue";
import { useElementRef } from "@adapttable/vue/adapter";
import { type CardInstance, ElCard } from "element-plus";
import {
  type CSSProperties,
  defineComponent,
  h,
  mergeProps,
  shallowRef,
} from "vue";

import { isElementRef } from "../controls/ref";

/** The actual ElCard root remains the semantic row and measurement target. */
export const ElementCard = defineComponent(
  (
    props: { readonly attrs: Attrs; readonly bodyStyle?: CSSProperties },
    { slots, attrs }
  ) => {
    const control = shallowRef<CardInstance>();
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
        ElCard,
        {
          ...nativeAttrs,
          shadow: "never",
          bodyStyle: props.bodyStyle,
          ref: control,
        },
        slots
      );
    };
  },
  { name: "ElementCard", props: ["attrs", "bodyStyle"], inheritAttrs: false }
);
