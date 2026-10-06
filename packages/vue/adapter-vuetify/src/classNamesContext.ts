import type { DataTableClassNames } from "@adapttable/vue/adapter";
import { computed, inject, type InjectionKey, provide } from "vue";

const classNamesKey: InjectionKey<() => DataTableClassNames> = Symbol(
  "adapttable-vuetify-class-names"
);
export function provideClassNames(read: () => DataTableClassNames): void {
  provide(classNamesKey, read);
}
export function useClassNames() {
  const read = inject(classNamesKey, () => ({}));
  return computed(read);
}
