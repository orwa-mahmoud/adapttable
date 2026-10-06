import type { Attrs, ElementRef } from "@adapttable/vue";
import {
  type Component,
  type ComponentPublicInstance,
  defineComponent,
  h,
  shallowRef,
  type VNodeChild,
  watch,
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
    watch(
      [
        () => props.attrs.ref,
        () => (instance.value ? htmlRoot(instance.value) : null),
      ],
      ([ref, element], _previous, cleanup) => {
        if (typeof ref !== "function" || !element) return;
        const receive = ref as ElementRef;
        receive(element);
        cleanup(() => receive(null));
      },
      { immediate: true, flush: "sync" }
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

/** Naive's table primitives have one semantic root; refs resolve through public $el. */
export function naiveElement(
  component: Component,
  attrs: Attrs,
  content: () => VNodeChild = () => null
) {
  return typeof attrs.ref === "function"
    ? h(NativeElement, {
        key: attrs.key as string | number | symbol | undefined,
        component,
        attrs,
        content,
      })
    : h(component, attrs, { default: content });
}
