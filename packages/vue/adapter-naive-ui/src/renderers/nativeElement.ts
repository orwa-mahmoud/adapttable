import type { Attrs, ElementRef } from "@adapttable/vue";
import { useElementRef } from "@adapttable/vue/adapter";
import {
  type Component,
  type ComponentPublicInstance,
  defineComponent,
  h,
  shallowRef,
  type VNodeChild,
} from "vue";

import { withoutAttributes } from "../controls/attributes";
import { htmlRoot } from "../controls/elementTarget";

const NativeElement = defineComponent(
  (props: {
    readonly component: Component;
    readonly attrs: Attrs;
    readonly content: () => VNodeChild;
  }) => {
    const instance = shallowRef<ComponentPublicInstance | null>(null);
    useElementRef(
      () => (instance.value ? htmlRoot(instance.value) : null),
      () =>
        typeof props.attrs.ref === "function"
          ? (props.attrs.ref as ElementRef)
          : undefined
    );
    return () => {
      const attrs = withoutAttributes(props.attrs, ["ref"]);
      return h(
        props.component,
        { ...attrs, ref: instance },
        { default: props.content }
      );
    };
  },
  { name: "NaiveSemanticElement", props: ["component", "attrs", "content"] }
);

/** Naive primitives have one semantic root; refs resolve through public $el. */
export function naiveElement(
  component: Component,
  attrs: Attrs,
  content: () => VNodeChild = () => null
) {
  return h(NativeElement, {
    key: attrs.key as string | number | symbol | undefined,
    component,
    attrs,
    content,
  });
}
