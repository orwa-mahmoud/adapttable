/**
 * The table's view state — page, limit, search, sort, grouping, filters and
 * every opt-in slice beside them — held in a store over a `UrlStateAdapter`.
 *
 * The store is separate from the engine on purpose: a server-data table has
 * no engine, and its view state is the same. A binding subscribes to it
 * (`useSyncExternalStore` in React) and calls its mutators; a host still
 * plugs state in through the adapter it hands the table.
 *
 * Every snapshot is cached by the query string it was read from and by the
 * configuration it was read with, so a binding that reads it twice in one
 * render gets the same object, and a value whose inputs did not change keeps
 * its identity across renders.
 */
import type {
  ExtraFilters,
  FilterValue,
  SortDirection,
} from "../contracts/columns";
import type { QueryFilterGroup } from "../contracts/query";
import {
  type GroupAggregateOverrides,
  parseGroupAggregateOverrides,
  serializeGroupAggregateOverrides,
} from "../grouping/groupAggregateOverrides";
import { type ActionDefinition, createTableStore } from "../state/tableStore";
import {
  clearAll,
  clearExtras,
  configureView,
  initializeGroupBy,
  replaceOverrides,
  sameSortLevels,
  sameViewConfig,
  setExtra,
  setExtras,
  setFilterTree,
  setGroupAggregateOverrides,
  setGroupBy,
  setLimit,
  setPage,
  setSearch,
  setSort,
  shallowEqual,
  type TableViewState,
  type TableViewStateConfig,
  toggleSortLevel,
  VIEW_CONFIG,
  VIEW_OVERRIDES,
  VIEW_WRITTEN,
  type ViewOverrides,
  viewStateReader,
} from "../state/viewState";
import type { TableStateMutators } from "../tableStateMutators";
import { devWarn } from "../utils/devWarn";
import { memoLast } from "../utils/memoLast";
import { sameItems } from "../utils/sameItems";
import {
  FILTER_PREFIX,
  isEmptyFilterValue,
  PARAM_GROUP_AGGREGATES,
  PARAM_GROUP_BY,
  PARAM_LIMIT,
  PARAM_PAGE,
  PARAM_SEARCH,
  PARAM_SORT_BY,
  PARAM_SORT_DIR,
  readExtra,
  readFilterTreeParam,
  readLimit,
  readPage,
  readSortDir,
  readSortLevels,
  writeExtra,
  writeFilterTreeParam,
  writeSortLevels,
} from "./serialize";
import type { UrlStateAdapter } from "./urlStateAdapter";
import { parseTableUrlState, updateTableUrlState } from "./urlStateCodec";

/* ── Shared plumbing ───────────────────────────────────────────────── */

/**
 * Where a view-state store reads and writes.
 *
 * @public
 */
export interface ViewStateSource {
  /** The adapter the store reads and writes — already resolved. */
  readonly adapter: UrlStateAdapter;
  /**
   * Namespace for this table's params, so several tables share one URL
   * (`left.q`, `right.page`, …). Omit for the bare keys.
   */
  readonly urlKey?: string;
  /**
   * The query string a server render read, for hydration. Omit and the
   * server snapshot reads `""` — the default history adapter hydrates from
   * an empty store and applies the real URL right after.
   */
  readonly serverSearch?: () => string;
}

/**
 * What a binding subscribes to.
 *
 * @public
 */
