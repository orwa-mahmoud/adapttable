import {
  type Component,
  defineComponent,
  h,
  inject,
  type InjectionKey,
  provide,
  type VNodeChild,
} from "vue";

const portalContainer: InjectionKey<() => HTMLElement | undefined> = Symbol(
  "adapttable-reka-portal-container"
);

/** The kit forwards the binding's fullscreen container without owning fullscreen state. */
export function provideRekaPortalContainer(
  read: () => HTMLElement | undefined
): void {
  const inherited = inject(portalContainer, () => undefined);
  provide(portalContainer, () => read() ?? inherited());
}
const RekaPortal = defineComponent(
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
  { name: "RekaPortal", props: ["component", "to"], inheritAttrs: false }
);

export function rekaPortal(
  component: Component,
  children: () => VNodeChild,
  to?: HTMLElement | string
) {
  return h(RekaPortal, { component, to }, { default: children });
}
