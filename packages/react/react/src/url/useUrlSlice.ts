/**
 * The React side of one URL slice: subscribe to `@adapttable/core`'s slice
 * store and hand back its value and setter. Every opt-in URL hook — column
 * layout, density, collapsed groups, pinned rows, pivot, formulas — is this
 * with its own slice spec.
 */
import { createUrlSliceStore, type UrlSliceSpec } from "@adapttable/core";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { type UrlStateAdapter, useResolvedAdapter } from "./adapter";

/** Where a slice lives: the options every URL hook shares. */
export interface UrlSliceOptions {
  /** URL backend; defaults to the History API. */
  urlAdapter?: UrlStateAdapter;
  /** Sync to the URL at all. Defaults to `true`. */
  urlSync?: boolean;
  /** Namespace, when several tables share a page. */
  urlKey?: string;
}

/**
 * Subscribe to one slice of URL state.
 *
 * @returns The value, its setter, and a reader for the latest value — a
 * change not yet written included — for a setter that composes on it.
 */
export function useUrlSlice<T, TConfig extends object>(
  options: UrlSliceOptions,
  spec: UrlSliceSpec<T, TConfig>,
  config: TConfig
): readonly [value: T, set: (value: T) => void, latest: () => T] {
  const { urlAdapter, urlSync, urlKey } = options;
  const resolved = useResolvedAdapter(urlAdapter, urlSync ?? true);
  // The store is created once per backend; later configuration reaches it
  // through `configure`, which keeps an unchanged value's identity.
  const [initialConfig] = useState(config);
  const store = useMemo(
    () =>
      createUrlSliceStore(
        {
          adapter: resolved,
          urlKey,
          // Only an explicit adapter is trusted to be hydration-consistent;
          // the default history adapter hydrates from "".
          serverSearch: () => (urlAdapter ? urlAdapter.getSearch() : ""),
        },
        spec,
        initialConfig
      ),
    [resolved, urlKey, urlAdapter, spec, initialConfig]
  );
  store.configure(config);
  const value = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );
  // Flush a change still waiting on its debounce when the table unmounts, so
  // the last one a reader made before navigating is not lost.
  useEffect(() => () => store.flush(), [store]);
  return [value, store.set, store.getSnapshot] as const;
}