export interface ViewStateSubscription<TSnapshot> {
  /** The current value, the same object until something it reads changes. */
  readonly getSnapshot: () => TSnapshot;
  /** The value a server render produced, for hydration. */
  readonly getServerSnapshot: () => TSnapshot;
  /** Listen for changes. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
}

function namespaceOf(urlKey: string | undefined): string {
  return urlKey ? `${urlKey}.` : "";
}

/* ── Table query state ─────────────────────────────────────────────── */

export type { TableViewState, TableViewStateConfig } from "../state/viewState";

/**
 * The table's view state and every change a reader can make to it.
 *
 * @public
 */
export interface TableViewStore
  extends
    ViewStateSubscription<TableViewState>,
    Omit<TableStateMutators, "sortLevels"> {
  /** Replace the configuration. A value-for-value equal one changes nothing. */
  readonly configure: (config: TableViewStateConfig) => void;
  /**
   * Record that a table reads this namespace, warning in development when a
   * second one does on the same adapter. Returns the release.
   */
  readonly claimNamespace: () => () => void;
  /** Narrowed from the optional mutator every view-state store has. */
  setFilterTree: (tree: QueryFilterGroup | undefined) => void;
  /** Narrowed from the optional mutator every view-state store has. */
  initializeGroupBy: (key: string) => void;
  /** Narrowed from the optional mutator every view-state store has. */
  setGroupAggregateOverrides: (overrides: GroupAggregateOverrides) => void;
}

/** Mounted namespaces per adapter, for the duplicate-urlKey dev warning. */
const namespaceRegistry = /* @__PURE__ */ new WeakMap<
  UrlStateAdapter,
  Map<string, number>
>();

/** Stable default for the key registries. */
const NO_KEYS: readonly string[] = [];

type Overrides = { -readonly [K in keyof ViewOverrides]: ViewOverrides[K] };

/**
 * The extra bag a URL's filter params describe: each parsed value, and an
 * empty marker for a param that is present but holds no value the keys
 * accept — that param clears its default.
 */
function extraFromParams(
  params: URLSearchParams,
  ns: string,
  config: TableViewStateConfig
): ExtraFilters | undefined {
  const parsed = readExtra(
    params,
    config.numberExtraKeys ?? NO_KEYS,
    config.arrayExtraKeys ?? NO_KEYS,
    ns
  );
  const prefix = ns + FILTER_PREFIX;
  let extra: ExtraFilters | undefined;
  params.forEach((_, key) => {
    if (!key.startsWith(prefix)) return;
    const bare = key.slice(prefix.length);
    extra ??= {};
    extra[bare] = parsed[bare] ?? "";
  });
  return extra;
}

/** What a URL's table params set, for one namespace. */
function overridesFromParams(
  params: URLSearchParams,
  ns: string,
  config: TableViewStateConfig
): ViewOverrides {
  const out: Overrides = {};
  const page = readPage(params, 0, ns);
  if (page > 0) out.page = page;
  const limit = readLimit(params, 0, ns);
  if (limit > 0) out.limit = limit;
  const search = params.get(ns + PARAM_SEARCH);
  if (search !== null) out.search = search;
  const sortBy = params.get(ns + PARAM_SORT_BY);
  if (sortBy !== null) out.sortBy = sortBy;
  const sortDir = readSortDir(params, ns);
  if (sortDir) out.sortDir = sortDir;
  const sortLevels = readSortLevels(params, ns);
  if (sortLevels.length > 0) out.sortLevels = sortLevels;
  const groupBy = params.get(ns + PARAM_GROUP_BY);
  if (groupBy !== null) out.groupBy = groupBy;
  const aggregates = parseGroupAggregateOverrides(
    params.get(ns + PARAM_GROUP_AGGREGATES)
  );
  if (Object.keys(aggregates).length > 0) {
    out.groupAggregateOverrides = aggregates;
  }
  const extra = extraFromParams(params, ns, config);
  if (extra) out.extra = extra;
  const filterTree = readFilterTreeParam(params, ns);
  if (filterTree) out.filterTree = filterTree;
  return out;
}

/** Set a param, or delete it when the value is unset. */
function setParam(
  params: URLSearchParams,
  name: string,
  value: string | number | undefined
): void {
  if (value === undefined) params.delete(name);
  else params.set(name, String(value));
}

/** Write the filter params: values, then empty markers for cleared defaults. */
function writeExtraParams(
  params: URLSearchParams,
  extra: ExtraFilters,
  ns: string
): void {
  writeExtra(params, extra, ns);
  for (const [key, value] of Object.entries(extra)) {
    if (isEmptyFilterValue(value)) params.set(ns + FILTER_PREFIX + key, "");
  }
}

/**
 * Rewrite, in place, the params of every override an action wrote or changed:
 * exactly the params the action set, as the view state has always written
 * them.
 */
function writeOverrides(
  params: URLSearchParams,
  before: ViewOverrides,
  after: ViewOverrides,
  written: ReadonlySet<PropertyKey>,
  ns: string
): void {
  const touched = (key: keyof ViewOverrides, same: boolean) =>
    written.has(key) || !same;
  if (
    touched("sortLevels", sameSortLevels(before.sortLevels, after.sortLevels))
  ) {
    writeSortLevels(params, after.sortLevels ?? [], ns);
  }
  if (touched("sortBy", before.sortBy === after.sortBy)) {
    setParam(params, ns + PARAM_SORT_BY, after.sortBy);
  }
  if (touched("sortDir", before.sortDir === after.sortDir)) {
    setParam(params, ns + PARAM_SORT_DIR, after.sortDir);
  }
  if (touched("search", before.search === after.search)) {
    setParam(params, ns + PARAM_SEARCH, after.search);
  }
  if (touched("limit", before.limit === after.limit)) {
    setParam(params, ns + PARAM_LIMIT, after.limit);
  }
  if (touched("groupBy", before.groupBy === after.groupBy)) {
    setParam(params, ns + PARAM_GROUP_BY, after.groupBy);
  }
  if (
    touched(
      "groupAggregateOverrides",
      shallowEqual(
        before.groupAggregateOverrides,
        after.groupAggregateOverrides
      )
    )
  ) {
    const encoded = serializeGroupAggregateOverrides(
      after.groupAggregateOverrides ?? {}
    );
    setParam(
      params,
      ns + PARAM_GROUP_AGGREGATES,
      encoded === "" ? undefined : encoded
    );
  }
  if (touched("extra", shallowEqual(before.extra, after.extra))) {
    writeExtraParams(params, after.extra ?? {}, ns);
  }
  if (touched("filterTree", before.filterTree === after.filterTree)) {
    writeFilterTreeParam(params, after.filterTree, ns);
  }
  if (touched("page", before.page === after.page)) {
    setParam(params, ns + PARAM_PAGE, after.page);
  }
}

/**
 * Create the table's view-state store, kept in step with a URL.
 *
 * The view state lives in a table store; the URL mirrors it. A change made
 * through the store's mutators is written to the URL, and a URL change
 * (navigation, a router, a hand edit) is read back into the store. `defaults`
 * apply only while nothing has set a key. When the reader explicitly clears a
 * defaulted value (clearing the search, removing a filter chip, clear-all),
 * the URL records the clearing as an EMPTY-valued param (`q=`, `sortBy=`,
 * `f_status=`) so the default does not instantly resurrect. Without a default
 * for the key the param is simply deleted, so URLs stay clean in the common
 * case.
 *
 * @param source - The adapter, namespace and hydration search.
 * @param config - The initial configuration; see {@link TableViewStore.configure}.
 * @returns The store.
 *
 * @public
 */
export function createTableViewStore(
  source: ViewStateSource,
  config: TableViewStateConfig = {}
): TableViewStore {
  const { adapter } = source;
  const ns = namespaceOf(source.urlKey);
  const viewOf = viewStateReader();
  const urlViewOf = viewStateReader();
  const serverViewOf = viewStateReader();
  const overridesOf = memoLast(
    (search: string, current: TableViewStateConfig) =>
      overridesFromParams(parseTableUrlState(search, ns), ns, current)
  );
  const initialSearch = adapter.getSearch();
  let initialOverrides: ViewOverrides = {};
  /**
   * The configuration reads use. A binding configures while it renders, so
   * a new one is kept here and reaches the slice with the next action.
   */
  let configured: TableViewStateConfig = {};
  let configPending = false;
  // The configuration and the URL's overrides are the store's starting
  // state: creating the store changes nothing anyone reads.
  const store = createTableStore((writer) => {
    const configure = configureView(config);
    configure.reduce(writer, configure.payload);
    configured = writer.read(VIEW_CONFIG);
    initialOverrides = overridesOf(initialSearch, configured);
    const start = replaceOverrides(initialOverrides);
    start.reduce(writer, start.payload);
  });
  /** The URL the store last matched, and the overrides it holds there. */
  let synced: { search: string; overrides: ViewOverrides } = {
    search: initialSearch,
    overrides: initialOverrides,
  };
  let pulling = false;
  /** New extra keys read the filter params differently: read the URL again. */
  let rereadUrl = false;

  const pull = (): void => {
    const search = adapter.getSearch();
    if (!rereadUrl && search === synced.search) return;
    rereadUrl = false;
    const overrides = overridesOf(search, configured);
    synced = { search, overrides };
    pulling = true;
    try {
      store.dispatch(replaceOverrides(overrides));
    } finally {
      pulling = false;
    }
  };

  // A change made through the store goes to the URL; one the URL made is
  // already there.
  const push = (): void => {
    if (pulling) return;
    const after = store.read(VIEW_OVERRIDES);
    const before = synced.overrides;
    const written = store.read(VIEW_WRITTEN);
    adapter.setSearch(
      updateTableUrlState(adapter.getSearch(), ns, (params) =>
        writeOverrides(params, before, after, written, ns)
      )
    );
    synced = { search: adapter.getSearch(), overrides: after };
  };
  store.slice(VIEW_OVERRIDES).subscribe(push);
  store.slice(VIEW_WRITTEN).subscribe(push);

  let adapterListeners = 0;
  let stopAdapter: (() => void) | undefined;
  /** Follow the URL while someone reads; returns the release. */
  const follow = (): (() => void) => {
    adapterListeners += 1;
    stopAdapter ??= adapter.subscribe(pull);
    pull();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      adapterListeners -= 1;
      if (adapterListeners > 0) return;
      stopAdapter?.();
      stopAdapter = undefined;
    };
  };

