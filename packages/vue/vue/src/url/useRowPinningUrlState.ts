/** Row pin URL state uses the same neutral codec and namespace as Saved Views. */
import {
  createMemoryAdapter,
  createUrlSliceStore,
  resolveUrlAdapter,
  rowPinningSlice,
  type RowPinState,
  type UrlSliceStore,
  type UrlStateAdapter,
} from "@adapttable/core";
import {
  computed,
  type ComputedRef,
  type MaybeRefOrGetter,
  onScopeDispose,
  toValue,
} from "vue";

import {
  type MaybeRefOrGetterOptional,
  requireScope,
  useExternalStore,
  useScopeActivity,
} from "../store";
export type { RowPinState, UrlStateAdapter } from "@adapttable/core";
export interface UseRowPinningUrlStateOptions {
  readonly enabled?: MaybeRefOrGetter<boolean>;
  readonly urlAdapter?: MaybeRefOrGetterOptional<UrlStateAdapter>;
  readonly urlSync?: MaybeRefOrGetterOptional<boolean>;
  readonly urlKey?: MaybeRefOrGetterOptional<string>;
}
export interface UseRowPinningUrlStateResult {
  readonly pinnedRowIds: ComputedRef<RowPinState>;
  readonly onPinnedRowIdsChange: (next: RowPinState) => void;
}
/** Replaceable backend and namespace; no browser listener during SSR. @public */
export function useRowPinningUrlState(
  input: MaybeRefOrGetter<UseRowPinningUrlStateOptions> = {}
): UseRowPinningUrlStateResult {
  requireScope("useRowPinningUrlState");
  const options = computed(() => toValue(input));
  const active = useScopeActivity();
  const local = createMemoryAdapter();
  const stores = new Map<
    UrlStateAdapter,
    Map<string | undefined, UrlSliceStore<RowPinState, object>>
  >();
  let disposed = false;
  onScopeDispose(() => {
    disposed = true;
    stores.clear();
  });
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
      store = createUrlSliceStore(
        { adapter, urlKey: key },
        rowPinningSlice,
        {}
      );
      namespaces.set(key, store);
    }
    return store;
  });
  const own = useExternalStore(
    computed(() => {
      const store = current.value;
      return toValue(options.value.enabled) !== false
        ? store
        : { getSnapshot: store.getSnapshot, subscribe: () => () => undefined };
    })
  );
  return {
    pinnedRowIds: computed(() => own.value),
    onPinnedRowIdsChange: (next) => {
      if (!disposed && active.value && toValue(options.value.enabled) !== false)
        current.value.set(next);
    },
  };
}
