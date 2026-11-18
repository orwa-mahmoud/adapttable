import {
  createMemoryAdapter,
  type TableViewState,
  type TableViewStateConfig,
  type TableViewStore,
  type UrlStateAdapter,
} from "@adapttable/core";
import {
  createTableViewStore,
  resolveUrlAdapter,
  type TableStore,
} from "@adapttable/core/binding";
import {
  computed,
  type MaybeRefOrGetter,
  type ShallowRef,
  shallowRef,
  toValue,
  watch,
} from "vue";

import { type MaybeRefOrGetterOptional, requireScope } from "../store";
import { injectTableStore } from "../tableStore";
import { useViewStoreProjection } from "./viewStateProjection";

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
  return useViewStoreProjection(current, options);
}
