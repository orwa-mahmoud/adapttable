/** Vue lifetime over the neutral saved-views controller. */
import {
  createSavedViewsController,
  safeLocalStorage,
  type SavedView,
  type SavedViewsControllerOptions,
} from "@adapttable/core";
import {
  computed,
  type ComputedRef,
  type MaybeRefOrGetter,
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
} from "vue";

import { requireScope, useScopeActivity } from "../store";
export type {
  SavedView,
  SavedViewMigration,
  SavedViewsStore,
  SavedViewVisibility,
} from "@adapttable/core";
export { SAVED_VIEW_VERSION } from "@adapttable/core";
/** Options for the neutral view list and any host-owned pending URL slices. @public */
export interface UseSavedViewsOptions extends SavedViewsControllerOptions {
  /** Synchronously commit pending host URL state before saving or applying a view. */
  readonly flushViewState?: () => void;
}
export interface UseSavedViewsResult {
  readonly views: ComputedRef<readonly SavedView[]>;
  readonly defaultView: ComputedRef<SavedView | undefined>;
  readonly save: (name: string) => void;
  readonly apply: (name: string) => void;
  readonly remove: (name: string) => void;
  readonly rename: (from: string, to: string) => void;
  readonly move: (name: string, delta: -1 | 1) => void;
  readonly setDefault: (name: string) => void;
  readonly reload: () => void;
}

function sameUrlDestination(
  left: SavedViewsControllerOptions,
  right: SavedViewsControllerOptions
): boolean {
  return (
    left.urlAdapter === right.urlAdapter &&
    (left.urlKey ?? "") === (right.urlKey ?? "") &&
    (left.urlSync ?? true) === (right.urlSync ?? true)
  );
}

export function useSavedViews(
  input: MaybeRefOrGetter<UseSavedViewsOptions>,
  activity?: MaybeRefOrGetter<boolean>
): UseSavedViewsResult {
  requireScope("useSavedViews");
  const active = activity ?? useScopeActivity();
  const options = computed(() => toValue(input));
  // Do not touch localStorage during SSR or the first hydration render.
  const browserStorage =
    shallowRef<SavedViewsControllerOptions["storage"]>(null);
  watch(
    [() => toValue(active), () => options.value.storage],
    ([enabled]) => {
      if (enabled && options.value.storage === undefined)
        browserStorage.value = safeLocalStorage() ?? null;
    },
    { immediate: true, flush: "sync" }
  );
  const resolved = computed((): SavedViewsControllerOptions => ({
    ...options.value,
    storage:
      options.value.storage === undefined
        ? browserStorage.value
        : options.value.storage,
  }));
  let configured = resolved.value;
  let controller = createSavedViewsController(configured);
  const snapshot = shallowRef(controller.getSnapshot());
  let disposed = false;
  let disconnect: (() => void) | undefined;
  const read = (): void => {
    if (!disposed) snapshot.value = controller.getSnapshot();
  };
  let unsubscribe = controller.subscribe(read);
  onScopeDispose(() => {
    disposed = true;
    disconnect?.();
    unsubscribe();
  });
  let configuring = false;
  let destinationVersion = 0;
  let requested = resolved.value;
  let requestedActive = toValue(active);
  let pending:
    { next: SavedViewsControllerOptions; enabled: boolean } | undefined;
  const configure = (
    next: SavedViewsControllerOptions,
    enabled: boolean
  ): void => {
    const replaced =
      next.storageKey !== configured.storageKey ||
      next.storage !== configured.storage ||
      next.store !== configured.store;
    if (replaced) {
      disconnect?.();
      disconnect = undefined;
      unsubscribe();
      controller = createSavedViewsController(next);
      unsubscribe = controller.subscribe(read);
      read();
    }
    controller.configure(next);
    configured = next;
    if (!enabled) {
      disconnect?.();
      disconnect = undefined;
    } else if (!disconnect && (next.store || next.storage)) {
      const connecting = controller;
      const stop = connecting.connect();
      if (disposed || controller !== connecting || !toValue(active)) stop();
      else disconnect = stop;
    }
  };
  watch(
    [resolved, () => toValue(active)],
    ([next, enabled]) => {
      // Record ownership changes when requested, even if configure is
      // already publishing and this update must wait for its loop.
      if (
        next.storageKey !== requested.storageKey ||
        next.storage !== requested.storage ||
        next.store !== requested.store ||
        !sameUrlDestination(next, requested) ||
        enabled !== requestedActive
      )
        destinationVersion += 1;
      requested = next;
      requestedActive = enabled;
      pending = { next, enabled };
      if (configuring) return;
      configuring = true;
      try {
        while (pending && !disposed) {
          const current = pending;
          pending = undefined;
          configure(current.next, current.enabled);
        }
      } finally {
        configuring = false;
        pending = undefined;
      }
    },
    { immediate: true, flush: "sync" }
  );
  const run = (action: () => void): void => {
    if (!disposed && toValue(active)) action();
  };
  let flushing = false;
  const withFlushedState = (action: () => void): void => {
    run(() => {
      if (flushing) return;
      flushing = true;
      const current = controller;
      const version = destinationVersion;
      const destination = resolved.value;
      try {
        options.value.flushViewState?.();
        if (
          controller === current &&
          version === destinationVersion &&
          sameUrlDestination(destination, resolved.value)
        )
          run(action);
      } finally {
        flushing = false;
      }
    });
  };
  return {
    views: computed(() => snapshot.value.views),
    defaultView: computed(() => snapshot.value.defaultView),
    save: (name: string): void =>
      run(() => {
        const trimmed = name.trim();
        if (trimmed) withFlushedState(() => controller.save(trimmed));
      }),
    apply: (name: string): void =>
      withFlushedState(() => controller.apply(name)),
    remove: (name: string): void => run(() => controller.remove(name)),
    rename: (from: string, to: string): void =>
      run(() => controller.rename(from, to)),
    move: (name: string, delta: -1 | 1): void =>
      run(() => controller.move(name, delta)),
    setDefault: (name: string): void => run(() => controller.setDefault(name)),
    reload: (): void => run(() => controller.reload()),
  };
}
