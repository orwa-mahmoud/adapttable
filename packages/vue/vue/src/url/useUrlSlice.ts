/** One neutral URL slice, with a table-owned subscription and lifecycle. */
import {
  createMemoryAdapter,
  createUrlSliceStore,
  resolveUrlAdapter,
  type UrlSliceSpec,
  type UrlSliceStore,
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
  useScopeActivity,
} from "../store";

export interface UrlSliceOptions {
  readonly urlAdapter?: MaybeRefOrGetterOptional<UrlStateAdapter>;
  readonly urlKey?: MaybeRefOrGetterOptional<string>;
  readonly urlSync?: MaybeRefOrGetterOptional<boolean>;
  /** Hydration seed override when a binding supplies an internally resolved adapter. */
  readonly serverSearch?: MaybeRefOrGetterOptional<string>;
}

/** Configuration and destination changes are reactive; callbacks are not getters. */
export function useUrlSlice<T, TConfig extends object>(
  input: MaybeRefOrGetter<UrlSliceOptions>,
  spec: UrlSliceSpec<T, TConfig>,
  config: MaybeRefOrGetter<TConfig>,
  activity?: MaybeRefOrGetter<boolean>
): {
  readonly value: Readonly<ShallowRef<T>>;
  readonly set: (next: T) => void;
  readonly flush: () => void;
} {
  requireScope("useUrlSlice");
  const active = activity ?? useScopeActivity();
  const options = computed(() => toValue(input));
  const memory = createMemoryAdapter();
  const stores = new Map<
    UrlStateAdapter,
    Map<string | undefined, UrlSliceStore<T, TConfig>>
  >();
  const current = computed(() => {
    const option = options.value;
    const explicit = toValue(option.urlAdapter);
    const adapter = resolveUrlAdapter(
      explicit,
      toValue(option.urlSync) ?? true,
      memory
    );
    const requestedKey = toValue(option.urlKey);
    const key = requestedKey === "" ? undefined : requestedKey;
    let namespaces = stores.get(adapter);
    if (!namespaces) {
      namespaces = new Map<string | undefined, UrlSliceStore<T, TConfig>>();
      stores.set(adapter, namespaces);
    }
    let store = namespaces.get(key);
    if (!store) {
      store = createUrlSliceStore(
        {
          adapter,
          urlKey: key,
          serverSearch: () =>
            toValue(option.serverSearch) ??
            (explicit && adapter === explicit ? explicit.getSearch() : ""),
        },
        spec,
        toValue(config)
      );
      namespaces.set(key, store);
    }
    return store;
  });
  const value = shallowRef<T>(
    toValue(active)
      ? current.value.getSnapshot()
      : current.value.getServerSnapshot()
  );
  let disposed = false;
  let hasActivated = toValue(active);
  onScopeDispose(() => {
    disposed = true;
    for (const namespaces of stores.values())
      for (const store of namespaces.values()) store.flush();
    stores.clear();
  });
  watch(
    [current, () => toValue(config)],
    ([store, next]) => {
      store.configure(next);
      value.value = hasActivated
        ? store.getSnapshot()
        : store.getServerSnapshot();
    },
    { immediate: true, flush: "sync" }
  );
  watch(
    [current, () => toValue(active)],
    ([store, enabled], _previous, onCleanup) => {
      let currentSubscription = true;
      let unsubscribe: (() => void) | undefined;
      onCleanup(() => {
        currentSubscription = false;
        unsubscribe?.();
        store.flush();
      });
      const read = (): void => {
        if (currentSubscription && !disposed) value.value = store.getSnapshot();
      };
      if (enabled && !disposed) {
        hasActivated = true;
        const stop = store.subscribe(read);
        if (currentSubscription && !disposed) unsubscribe = stop;
        else stop();
        read();
      } else {
        value.value = hasActivated
          ? store.getSnapshot()
          : store.getServerSnapshot();
      }
    },
    { immediate: true, flush: "sync" }
  );
  return {
    value: shallowReadonly(value),
    set: (next: T): void => {
      if (disposed || !toValue(active)) return;
      current.value.set(next);
      value.value = current.value.getSnapshot();
    },
    flush: (): void => {
      if (!disposed) current.value.flush();
    },
  };
}
