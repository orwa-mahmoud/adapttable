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
export function headlessElement(
  component: Element | ComponentPublicInstance
): HTMLElement | null {
  const element: unknown = "$el" in component ? component.$el : component;
  return typeof HTMLElement !== "undefined" && element instanceof HTMLElement
    ? element
    : null;
}

/**
 * Headless UI merges the handlers it is given only when each is one function,
 * and drops a list. Vue's own merge produces lists, so fold each into one.
 */
export function singleHandlers(attrs: Attrs): Attrs {
  const out: Record<string, unknown> = { ...attrs };
  for (const [name, value] of Object.entries(attrs)) {
    if (!name.startsWith("on") || !Array.isArray(value)) continue;
    const handlers = value.filter(
      (handler): handler is (...args: unknown[]) => unknown =>
        typeof handler === "function"
    );
    out[name] = (...args: unknown[]) => {
      for (const handler of handlers) handler(...args);
    };
  }
  return out;
}

function isElementRef(value: unknown): value is ElementRef<HTMLElement> {
  return typeof value === "function";
}

/** One setup scope owns the native target and reconciles its callback owner. */
export function useTargetAttrs(attrs: () => Attrs) {
  const target = shallowRef<Element | ComponentPublicInstance | null>(null);
  useElementRef(
    () => (target.value ? headlessElement(target.value) : null),
    () => {
      const owner = attrs().ref;
      return isElementRef(owner) ? owner : undefined;
    }
  );
  const capture = (component: Element | ComponentPublicInstance | null) => {
    target.value = component;
  };
  const read = () => {
    const rest: Record<string, unknown> = { ...singleHandlers(attrs()) };
    delete rest.ref;
    return { ...rest, ref: capture };
  };
  /** The native element the target currently resolves to. */
  read.element = (): HTMLElement | null =>
    target.value ? headlessElement(target.value) : null;
  return read;
}

const HeadlessTarget = defineComponent(
  (
    props: { readonly component: Component; readonly targetAttrs: Attrs },
    { slots }
  ) => {
    const attrs = useTargetAttrs(() => props.targetAttrs);
    return () => h(props.component, attrs(), slots);
  },
  {
    name: "HeadlessTarget",
    props: {
      component: { type: [Object, Function] as PropType<Component> },
      targetAttrs: { type: Object as PropType<Attrs> },
    },
    inheritAttrs: false,
  }
);

/** A stable instance boundary for controls assembled by Chrome render slots. */
export function headlessTarget(
  component: Component,
  attrs: Attrs,
  slots?: Record<string, () => VNodeChild>,
  instanceRef?: (instance: unknown) => void
) {
  const key = attrs.key;
  return h(
    HeadlessTarget,
    {
      key:
        typeof key === "string" ||
        typeof key === "number" ||
        typeof key === "symbol"
          ? key
          : undefined,
      component,
      targetAttrs: attrs,
      ref: instanceRef,
    },
    slots
  );
}
