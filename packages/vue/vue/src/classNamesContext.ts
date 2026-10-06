import {
  computed,
  type ComputedRef,
  inject,
  type InjectionKey,
  provide,
} from "vue";

import type { DataTableClassNames } from "./tableAdapterContracts";
const CLASS_NAMES: InjectionKey<ComputedRef<DataTableClassNames>> = Symbol(
  "adapttable-native-classes"
);
export function provideDataTableClassNames(
  read: () => DataTableClassNames
): void {
  provide(CLASS_NAMES, computed(read));
}
export function useDataTableClassNames(): ComputedRef<DataTableClassNames> {
  const names = inject(CLASS_NAMES);
  if (!names)
    throw new Error(
      "AdaptTable: native feature controls must render inside DataTable."
    );
  return names;
}
