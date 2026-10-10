import type { Attrs, ElementRef } from "@adapttable/vue";
import { useElementRef } from "@adapttable/vue/adapter";
import {
  type Component,
  type ComponentPublicInstance,
  defineComponent,
  h,
  type PropType,
  shallowRef,
  type VNodeChild,
} from "vue";

/** Resolve only the primitive's documented public element. */
export function rekaElement(
  component: Element | ComponentPublicInstance
): HTMLElement | null {
  const element: unknown = "$el" in component ? component.$el : component;
  return typeof HTMLElement !== "undefined" && element instanceof HTMLElement
    ? element
    : null;
}

function isElementRef(value: unknown): value is ElementRef<HTMLElement> {
  return typeof value === "function";
}

/** One setup scope owns the native target and reconciles its callback owner. */
export function useTargetAttrs(attrs: () => Attrs) {
  const target = shallowRef<Element | ComponentPublicInstance | null>(null);
  useElementRef(
    () => (target.value ? rekaElement(target.value) : null),
    () => {
      const owner = attrs().ref;
      return isElementRef(owner) ? owner : undefined;
    }
  );
  const capture = (component: Element | ComponentPublicInstance | null) => {
    target.value = component;
  };
  return () => {
    const rest = { ...attrs() };
    delete rest.ref;
    return { ...rest, ref: capture };
  };
}

const RekaTarget = defineComponent(
  (
    props: { readonly component: Component; readonly targetAttrs: Attrs },
    { slots }
  ) => {
    const attrs = useTargetAttrs(() => props.targetAttrs);
    return () => h(props.component, attrs(), slots);
  },
  {
    name: "RekaTarget",
    props: {
      component: { type: [Object, Function] as PropType<Component> },
      targetAttrs: { type: Object as PropType<Attrs> },
    },
    inheritAttrs: false,
  }
);

/** A stable instance boundary for controls assembled by Chrome render slots. */
export function rekaTarget(
  component: Component,
  attrs: Attrs,
  slots?: Record<string, () => VNodeChild>
) {
  const key = attrs.key;
  return h(
    RekaTarget,
    {
      key:
        typeof key === "string" ||
        typeof key === "number" ||
        typeof key === "symbol"
          ? key
          : undefined,
      component,
      targetAttrs: attrs,
    },
    slots
  );
}
