import {
  computed,
  type ComputedRef,
  inject,
  type InjectionKey,
  provide,
} from "vue";

import type { DataTableClassNames } from "./types";
const CLASS_NAMES: InjectionKey<ComputedRef<DataTableClassNames>> = Symbol(
  "adapttable-native-classes"
);
export function provideClassNames(read: () => DataTableClassNames): void {
  provide(CLASS_NAMES, computed(read));
}
export function useClassNames(): ComputedRef<DataTableClassNames> {
  const names = inject(CLASS_NAMES);
  if (!names)
    throw new Error(
      "AdaptTable: native feature controls must render inside DataTable."
    );
  return names;
}
