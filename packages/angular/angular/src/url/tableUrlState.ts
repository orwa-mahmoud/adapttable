/**
 * URL-synced view state: page, page size, search, sort, grouping and filters
 * in the query string, read through `@adapttable/core`'s view-state store.
 */
import {
  createMemoryAdapter,
  createTableViewStore,
  type ExtraFilters,
  resolveUrlAdapter,
  type TableQueryParams,
  type TableViewState,
  type TableViewStateConfig,
  type TableViewStore,
  type UrlStateAdapter,
} from "@adapttable/core";
import { PlatformLocation } from "@angular/common";
import {
  assertInInjectionContext,
  computed,
  DestroyRef,
  effect,
  inject,
  InjectionToken,
  Injector,
  type Signal,
  signal,
  untracked,
} from "@angular/core";

import { onBrowser } from "../hooks/platform";
import { type MaybeSignalOptional, readMaybe } from "../store";

/**
 * The URL adapter every table in this injector reads and writes, when the
 * table names none. Provide an adapter over the Angular Router here to keep
 * table state in the router's URL; without one, tables use the browser's
 * History API, and a server render reads the request's URL.
 *
 * @public
 */
export const ADAPTTABLE_URL_ADAPTER = new InjectionToken<UrlStateAdapter>(
  "ADAPTTABLE_URL_ADAPTER"
);

/**
 * Options for {@link injectTableUrlState}.
 *
 * @public
 */
export interface TableUrlStateOptions {
  /**
   * URL-state backend. Defaults to {@link ADAPTTABLE_URL_ADAPTER}, then the
   * browser History API — on the server, the request's query string.
   * A signal selects a different backend while retaining inactive stores.
   */
  readonly urlAdapter?: MaybeSignalOptional<UrlStateAdapter>;
  /**
   * When `false`, state lives in a memory store owned by this table instead
   * of the URL. Defaults to `true`. A signal switches between the URL and
   * the same private store, preserving each backend's state.
   */
  readonly urlSync?: MaybeSignalOptional<boolean>;
  /**
   * Initial values applied when the URL has no value for a key. A signal
   * reconfigures the store when it moves.
   */
  readonly defaults?: MaybeSignalOptional<
    Partial<TableQueryParams> & { extra?: ExtraFilters }
  >;
  /** Extra-filter keys whose values are parsed as numbers. */
  readonly numberExtraKeys?: MaybeSignalOptional<readonly string[]>;
  /** Extra-filter keys whose values are comma-separated arrays. */
  readonly arrayExtraKeys?: MaybeSignalOptional<readonly string[]>;
  /**
   * Namespace for this table's URL params, so several tables share one URL:
   * with `urlKey: "left"` the params become `left.q`, `left.page`, …
   * A signal switches to the selected namespace's existing state.
   */
  readonly urlKey?: MaybeSignalOptional<string>;
  /** The injector to run in. Omit to use the current injection context. */
  readonly injector?: Injector;
}

/**
 * The view state as a signal, and every change a reader can make to it.
 *
 * @public
 */
export interface TableUrlState extends Pick<
  TableViewStore,
  | "setPage"
  | "setLimit"
  | "setSort"
  | "setGroupBy"
  | "initializeGroupBy"
  | "setGroupAggregateOverrides"
  | "toggleSortLevel"
  | "setSearch"
  | "setExtra"
  | "setExtras"
  | "setFilterTree"
  | "clearExtras"
  | "clearAll"
> {
  /** The current view state. */
  readonly state: Signal<TableViewState>;
}

/**
 * URL-synced table state for an Angular component or service.
 *
 * `defaults` apply only while the URL is silent about a key; clearing a
 * defaulted value records an empty param so the default does not come back.
 * Stores live as long as the injection context; only the active backend
 * and namespace keep a subscription and a namespace claim.
 *
 * @param options - See {@link TableUrlStateOptions}.
 * @returns The state signal and its mutators.
 *
 * @public
 */
