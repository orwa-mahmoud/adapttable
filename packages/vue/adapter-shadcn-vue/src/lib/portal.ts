import {
  type Component,
  defineComponent,
  h,
  inject,
  type InjectionKey,
  type PropType,
  provide,
  type VNodeChild,
} from "vue";

const portalContainer: InjectionKey<() => HTMLElement | undefined> = Symbol(
  "adapttable-shadcn-portal-container"
);

/** The kit forwards the binding's fullscreen container without owning fullscreen state. */
export function provideShadcnPortalContainer(
  read: () => HTMLElement | undefined
): void {
  const inherited = inject(portalContainer, () => undefined);
  provide(portalContainer, () => read() ?? inherited());
}
export function useShadcnPortalContainer(): () => HTMLElement | undefined {
  return inject(portalContainer, () => undefined);
}
const ShadcnPortal = defineComponent(
  (
    props: {
      readonly component: Component;
      readonly to?: HTMLElement | string;
    },
    { slots }
  ) => {
    const container = inject(portalContainer, () => undefined);
    return () =>
      h(props.component, { to: props.to ?? container() ?? "body" }, slots);
  },
  {
    name: "ShadcnPortal",
    props: {
      component: { type: [Object, Function] as PropType<Component> },
      to: {
        type: [String, Object] as PropType<(HTMLElement | string) | undefined>,
      },
    },
    inheritAttrs: false,
  }
);

export function shadcnPortal(
  component: Component,
  children: () => VNodeChild,
  to?: HTMLElement | string
) {
  return h(ShadcnPortal, { component, to }, { default: children });
}
