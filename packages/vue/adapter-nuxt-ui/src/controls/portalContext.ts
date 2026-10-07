import { computed, inject, type InjectionKey, provide } from "vue";

const portalContainer: InjectionKey<() => HTMLElement | undefined> = Symbol(
  "adapttable-nuxt-portal-container"
);

/** Project the binding's container into Nuxt's public UApp portal provider. */
export function provideNuxtPortalContainer(
  read: () => HTMLElement | undefined
) {
  const inherited = inject(portalContainer, () => undefined);
  const target = computed(() => read() ?? inherited());
  provide(portalContainer, () => target.value);
  return target;
}
