import {
  createMemoryAdapter,
  createTableViewStore,
  resolveUrlAdapter,
  type TableViewState,
  type TableViewStateConfig,
  type TableViewStore,
  type UrlStateAdapter,
} from "@adapttable/core";
import { retainItems, type TableStore } from "@adapttable/core/binding";
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
import { injectTableStore } from "../tableStore";

/** Reactive URL configuration. Callback fields are never getter inputs. @public */
export interface UseTableUrlStateOptions {
  /**
   * The table's store to keep the view state in; the store of the table
   * this component is inside, or one of its own, when absent.
   */
  readonly store?: TableStore;
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
  const enclosing = injectTableStore();
  const local = createMemoryAdapter();
  const stores = new Map<
    UrlStateAdapter,
    Map<string | undefined, TableViewStore>
  >();
  /** Which URL and namespace the state lives in. */
  const adapter = computed(() =>
    resolveUrlAdapter(
      toValue(options.value.urlAdapter),
      toValue(options.value.urlSync) ?? true,
      local
    )
  );
  const namespace = computed(() => {
    const requestedKey = toValue(options.value.urlKey);
    return requestedKey === "" ? undefined : requestedKey;
  });
  /** The store for a URL and namespace, created the first time it is asked for. */
  const storeFor = (
    url: UrlStateAdapter,
    key: string | undefined
  ): TableViewStore => {
    let namespaces = stores.get(url);
    if (!namespaces) {
      namespaces = new Map();
      stores.set(url, namespaces);
    }
    let store = namespaces.get(key);
    if (!store) {
      store = createTableViewStore(
        { adapter: url, urlKey: key },
        {},
        { store: options.value.store ?? enclosing }
      );
      namespaces.set(key, store);
    }
    return store;
  };
  // A store is created where state may change, never while a computed is
  // evaluated: creating one sets up its state.
  const current = shallowRef(storeFor(adapter.value, namespace.value));
  watch(
    [adapter, namespace],
    ([url, key]) => {
      current.value = storeFor(url, key);
    },
    { flush: "sync" }
  );
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
