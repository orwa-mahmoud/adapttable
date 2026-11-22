/** Vue ownership around core's controllable id store. */

import {
  createControllableStore,
  rekeyRowIdSet,
} from "@adapttable/core/binding";
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
import { followRowRekeys, injectTableStore } from "../tableStore";

export interface HierarchyIdsOptions {
  readonly ids?: MaybeRefOrGetterOptional<readonly string[]>;
  readonly defaultIds?: readonly string[];
  readonly onChange?: (ids: string[]) => void;
  readonly enabled?: MaybeRefOrGetter<boolean>;
}
/**
 * Internal adapter; the state machine and controlled semantics remain neutral.
 *
 * @param input - The ids and their owner.
 * @param keyedByRow - Whether the ids are row ids, which follow a rekey.
 */
export function useHierarchyIds(
  input: MaybeRefOrGetter<HierarchyIdsOptions>,
  keyedByRow = false
) {
  requireScope("useHierarchyIds");
  const options = computed(() => toValue(input));
  const active = useScopeActivity();
  let disposed = false;
  onScopeDispose(() => {
    disposed = true;
  });
  const table = injectTableStore();
  const store = createControllableStore<ReadonlySet<string>>(
    new Set(options.value.defaultIds),
    { observeUncontrolled: true, store: table }
  );
  if (keyedByRow) {
    followRowRekeys(table, (log) => {
      store.update((ids) => rekeyRowIdSet(ids, log));
    });
  }
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