  /** The configuration a binding set since the last action, into the slice. */
  const applyConfig = (): void => {
    if (!configPending) return;
    configPending = false;
    store.dispatch(configureView(configured));
  };

  const act =
    <TArgs extends readonly unknown[]>(run: (...args: TArgs) => void) =>
    (...args: TArgs): void => {
      applyConfig();
      pull();
      run(...args);
    };
  /** A mutator that dispatches one action with its one argument. */
  const run = <TPayload>(action: ActionDefinition<TPayload>) =>
    act((payload: TPayload) => store.dispatch(action(payload)));

  return {
    getSnapshot() {
      const search = adapter.getSearch();
      // The URL moved ahead of the store and nobody has read it back yet:
      // answer from the URL without writing the store.
      if (rereadUrl || search !== synced.search) {
        return urlViewOf(overridesOf(search, configured), configured);
      }
      return viewOf(store.read(VIEW_OVERRIDES), configured);
    },
    getServerSnapshot: () => {
      return serverViewOf(
        overridesOf(source.serverSearch?.() ?? "", configured),
        configured
      );
    },
    subscribe(listener) {
      const release = follow();
      const stop = store.slice(VIEW_OVERRIDES).subscribe(listener);
      return () => {
        stop();
        release();
      };
    },
    // A binding configures while it renders, so this writes no store: reads
    // derive the view with the new defaults at once, and the next action
    // carries them into the slice its reducers read.
    configure(next) {
      const previous = configured;
      if (sameViewConfig(previous, next)) return;
      configured = next;
      configPending = true;
      if (
        sameItems(previous.numberExtraKeys ?? [], next.numberExtraKeys ?? []) &&
        sameItems(previous.arrayExtraKeys ?? [], next.arrayExtraKeys ?? [])
      ) {
        return;
      }
      // The keys decide how filter params read: reads answer from the URL
      // until the next change reads it back into the store.
      rereadUrl = true;
    },
    claimNamespace() {
      const counts =
        namespaceRegistry.get(adapter) ?? new Map<string, number>();
      namespaceRegistry.set(adapter, counts);
      const claimed = (counts.get(ns) ?? 0) + 1;
      counts.set(ns, claimed);
      if (claimed > 1) {
        devWarn(
          `two tables share the URL namespace "${ns || "(bare)"}" — give each table a distinct \`urlKey\` or their state will clobber each other.`
        );
      }
      const release = follow();
      return () => {
        release();
        // The claim above guarantees an entry; drop it at zero so the
        // registry never grows.
        const remaining = counts.get(ns)! - 1;
        if (remaining === 0) counts.delete(ns);
        else counts.set(ns, remaining);
      };
    },
    setPage: run(setPage),
    setLimit: run(setLimit),
    setSearch: run(setSearch),
    setSort: act((key: string | undefined, dir?: SortDirection) =>
      store.dispatch(setSort({ key, dir }))
    ),
    setGroupBy: run(setGroupBy),
    initializeGroupBy: run(initializeGroupBy),
    setGroupAggregateOverrides: run(setGroupAggregateOverrides),
    toggleSortLevel: run(toggleSortLevel),
    setExtra: act((key: string, value: FilterValue) =>
      store.dispatch(setExtra({ key, value }))
    ),
    setExtras: run(setExtras),
    setFilterTree: run(setFilterTree),
    clearExtras: run(clearExtras),
    clearAll: run(clearAll),
  };
}

