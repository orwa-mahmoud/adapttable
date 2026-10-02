/**
 * One piece of view state kept in the URL beside the table's own params —
 * the column layout, the density, the collapsed groups, the pinned rows —
 * read and written through `@adapttable/core`'s URL slice store.
 */
import {
  createUrlSliceStore,
  type UrlSliceSpec,
  type UrlStateAdapter,
} from "@adapttable/core";
import {
  assertInInjectionContext,
  computed,
  DestroyRef,
  inject,
  Injector,
  type Signal,
  untracked,
} from "@angular/core";

import { fromStore, type MaybeSignal, readMaybe } from "../store";
import { urlAdapterFor } from "./tableUrlState";

/**
 * Where a URL slice is kept.
 *
 * @public
 */
export interface UrlSliceOptions {
  /** URL-state backend. Chosen once when this slice is created. */
  readonly urlAdapter?: UrlStateAdapter;
  /** Keep this slice in the URL. Chosen once when it is created. */
  readonly urlSync?: boolean;
  /** URL namespace. Chosen once when this slice is created. */
  readonly urlKey?: string;
  /** The injector to run in. Omit inside an injection context. */
  readonly injector?: Injector;
}

/**
 * A URL slice, as a signal and its writer.
 *
 * @public
 */
export interface UrlSlice<T> {
  /** The slice's current value. */
  readonly value: Signal<T>;
  /** Write a new value; the URL follows after the store's debounce. */
  readonly set: (value: T) => void;
  /** The value right now, including a write still waiting on its debounce. */
  readonly latest: () => T;
}

/**
 * Keep one slice of view state in the URL.
 *
 * The store is made once; a configuration passed as a signal reaches it
 * through `configure`, which keeps an unchanged value's identity. A write
 * still waiting on its debounce is flushed when the injection context is
 * destroyed, so the last change a reader made is not lost.
 *
 * @param options - See {@link UrlSliceOptions}.
 * @param spec - The slice: how its value reads from and writes to the URL.
 * @param config - The slice's configuration, as a value or a signal.
 * @returns See {@link UrlSlice}.
 *
 * @public
 */
export function injectUrlSlice<T, TConfig extends object>(
  options: UrlSliceOptions,
  spec: UrlSliceSpec<T, TConfig>,
  config: MaybeSignal<TConfig>
): UrlSlice<T> {
  if (!options.injector) assertInInjectionContext(injectUrlSlice);
  const injector = options.injector ?? inject(Injector);
  const store = createUrlSliceStore(
    {
      adapter: urlAdapterFor(options, injector),
      urlKey: options.urlKey,
    },
    spec,
    untracked(() => readMaybe(config))
  );
  // The store reads its configuration when its value is read, so the value
  // is derived: a new configuration re-reads it without a notification.
  const configured = computed(() => {
    const next = readMaybe(config);
    store.configure(next);
    return next;
  });
  const snapshot = fromStore(store, { injector });
  injector.get(DestroyRef).onDestroy(() => {
    store.flush();
  });
  return {
    value: computed(() => {
      configured();
      snapshot();
      return store.getSnapshot();
    }),
    set: store.set,
    latest: store.getSnapshot,
  };
}