export function injectTableUrlState(
  options: TableUrlStateOptions = {}
): TableUrlState {
  if (!options.injector) assertInInjectionContext(injectTableUrlState);
  const injector = options.injector ?? inject(Injector);
  const config = computed((): TableViewStateConfig => ({
    defaults: readMaybe(options.defaults),
    numberExtraKeys: readMaybe(options.numberExtraKeys),
    arrayExtraKeys: readMaybe(options.arrayExtraKeys),
  }));
  const local = createMemoryAdapter();
  const fallback = computed(() => urlAdapterFor({}, injector));
  const shared = computed(() => readMaybe(options.urlAdapter) ?? fallback());
  const stores = new Map<
    UrlStateAdapter,
    Map<string | undefined, TableViewStore>
  >();
  const revision = signal(0);
  const notifyRevision = (): void => {
    revision.update((value) => value + 1);
  };
  let active:
    | {
        readonly adapter: UrlStateAdapter;
        readonly urlKey: string | undefined;
        readonly store: TableViewStore;
        readonly unsubscribe: () => void;
      }
    | undefined;
  const current = computed(() => {
    const adapter = readMaybe(options.urlSync) === false ? local : shared();
    const requestedKey = readMaybe(options.urlKey);
    const urlKey = requestedKey === "" ? undefined : requestedKey;
    return untracked(() => {
      if (active?.adapter === adapter && active.urlKey === urlKey) {
        return active.store;
      }
      active?.unsubscribe();
      let namespaces = stores.get(adapter);
      if (!namespaces) {
        namespaces = new Map();
        stores.set(adapter, namespaces);
      }
      let store = namespaces.get(urlKey);
      if (!store) {
        store = createTableViewStore({ adapter, urlKey }, config());
        namespaces.set(urlKey, store);
      }
      active = {
        adapter,
        urlKey,
        store,
        unsubscribe: store.subscribe(notifyRevision),
      };
      return store;
    });
  });
  // Retain inactive stores but subscribe only to the selected namespace.
  untracked(current);
  effect(
    (onCleanup) => {
      const store = current();
      let mounted = true;
      let release: (() => void) | undefined;
      // A backend or namespace switch releases the previous owner's claim
      // before the next claims it, regardless of which effects run first.
      queueMicrotask(() => {
        if (mounted) release = store.claimNamespace();
      });
      onCleanup(() => {
        mounted = false;
        release?.();
      });
    },
    { injector }
  );
  injector.get(DestroyRef).onDestroy(() => {
    active?.unsubscribe();
  });

  return {
    state: computed(() => {
      const store = current();
      revision();
      store.configure(config());
      return store.getSnapshot();
    }),
    setPage: (...args) => current().setPage(...args),
    setLimit: (...args) => current().setLimit(...args),
    setSort: (...args) => current().setSort(...args),
    setGroupBy: (...args) => current().setGroupBy(...args),
    initializeGroupBy: (...args) => current().initializeGroupBy(...args),
    setGroupAggregateOverrides: (...args) =>
      current().setGroupAggregateOverrides(...args),
    toggleSortLevel: (...args) => current().toggleSortLevel(...args),
    setSearch: (...args) => current().setSearch(...args),
    setExtra: (...args) => current().setExtra(...args),
    setExtras: (...args) => current().setExtras(...args),
    setFilterTree: (...args) => current().setFilterTree(...args),
    clearExtras: (...args) => current().clearExtras(...args),
    clearAll: (...args) => current().clearAll(...args),
  };
}

/**
 * The URL backend a table's state goes through: its own adapter, else the
 * injector's, else the History API (on the server, the request's query
 * string) — or a private memory store when the table does not sync with the
 * URL.
 *
 * @param options - The table's URL options.
 * @param injector - Where {@link ADAPTTABLE_URL_ADAPTER} is looked up.
 * @returns The adapter.
 *
 * @public
 */
export function urlAdapterFor(
  options: Pick<TableUrlStateOptions, "urlAdapter" | "urlSync">,
  injector: Injector
): UrlStateAdapter {
  const provided =
    readMaybe(options.urlAdapter) ??
    injector.get(ADAPTTABLE_URL_ADAPTER, null, { optional: true }) ??
    undefined;
  const syncing = readMaybe(options.urlSync) ?? true;
  // The server renders the slice the request asks for, which is the one the
  // browser's History API reads back when the page hydrates.
  if (provided === undefined && syncing && !onBrowser(injector)) {
    return createMemoryAdapter(injector.get(PlatformLocation).search);
  }
  return resolveUrlAdapter(provided, syncing, createMemoryAdapter());
}
