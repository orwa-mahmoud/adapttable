/** Browser preference persistence using core's column-layout storage codec. */
import {
  type ColumnLayoutState,
  initialColumnLayout,
  type LayoutStorage,
  readStoredColumnLayout,
  safeLocalStorage,
  stableKey,
  writeStoredColumnLayout,
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

export type { LayoutStorage } from "@adapttable/core";

/** Reactive storage destination and fallback layout. @public */
export interface UseColumnLayoutStorageStateOptions {
  readonly storageKey: MaybeRefOrGetter<string>;
  /** Defaults to localStorage after mount; unavailable storage stays in memory. */
  readonly storage?: MaybeRefOrGetterOptional<LayoutStorage>;
  readonly defaultColumnLayout?: MaybeRefOrGetterOptional<
    Partial<ColumnLayoutState>
  >;
}

/**
 * A host-controlled layout persisted as a browser preference. Bind `layout`
 * and `onLayoutChange` to the table's column-layout prop and update event.
 * Storage is read after mount, keeping SSR and the first hydration render
 * identical. Returning to the default removes the saved entry.
 * @public
 */
export function useColumnLayoutStorageState(
  input: MaybeRefOrGetter<UseColumnLayoutStorageStateOptions>,
  activity?: MaybeRefOrGetter<boolean>
): UseColumnLayoutStorageStateResult {
  requireScope("useColumnLayoutStorageState");
  const active = activity ?? useScopeActivity();
  const options = computed(() => toValue(input));
  const fallback = computed(() =>
    initialColumnLayout(toValue(options.value.defaultColumnLayout))
  );
  const browserStorage = shallowRef<LayoutStorage>();
  const storage = computed(
    () => toValue(options.value.storage) ?? browserStorage.value
  );
  const storageKey = computed(() => toValue(options.value.storageKey));
  const layout = shallowRef<ColumnLayoutState>(fallback.value);
  let disposed = false;
  let changed = false;
  let changeVersion = 0;
  let hydrationVersion = 0;
  let layoutDestination:
    { backend: LayoutStorage | undefined; key: string } | undefined;
  interface LayoutWrite {
    backend: LayoutStorage | undefined;
    key: string;
    next: ColumnLayoutState;
    base: ColumnLayoutState;
  }
  let writing: LayoutWrite | undefined;
  let pendingWrite: LayoutWrite | undefined;
  const persist = (): void => {
    if (writing) return;
    try {
      while (pendingWrite && !disposed && toValue(active)) {
        const next = pendingWrite;
        pendingWrite = undefined;
        writing = next;
        writeStoredColumnLayout(next.backend, next.key, next.next, next.base);
        writing = undefined;
      }
    } finally {
      writing = undefined;
      pendingWrite = undefined;
    }
  };
  onScopeDispose(() => {
    disposed = true;
    pendingWrite = undefined;
  });
  watch(
    [() => toValue(active), () => toValue(options.value.storage)],
    ([enabled, explicit]) => {
      if (enabled && !explicit) browserStorage.value = safeLocalStorage();
    },
    { immediate: true, flush: "sync" }
  );
  watch(
    [storage, storageKey, () => toValue(active)],
    ([backend, key, enabled]) => {
      const hydration = ++hydrationVersion;
      if (!enabled) return;
      // A same-destination resume during publication or a backend callback
      // must see the accepted value that has not finished writing yet.
      const accepted = [pendingWrite, writing].find(
        (write) => write?.backend === backend && write?.key === key
      );
      if (accepted) {
        layoutDestination = { backend, key };
        changed = stableKey(accepted.next) !== stableKey(fallback.value);
        layout.value = accepted.next;
        return;
      }
      const sameDestination =
        layoutDestination?.backend === backend &&
        layoutDestination?.key === key;
      const readVersion = changeVersion;
      const stored = readStoredColumnLayout(backend, key);
      if (
        disposed ||
        readVersion !== changeVersion ||
        hydration !== hydrationVersion ||
        !toValue(active) ||
        storage.value !== backend ||
        storageKey.value !== key
      )
        return;
      layoutDestination = { backend, key };
      if (!sameDestination || stored !== null || !changed) {
        changed = stored !== null;
        layout.value = stored ?? fallback.value;
      }
    },
    { immediate: true, flush: "sync" }
  );
  watch(
    fallback,
    (next) => {
      if (!changed) layout.value = next;
    },
    { flush: "sync" }
  );
  return {
    layout: shallowReadonly(layout),
    onLayoutChange: (next: ColumnLayoutState): void => {
      if (disposed || !toValue(active)) return;
      changeVersion += 1;
      const backend = storage.value;
      const key = storageKey.value;
      const base = fallback.value;
      layoutDestination = { backend, key };
      changed = stableKey(next) !== stableKey(base);
      // Own the write before publishing: a synchronous observer may replace
      // it with a newer acceptance, suspend the owner, or dispose it.
      pendingWrite = { backend, key, next, base };
      layout.value = next;
      persist();
    },
  };
}

/** Destructurable layout ref and stable storage action. @public */
export interface UseColumnLayoutStorageStateResult {
  layout: Readonly<ShallowRef<ColumnLayoutState>>;
  onLayoutChange: (next: ColumnLayoutState) => void;
}
