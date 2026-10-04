import {
  createMemoryAdapter,
  createTableViewStore,
  resolveUrlAdapter,
  type TableViewState,
  type TableViewStateConfig,
  type TableViewStore,
  type UrlStateAdapter,
} from "@adapttable/core";
import {
  computed,
  type MaybeRefOrGetter,
  onScopeDispose,
  shallowReadonly,
  type ShallowRef,
  shallowRef,
  toValue,
  watch,
} from "vue";

import {
  type MaybeRefOrGetterOptional,
  requireScope,
  useExternalStore,
  useScopeActivity,
} from "../store";

/** Reactive URL configuration. Callback fields are never getter inputs. @public */
export interface UseTableUrlStateOptions {
  readonly urlAdapter?: MaybeRefOrGetterOptional<UrlStateAdapter>;
  readonly urlSync?: MaybeRefOrGetterOptional<boolean>;
  readonly defaults?: MaybeRefOrGetter<TableViewStateConfig["defaults"]>;
  readonly numberExtraKeys?: MaybeRefOrGetterOptional<readonly string[]>;
  readonly arrayExtraKeys?: MaybeRefOrGetterOptional<readonly string[]>;
  readonly urlKey?: MaybeRefOrGetterOptional<string>;
}

/** Stable view actions shared by all source tiers. @public */
export type TableUrlActions = Omit<
  TableViewStore,
  | "getSnapshot"
  | "getServerSnapshot"
  | "subscribe"
  | "configure"
  | "claimNamespace"
>;

/** Destructurable URL snapshot with stable actions. @public */
export interface TableUrlState extends TableUrlActions {
  readonly state: Readonly<ShallowRef<TableViewState>>;
}

/**
 * Request-local state with one active URL subscription and namespace claim.
 * Inactive namespaces retain their state. For request-specific SSR state pass
 * a memory adapter seeded from the request, and use the same seed to hydrate.
 * @public
 */
export function useTableUrlState(
  input: MaybeRefOrGetter<UseTableUrlStateOptions> = {}
): TableUrlState {
  requireScope("useTableUrlState");
  const options = computed(() => toValue(input));
  const local = createMemoryAdapter();
  const stores = new Map<
    UrlStateAdapter,
    Map<string | undefined, TableViewStore>
  >();
  const current = computed(() => {
    const value = options.value;
    const adapter = resolveUrlAdapter(
      toValue(value.urlAdapter),
      toValue(value.urlSync) ?? true,
      local
    );
    const requestedKey = toValue(value.urlKey);
    const key = requestedKey === "" ? undefined : requestedKey;
    let namespaces = stores.get(adapter);
    if (!namespaces) {
      namespaces = new Map();
      stores.set(adapter, namespaces);
    }
    let store = namespaces.get(key);
    if (!store) {
      store = createTableViewStore({ adapter, urlKey: key }, {});
      namespaces.set(key, store);
    }
    return store;
  });
  const config = computed((): TableViewStateConfig => ({
    defaults: toValue(options.value.defaults),
    numberExtraKeys: toValue(options.value.numberExtraKeys),
    arrayExtraKeys: toValue(options.value.arrayExtraKeys),
  }));
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
  function mutate(run: () => void): void {
    if (disposed) return;
    run();
    state.value = current.value.getSnapshot();
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
