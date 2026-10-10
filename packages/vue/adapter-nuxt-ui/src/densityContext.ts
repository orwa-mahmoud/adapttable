import type { TableDensity } from "@adapttable/vue";
import {
  computed,
  type ComputedRef,
  hasInjectionContext,
  inject,
  type InjectionKey,
  provide,
} from "vue";

const DENSITY: InjectionKey<ComputedRef<TableDensity>> = Symbol(
  "adapttable-nuxt-density"
);

export function provideNuxtDensity(read: () => TableDensity): void {
  provide(DENSITY, computed(read));
}

/** Standalone controls retain the comfortable toolkit presentation. */
export function useNuxtDensity(): ComputedRef<TableDensity> {
  return inject(
    DENSITY,
    computed(() => "comfortable")
  );
}

export function useNuxtControlSize(): ComputedRef<"sm" | "md"> {
  const density = useNuxtDensity();
  return computed(() => (density.value === "compact" ? "sm" : "md"));
}

/** Required checkbox slots are render functions rather than setup components. */
export function nuxtControlSize(): "sm" | "md" {
  const density = hasInjectionContext()
    ? inject(DENSITY, undefined)
    : undefined;
  return density?.value === "compact" ? "sm" : "md";
}
