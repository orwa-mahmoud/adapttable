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
import { DEFAULT_LIMIT } from "../constants";
import {
  type GroupAggregateOverrides,
  parseGroupAggregateOverrides,
  serializeGroupAggregateOverrides,
} from "../grouping/groupAggregateOverrides";
import type { SortLevel } from "../sort/compare";
import type { QueryFilterGroup } from "../source/queryContract";
import type { TableStateMutators } from "../tableStateMutators";
import type {
  ExtraFilters,
  FilterValue,
  SortDirection,
  TableQueryParams,
} from "../types";
import { devWarn } from "../utils/devWarn";
import { memoLast } from "../utils/memoLast";
import {
  FILTER_PREFIX,
  isEmptyFilterValue,
  MAX_LIMIT,
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

/** Whether two plain records hold the same values under the same keys. */
function shallowEqual(
  left: object | undefined,
  right: object | undefined
): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  const leftKeys = Object.keys(left);
  if (leftKeys.length !== Object.keys(right).length) return false;
  return leftKeys.every(
    (key) =>
      Object.hasOwn(right, key) &&
      Object.is(Reflect.get(left, key), Reflect.get(right, key))
  );
}

function namespaceOf(urlKey: string | undefined): string {
  return urlKey ? `${urlKey}.` : "";
}

/* ── Table query state ─────────────────────────────────────────────── */

/**
 * What the table's view state is configured with. Everything here may change
 * between reads; the store compares it value by value.
 *
 * @public
 */
export interface TableViewStateConfig {
  /** Initial values applied while the URL says nothing about a key. */
  readonly defaults?: Partial<TableQueryParams> & { extra?: ExtraFilters };
  /** Extra-filter keys whose values are parsed as numbers. */
  readonly numberExtraKeys?: readonly string[];
  /** Extra-filter keys whose values are comma-separated arrays. */
  readonly arrayExtraKeys?: readonly string[];
}

/**
 * The table's view state at one moment.
 *
 * @public
 */
export interface TableViewState {
  /** Current 1-based page. */
  readonly page: number;
  /** Current page size. */
  readonly limit: number;
  /**
   * Page size applied when the URL has no `limit` param (`defaults.limit`,
   * or 25). Stable across `setLimit` so the rows-per-page list can keep it.
   */
  readonly defaultLimit: number;
  /** Current committed search term. */
  readonly search: string;
  /** Active sort column key, if any. */
  readonly sortBy: string | undefined;
  /** Active sort direction, if any. */
  readonly sortDir: SortDirection | undefined;
  /** The multi-column sort chain, empty when a single sort (or none) applies. */
  readonly sortLevels: readonly SortLevel[];
  /** Active row-grouping keys, comma-separated, if any. */
  readonly groupBy: string | undefined;
  /** Session-level group aggregation choices keyed by column. */
  readonly groupAggregateOverrides: GroupAggregateOverrides;
  /** The extra-filter bag. */
  readonly extra: ExtraFilters;
  /** Nested AND/OR filter tree, when one is in the URL. */
  readonly filterTree: QueryFilterGroup | undefined;
}

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
const namespaceRegistry = new WeakMap<UrlStateAdapter, Map<string, number>>();

/** Stable default for the key registries, so the extra bag keeps its identity. */
const NO_KEYS: readonly string[] = [];

/**
 * The single sort a URL describes, with the defaults applied.
 *
 * A defaulted sort adopts the defaulted direction — else ascending, so
 * `defaults: { sortBy }` alone still yields a real sort (data actually
 * ordered, aria-sort truthful, first header click cycles to descending
 * instead of clearing). An explicit URL sort with no direction falls back to
 * ascending too.
 */
