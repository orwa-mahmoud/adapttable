import {
  getCurrentInstance,
  getCurrentScope,
  type MaybeRefOrGetter,
  onActivated,
  onDeactivated,
  onMounted,
  onScopeDispose,
  type Ref,
  shallowReadonly,
  type ShallowRef,
  shallowRef,
  toValue,
  watch,
} from "vue";

/** A reactive optional value; a ref/getter may currently hold undefined. @public */
export type MaybeRefOrGetterOptional<T> =
  T | Readonly<Ref<T | undefined>> | (() => T | undefined);

/** A cached external snapshot and its change subscription. @public */
export interface ExternalStore<T> {
  readonly getSnapshot: () => T;
  readonly subscribe: (listener: () => void) => () => void;
}

/** Require ownership for every resource created by a composable. @internal */
export function requireScope(name: string): void {
  if (!getCurrentScope()) {
    throw new Error(
      `${name} must run inside setup() or an active effectScope().`
    );
  }
}

/**
 * Whether the current component may interact with external resources.
 * Component resources start after mount and suspend during KeepAlive.
 * An explicit effectScope starts immediately; its owner must stop it.
 * Server component setup never becomes active.
 * @public
 */
export function useScopeActivity(): Readonly<ShallowRef<boolean>> {
  requireScope("useScopeActivity");
  const component = getCurrentInstance();
  const active = shallowRef(component === null);
  let disposed = false;
  if (component) {
    const activate = (): void => {
      if (!disposed) active.value = true;
    };
    onMounted(activate);
    onActivated(activate);
    onDeactivated(() => {
      active.value = false;
    });
  }
  onScopeDispose(() => {
    disposed = true;
    active.value = false;
  });
  return shallowReadonly(active);
}

/**
 * Follow a replaceable external store without deep-proxying its snapshot.
 * Rereading after subscribe closes the read/subscribe race. A replaced,
 * suspended or disposed subscription can never publish a late notification.
 * @public
 */
export function useExternalStore<T>(
  input: MaybeRefOrGetter<ExternalStore<T>>
): Readonly<ShallowRef<T>> {
  requireScope("useExternalStore");
  const active = useScopeActivity();
  const snapshot = shallowRef<T>(toValue(input).getSnapshot());
  let connecting = false;
  let pending: (() => void) | undefined;
  const schedule = (connect: () => void): void => {
    pending = connect;
    if (connecting) return;
    connecting = true;
    try {
      while (pending) {
        const run = pending;
        pending = undefined;
        run();
      }
    } finally {
      connecting = false;
      pending = undefined;
    }
  };
  watch(
    [() => toValue(input), active],
    ([store, enabled], _previous, onCleanup) => {
      let current = true;
      let unsubscribe: (() => void) | undefined;
      const release = (): void => {
        current = false;
        const stop = unsubscribe;
        unsubscribe = undefined;
        stop?.();
      };
      // Own cleanup before calling host code: subscribe may replace its store
      // or dispose this scope before returning its unsubscribe function.
      onCleanup(release);
      const read = (): void => {
        if (!current) return;
        const value = store.getSnapshot();
        if (current) snapshot.value = value;
      };
      schedule(() => {
        try {
          read();
          if (!enabled || !current) return;
          const stop = store.subscribe(read);
          if (current) unsubscribe = stop;
          else stop();
          read();
        } catch (error) {
          try {
            release();
          } catch (cleanupError) {
            throw new AggregateError(
              [error, cleanupError],
              "External store read and cleanup both failed."
            );
          }
          throw error;
        }
      });
    },
    { immediate: true, flush: "sync" }
  );
  return shallowReadonly(snapshot);
}