/* ── Opt-in slices ─────────────────────────────────────────────────── */

/**
 * How one slice of view state lives in the URL.
 *
 * @typeParam T - The slice's value.
 * @typeParam TConfig - What the slice is configured with.
 *
 * @public
 */
export interface UrlSliceSpec<T, TConfig extends object> {
  /** Read the value, defaults applied, from a namespaced params snapshot. */
  read(params: URLSearchParams, ns: string, config: TConfig): T;
  /** Write a value into a namespaced params snapshot. */
  write(params: URLSearchParams, value: T, ns: string, config: TConfig): void;
  /**
   * Trailing debounce for the URL write, in milliseconds. The value reads
   * back at once either way; `0` or omitted writes immediately.
   */
  readonly writeDebounceMs?: number;
}

/**
 * One slice of view state and its setter.
 *
 * @public
 */
export interface UrlSliceStore<
  T,
  TConfig extends object,
> extends ViewStateSubscription<T> {
  /** Replace the configuration. A value-for-value equal one changes nothing. */
  readonly configure: (config: TConfig) => void;
  /**
   * Set the value. A debounced slice reads it back at once and writes the URL
   * when the reader pauses; an immediate slice writes at once.
   */
  readonly set: (value: T) => void;
  /** Write a value still waiting on its debounce now. Nothing else changes. */
  readonly flush: () => void;
}

