/** Vue ownership around core's controllable id store. */
import { createControllableStore } from "@adapttable/core";
import {
  computed,
  type MaybeRefOrGetter,
  onScopeDispose,
  toValue,
  watch,
} from "vue";

import {
  type MaybeRefOrGetterOptional,
  requireScope,
  useExternalStore,
  useScopeActivity,
} from "../store";
export interface HierarchyIdsOptions {
  readonly ids?: MaybeRefOrGetterOptional<readonly string[]>;
  readonly defaultIds?: readonly string[];
  readonly onChange?: (ids: string[]) => void;
  readonly enabled?: MaybeRefOrGetter<boolean>;
}
/** Internal adapter; the state machine and controlled semantics remain neutral. */
export function useHierarchyIds(input: MaybeRefOrGetter<HierarchyIdsOptions>) {
  requireScope("useHierarchyIds");
  const options = computed(() => toValue(input));
  const active = useScopeActivity();
  let disposed = false;
  onScopeDispose(() => {
    disposed = true;
  });
  const store = createControllableStore<ReadonlySet<string>>(
    new Set(options.value.defaultIds),
    { observeUncontrolled: true }
  );
  watch(
    () => ({
      ids: toValue(options.value.ids),
      onChange: options.value.onChange,
    }),
    ({ ids, onChange }) => {
      store.control({
        value: ids === undefined ? undefined : new Set(ids),
        onChange: (next) => onChange?.([...next]),
      });
    },
    { immediate: true, flush: "sync" }
  );
  const own = useExternalStore(store);
  const ids = computed(() => {
    const controlled = toValue(options.value.ids);
    return controlled === undefined ? own.value : new Set(controlled);
  });
  const enabled = (): boolean =>
    !disposed && active.value && toValue(options.value.enabled) !== false;
  const run = <T>(action: () => T): T | undefined =>
    enabled() ? action() : undefined;
  return { store, ids, enabled, run };
}