function readSingleSort(
  params: URLSearchParams,
  ns: string,
  defaults: Partial<TableQueryParams>
): { sortBy?: string; sortDir?: SortDirection } {
  const sortByRaw = params.get(ns + PARAM_SORT_BY);
  const sortBy = sortByRaw === null ? defaults.sortBy : sortByRaw || undefined;
  if (sortBy === undefined) return {};
  const sortDirFallback =
    sortByRaw === null ? (defaults.sortDir ?? "asc") : "asc";
  return { sortBy, sortDir: readSortDir(params, ns) ?? sortDirFallback };
}

/**
 * Merge `defaults.extra` under the URL bag, honouring cleared markers: a
 * present-but-empty param means the reader cleared that default.
 */
function mergeDefaultExtra(
  params: URLSearchParams,
  urlBag: ExtraFilters,
  defaultExtra: ExtraFilters | undefined,
  ns: string
): ExtraFilters {
  if (!defaultExtra) return urlBag;
  const out: ExtraFilters = {};
  for (const [key, value] of Object.entries(defaultExtra)) {
    if (params.get(ns + FILTER_PREFIX + key) === null) out[key] = value;
  }
  return { ...out, ...urlBag };
}

/**
 * Create the table's view-state store.
 *
 * `defaults` apply only while the URL is silent about a key. When the reader
 * explicitly clears a defaulted value (clearing the search, removing a filter
 * chip, clear-all), the store records the clearing as an EMPTY-valued param
 * (`q=`, `sortBy=`, `f_status=`) so the default does not instantly
 * resurrect. Without a default for the key the param is simply deleted, so
 * URLs stay clean in the common case.
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
  let current: TableViewStateConfig = config;
  let version = 0;

  const defaultsOf = (): Partial<TableQueryParams> & { extra?: ExtraFilters } =>
    current.defaults ?? {};

  /** One derivation, with its own caches, per snapshot kind. */
  const deriver = () => {
    const params = memoLast((search: string) => parseTableUrlState(search, ns));
    const aggregateOverrides = memoLast((p: URLSearchParams) =>
      parseGroupAggregateOverrides(p.get(ns + PARAM_GROUP_AGGREGATES))
    );
    const sortLevels = memoLast((p: URLSearchParams) => readSortLevels(p, ns));
    const extra = memoLast(
      (
        p: URLSearchParams,
        defaultExtra: ExtraFilters | undefined,
        numberKeys: readonly string[],
        arrayKeys: readonly string[]
      ) =>
        mergeDefaultExtra(
          p,
          readExtra(p, numberKeys, arrayKeys, ns),
          defaultExtra,
          ns
        )
    );
    const filterTree = memoLast((p: URLSearchParams) =>
      readFilterTreeParam(p, ns)
    );
    return memoLast((search: string, _version: number): TableViewState => {
      const defaults = defaultsOf();
      const p = params(search);
      const defaultLimit = defaults.limit ?? DEFAULT_LIMIT;
      const groupByRaw = p.get(ns + PARAM_GROUP_BY);
      const { sortBy, sortDir } = readSingleSort(p, ns, defaults);
      return {
        page: readPage(p, defaults.page ?? 1, ns),
        limit: readLimit(p, defaultLimit, ns),
        defaultLimit,
        search: (p.get(ns + PARAM_SEARCH) ?? defaults.search ?? "").trim(),
        sortBy,
        sortDir,
        sortLevels: sortLevels(p),
        groupBy:
          groupByRaw === null ? defaults.groupBy : groupByRaw || undefined,
        groupAggregateOverrides: aggregateOverrides(p),
        extra: extra(
          p,
          defaults.extra,
          current.numberExtraKeys ?? NO_KEYS,
          current.arrayExtraKeys ?? NO_KEYS
        ),
        filterTree: filterTree(p),
      };
    });
  };

  const client = deriver();
  const server = deriver();

  const commit = (mutate: (next: URLSearchParams) => void): void => {
    adapter.setSearch(updateTableUrlState(adapter.getSearch(), ns, mutate));
  };

  /** Reset to page 1 — as a marker when a non-1 default would resurface. */
  const resetPage = (p: URLSearchParams): void => {
    if ((defaultsOf().page ?? 1) > 1) p.set(ns + PARAM_PAGE, "1");
    else p.delete(ns + PARAM_PAGE);
  };

  /**
   * Write the full extra bag, then stamp a cleared marker for every
   * defaulted key the bag no longer carries — deleting the param instead
   * would resurrect the default on the next read.
   */
  const writeExtraWithDefaults = (
    p: URLSearchParams,
    bag: ExtraFilters
  ): void => {
    writeExtra(p, bag, ns);
    for (const key of Object.keys(defaultsOf().extra ?? {})) {
      if (isEmptyFilterValue(bag[key])) p.set(ns + FILTER_PREFIX + key, "");
    }
  };

  /** The current effective extra bag, read fresh from a params snapshot. */
  const readEffectiveExtra = (p: URLSearchParams): ExtraFilters =>
    mergeDefaultExtra(
      p,
      readExtra(
        p,
        current.numberExtraKeys ?? NO_KEYS,
        current.arrayExtraKeys ?? NO_KEYS,
        ns
      ),
      defaultsOf().extra,
      ns
    );

  /** Delete a param, or stamp it empty when a default would resurface. */
  const clearParam = (
    p: URLSearchParams,
    param: string,
    defaulted: unknown
  ): void => {
    if (defaulted) p.set(ns + param, "");
    else p.delete(ns + param);
  };

  return {
    getSnapshot: () => client(adapter.getSearch(), version),
    getServerSnapshot: () => server(source.serverSearch?.() ?? "", version),
    subscribe: (listener) => adapter.subscribe(listener),
    configure(next) {
      const same =
        shallowEqual(current.defaults, next.defaults) &&
        current.numberExtraKeys === next.numberExtraKeys &&
        current.arrayExtraKeys === next.arrayExtraKeys;
      current = next;
      if (!same) version++;
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
      return () => {
        // The claim above guarantees an entry; drop it at zero so the
        // registry never grows.
        const remaining = counts.get(ns)! - 1;
        if (remaining === 0) counts.delete(ns);
        else counts.set(ns, remaining);
      };
    },
    setPage: (next) =>
      commit((p) => {
        if (next <= 1) resetPage(p);
        else p.set(ns + PARAM_PAGE, String(next));
      }),
    setLimit: (next) =>
      commit((p) => {
        // Keep the written value inside the range the read side accepts so
        // URL and table state never diverge.
        const clamped = Math.min(Math.max(1, Math.round(next)), MAX_LIMIT);
        if (clamped === (defaultsOf().limit ?? DEFAULT_LIMIT)) {
          p.delete(ns + PARAM_LIMIT);
        } else {
          p.set(ns + PARAM_LIMIT, String(clamped));
        }
        resetPage(p);
      }),
    setSearch: (next) =>
      commit((p) => {
        const trimmed = next.trim();
        if (trimmed === "") clearParam(p, PARAM_SEARCH, defaultsOf().search);
        else p.set(ns + PARAM_SEARCH, trimmed);
        resetPage(p);
      }),
    setSort: (key, dir: SortDirection = "asc") =>
      commit((p) => {
        // A plain (single) sort RESETS any multi-sort chain — otherwise the
        // chain keeps superseding it and the click appears dead.
        writeSortLevels(p, [], ns);
        if (key) {
          p.set(ns + PARAM_SORT_BY, key);
          p.set(ns + PARAM_SORT_DIR, dir);
        } else {
          clearParam(p, PARAM_SORT_BY, defaultsOf().sortBy);
          p.delete(ns + PARAM_SORT_DIR);
        }
        resetPage(p);
      }),
    setGroupBy: (key) =>
      commit((p) => {
        if (key) p.set(ns + PARAM_GROUP_BY, key);
        else clearParam(p, PARAM_GROUP_BY, defaultsOf().groupBy);
        resetPage(p);
      }),
    initializeGroupBy: (key) =>
      commit((p) => {
        if (p.has(ns + PARAM_GROUP_BY)) return;
        p.set(ns + PARAM_GROUP_BY, key);
        resetPage(p);
      }),
    setGroupAggregateOverrides: (overrides) =>
      commit((p) => {
        const encoded = serializeGroupAggregateOverrides(overrides);
        if (encoded) p.set(ns + PARAM_GROUP_AGGREGATES, encoded);
        else p.delete(ns + PARAM_GROUP_AGGREGATES);
        resetPage(p);
      }),
    toggleSortLevel: (key) =>
      commit((p) => {
        const defaults = defaultsOf();
        const chain = readSortLevels(p, ns);
        // Starting a chain keeps the current single sort as its first level,
        // so click Name then shift-click Salary sorts Name → Salary.
        const single = readSingleSort(p, ns, {
          sortBy: defaults.sortBy,
          sortDir: defaults.sortDir,
        });
        const seeded =
          chain.length === 0 && single.sortBy !== undefined
            ? { key: single.sortBy, dir: single.sortDir ?? "asc" }
            : undefined;
        const levels: SortLevel[] = seeded ? [seeded] : [...chain];
        const index = levels.findIndex((level) => level.key === key);
        if (index === -1) levels.push({ key, dir: "asc" });
        else if (levels[index]!.dir === "asc") {
          levels[index] = { key, dir: "desc" };
        } else levels.splice(index, 1);
        writeSortLevels(p, levels, ns);
        // The chain supersedes the single-sort params while present; a seeded
        // sort toggled away clears them the way `setSort(undefined)` does.
        if (levels.length > 0) {
          p.delete(ns + PARAM_SORT_BY);
          p.delete(ns + PARAM_SORT_DIR);
        } else if (seeded) {
          clearParam(p, PARAM_SORT_BY, defaults.sortBy);
          p.delete(ns + PARAM_SORT_DIR);
        }
        resetPage(p);
      }),
    setExtra: (key: string, value: FilterValue) =>
      commit((p) => {
        writeExtraWithDefaults(p, { ...readEffectiveExtra(p), [key]: value });
        resetPage(p);
      }),
    setExtras: (updates) =>
      commit((p) => {
        writeExtraWithDefaults(p, { ...readEffectiveExtra(p), ...updates });
        resetPage(p);
      }),
    setFilterTree: (tree) =>
      commit((p) => {
        writeFilterTreeParam(p, tree, ns);
        resetPage(p);
      }),
    clearExtras: () =>
      commit((p) => {
        writeExtraWithDefaults(p, {});
        resetPage(p);
      }),
    clearAll: () =>
      commit((p) => {
        const defaults = defaultsOf();
        clearParam(p, PARAM_SEARCH, defaults.search);
        // The multi-sort chain supersedes the single-sort params, so "clear
        // all" must drop it too or the rows visibly stay sorted.
        writeSortLevels(p, [], ns);
        clearParam(p, PARAM_SORT_BY, defaults.sortBy);
        p.delete(ns + PARAM_SORT_DIR);
        clearParam(p, PARAM_GROUP_BY, defaults.groupBy);
        p.delete(ns + PARAM_GROUP_AGGREGATES);
        resetPage(p);
        writeExtraWithDefaults(p, {});
        writeFilterTreeParam(p, undefined, ns);
      }),
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

const NOTHING_PENDING: unique symbol = Symbol("nothing pending");

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
      notify();
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        persist(value);
        pending = NOTHING_PENDING;
        notify();
      }, delay);
    },
    flush() {
      if (timer === undefined) return;
      clearTimeout(timer);
      timer = undefined;
      // A live timer implies a pending value — the timeout clears the timer
      // before it clears the value.
      persist(pending as T);
      pending = NOTHING_PENDING;
    },
  };
}
