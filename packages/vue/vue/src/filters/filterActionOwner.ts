import type { FilterDef, FilterFormSource } from "@adapttable/core";
import { computed, type MaybeRefOrGetter, toValue, watch } from "vue";

import { useScopeActivity } from "../store";
/** Retained field controls follow the current writer, but never another field or owner. */
export function useFilterActionOwner<TRow>(
  definition: MaybeRefOrGetter<FilterDef<TRow>>,
  input: MaybeRefOrGetter<
    Omit<FilterFormSource<TRow>, "setExtras"> &
      Partial<Pick<FilterFormSource<TRow>, "setExtras">>
  >
) {
  const active = useScopeActivity();
  let revision = 0;
  watch(
    () => [toValue(definition).key, toValue(definition).type],
    (next, previous) => {
      if (next.some((value, index) => value !== previous[index])) revision++;
    },
    { flush: "sync" }
  );
  return computed(() => {
    const current = revision;
    const key = toValue(definition).key;
    const type = toValue(definition).type;
    const allowed = () =>
      active.value &&
      current === revision &&
      toValue(definition).key === key &&
      toValue(definition).type === type;
    const source: FilterFormSource<TRow> = {
      ...toValue(input),
      setExtra: (name, value) => {
        if (allowed()) toValue(input).setExtra(name, value);
      },
      setExtras: (patch) => {
        if (allowed()) toValue(input).setExtras?.(patch);
      },
    };
    return { source, allowed };
  });
}