const NOTHING_PENDING: unique symbol =
  /* @__PURE__ */ Symbol("nothing pending");

/**
 * Create the store for one slice of view state.
 *
 * @param source - The adapter, namespace and hydration search.
 * @param spec - How the slice reads and writes the URL.
 * @param config - The slice's initial configuration.
 * @returns The store.
 *
 * @public
 */
export function createUrlSliceStore<T, TConfig extends object>(
  source: ViewStateSource,
  spec: UrlSliceSpec<T, TConfig>,
  config: TConfig
): UrlSliceStore<T, TConfig> {
  const { adapter } = source;
  const ns = namespaceOf(source.urlKey);
  let current = config;
  let version = 0;
  // Optimistic overlay: the value that has not reached the URL yet.
  let pending: T | typeof NOTHING_PENDING = NOTHING_PENDING;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  const notify = (): void => {
    for (const listener of listeners) listener();
  };

  const deriver = () =>
    memoLast((search: string, _version: number): T =>
      spec.read(parseTableUrlState(search, ns), ns, current)
    );
  const client = deriver();
  const server = deriver();

  const persist = (value: T): void => {
    adapter.setSearch(
      updateTableUrlState(adapter.getSearch(), ns, (params) =>
        spec.write(params, value, ns, current)
      )
    );
  };

  const flush = (): void => {
    if (timer === undefined) return;
    const value = pending as T;
    clearTimeout(timer);
    timer = undefined;
    // Release the old operation before calling the adapter. Its listeners
    // may accept a newer value or call flush again during this write.
    pending = NOTHING_PENDING;
    persist(value);
  };

  return {
    getSnapshot: () =>
      pending === NOTHING_PENDING
        ? client(adapter.getSearch(), version)
        : pending,
    getServerSnapshot: () =>
      pending === NOTHING_PENDING
        ? server(source.serverSearch?.() ?? "", version)
        : pending,
    subscribe(listener) {
      listeners.add(listener);
      const release = adapter.subscribe(listener);
      return () => {
        listeners.delete(listener);
        release();
      };
    },
    configure(next) {
      const same = shallowEqual(current, next);
      current = next;
      if (!same) version++;
    },
    set(value) {
      const delay = spec.writeDebounceMs ?? 0;
      if (delay <= 0) {
        persist(value);
        return;
      }
      pending = value;
      if (timer !== undefined) clearTimeout(timer);
      // Own the timer before notifying: a subscriber may accept a newer
      // value, flush this one, or dispose its binding synchronously.
      timer = setTimeout(() => {
        flush();
        notify();
      }, delay);
      notify();
    },
    flush,
  };
}
