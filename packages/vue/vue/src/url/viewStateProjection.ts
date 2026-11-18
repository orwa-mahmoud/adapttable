import type { TableViewStateConfig, TableViewStore } from "@adapttable/core";
import { retainItems } from "@adapttable/core/binding";
import {
  computed,
  type ComputedRef,
  onScopeDispose,
  shallowReadonly,
  type ShallowRef,
  shallowRef,
  toValue,
  watch,
} from "vue";

import { useExternalStore, useScopeActivity } from "../store";
import type {
  TableUrlState,
  UseTableUrlStateOptions,
} from "./useTableUrlState";

/**
 * Project a view-state store into a scope: configure it from the options,
 * follow its snapshot, claim its namespace while active, and wrap its
 * mutators so an inactive scope still reads the new state.
 *
 * @param current - The store, which the caller may swap.
 * @param options - The view options the store is configured from.
 * @returns The state and its mutators.
 */
export function useViewStoreProjection(
  current: ShallowRef<TableViewStore>,
  options: ComputedRef<
    Pick<
      UseTableUrlStateOptions,
      "defaults" | "numberExtraKeys" | "arrayExtraKeys"
    >
  >
): TableUrlState {
  let numberExtraKeys: readonly string[] | undefined;
  let arrayExtraKeys: readonly string[] | undefined;
  const config = computed((): TableViewStateConfig => {
    numberExtraKeys = retainItems(
      numberExtraKeys,
      toValue(options.value.numberExtraKeys)
    );
    arrayExtraKeys = retainItems(
      arrayExtraKeys,
      toValue(options.value.arrayExtraKeys)
    );
    return {
      defaults: toValue(options.value.defaults),
      numberExtraKeys,
      arrayExtraKeys,
    };
  });
  // Configure before projecting the store, including when only config changes.
  watch(
    [current, config],
    ([store, value]) => {
      store.configure(value);
    },
    {
      immediate: true,
      flush: "sync",
    }
  );
  const external = useExternalStore(current);
  const state = shallowRef(external.value);
  watch(
    [external, config, current],
    () => {
      state.value = current.value.getSnapshot();
    },
    { immediate: true, flush: "sync" }
  );
  const active = useScopeActivity();
  watch(
    [current, active],
    ([store, enabled], _previous, onCleanup) => {
      if (enabled) onCleanup(store.claimNamespace());
    },
    { immediate: true, flush: "sync" }
  );
  let disposed = false;
  onScopeDispose(() => {
    disposed = true;
  });
  // While active, the new state reaches `state` when the store publishes it:
  // at the end of this action, or of the table's batch the action runs
  // inside. Without a subscription (on the server, or while inactive) it is
  // read here.
  function mutate(run: () => void): void {
    if (disposed) return;
    run();
    if (!active.value) state.value = current.value.getSnapshot();
  }
  return {
    state: shallowReadonly(state),
    setPage: (...args) => mutate(() => current.value.setPage(...args)),
    setLimit: (...args) => mutate(() => current.value.setLimit(...args)),
    setSort: (...args) => mutate(() => current.value.setSort(...args)),
    setGroupBy: (...args) => mutate(() => current.value.setGroupBy(...args)),
    initializeGroupBy: (...args) =>
      mutate(() => current.value.initializeGroupBy(...args)),
    setGroupAggregateOverrides: (...args) =>
      mutate(() => current.value.setGroupAggregateOverrides(...args)),
    toggleSortLevel: (...args) =>
      mutate(() => current.value.toggleSortLevel(...args)),
    setSearch: (...args) => mutate(() => current.value.setSearch(...args)),
    setExtra: (...args) => mutate(() => current.value.setExtra(...args)),
    setExtras: (...args) => mutate(() => current.value.setExtras(...args)),
    setFilterTree: (...args) =>
      mutate(() => current.value.setFilterTree(...args)),
    clearExtras: (...args) => mutate(() => current.value.clearExtras(...args)),
    clearAll: (...args) => mutate(() => current.value.clearAll(...args)),
  };
}
