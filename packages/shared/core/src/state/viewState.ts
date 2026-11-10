/**
 * The table's view state as a store slice: page, page size, search, sort,
 * grouping, group aggregation, extra filters and the filter tree.
 *
 * The slice holds what the reader set — the overrides — over the defaults
 * the table is configured with. An empty value is a clearing: a reader who
 * clears a defaulted search, sort, grouping or filter keeps it cleared, so
 * the default does not come back. The effective view is read from both.
 *
 * Every change is a named action. URL sync, saved views and history are
 * readers and dispatchers of this slice; a table that uses none of them
 * loads none of their code.
 */
import { DEFAULT_LIMIT, MAX_LIMIT } from "../constants";
import type {
  ExtraFilters,
  FilterValue,
  SortDirection,
} from "../contracts/columns";
import type { QueryFilterGroup, SortLevel } from "../contracts/query";
import type { GroupAggregateOverrides } from "../grouping/groupAggregateOverrides";
import type { TableQueryParams } from "../types";
import { joinListParam, splitListParam } from "../utils/listParam";
import { memoLast } from "../utils/memoLast";
import { sameItems } from "../utils/sameItems";
import {
  type ActionDefinition,
  defineAction,
  defineSlice,
  type StoreWriter,
} from "./tableStore";

/**
 * What the table's view state is configured with. Everything here may change
 * between reads; the store compares it value by value.
 *
 * @public
 */
export interface TableViewStateConfig {
  /** Initial values applied while the reader has not set a key. */
  readonly defaults?: Partial<TableQueryParams> & { extra?: ExtraFilters };
  /** Extra-filter keys whose values are numbers. */
  readonly numberExtraKeys?: readonly string[];
  /** Extra-filter keys whose values are lists. */
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
   * Page size applied when the reader has not chosen one (`defaults.limit`,
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
  /** Nested AND/OR filter tree, when one applies. */
  readonly filterTree: QueryFilterGroup | undefined;
}

/**
 * What the reader set, over the defaults. An empty string or an empty extra
 * value marks a clearing of a defaulted value.
 *
 * @public
 */
export interface ViewOverrides {
  readonly page?: number;
  readonly limit?: number;
  readonly search?: string;
  readonly sortBy?: string;
  readonly sortDir?: SortDirection;
  readonly sortLevels?: readonly SortLevel[];
  readonly groupBy?: string;
  readonly groupAggregateOverrides?: GroupAggregateOverrides;
  /** The whole bag once the reader wrote one, cleared defaults as empties. */
  readonly extra?: ExtraFilters;
  readonly filterTree?: QueryFilterGroup;
}

const NO_KEYS: readonly string[] = [];
const NO_LEVELS: readonly SortLevel[] = [];
const NO_OVERRIDES: GroupAggregateOverrides = {};

/** Whether two plain records hold the same values under the same keys. */
export function shallowEqual(
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

/** Whether two sort chains name the same levels in the same order. */
export function sameSortLevels(
  a: readonly SortLevel[] | undefined,
  b: readonly SortLevel[] | undefined
): boolean {
  if (a === b) return true;
  if (a?.length !== b?.length) return false;
  return (a ?? NO_LEVELS).every(
    (level, index) =>
      level.key === b?.[index]?.key && level.dir === b[index]?.dir
  );
}

function sameOverrides(a: ViewOverrides, b: ViewOverrides): boolean {
  return (
    a === b ||
    (a.page === b.page &&
      a.limit === b.limit &&
      a.search === b.search &&
      a.sortBy === b.sortBy &&
      a.sortDir === b.sortDir &&
      sameSortLevels(a.sortLevels, b.sortLevels) &&
      a.groupBy === b.groupBy &&
      shallowEqual(a.groupAggregateOverrides, b.groupAggregateOverrides) &&
      shallowEqual(a.extra, b.extra) &&
      a.filterTree === b.filterTree)
  );
}

/** Whether two configurations hold the same defaults and the same keys. */
export function sameViewConfig(
  a: TableViewStateConfig,
  b: TableViewStateConfig
): boolean {
  return (
    shallowEqual(a.defaults, b.defaults) &&
    sameItems(a.numberExtraKeys ?? NO_KEYS, b.numberExtraKeys ?? NO_KEYS) &&
    sameItems(a.arrayExtraKeys ?? NO_KEYS, b.arrayExtraKeys ?? NO_KEYS)
  );
}

/** What the reader set. */
export const VIEW_OVERRIDES = defineSlice<ViewOverrides>(
  "view/overrides",
  () => ({}),
  sameOverrides
);

/**
 * The keys the last view action wrote, changed or not, so a mirror such as a
 * URL rewrites exactly the values the action set.
 */
export const VIEW_WRITTEN = defineSlice<ReadonlySet<PropertyKey>>(
  "view/written",
  () => new Set()
);

/** What the view state is configured with. */
export const VIEW_CONFIG = defineSlice<TableViewStateConfig>(
  "view/config",
  () => ({}),
  sameViewConfig
);

/** Whether an extra value counts as no value. */
export function isEmptyFilterValue(value: FilterValue): boolean {
  if (value == null || value === "") return true;
  return Array.isArray(value) && value.length === 0;
}

/**
 * An extra value as the view state keeps it: a number for a number key, a
 * list of trimmed entries for a list key, text otherwise. A list for a key
 * that is not a list key is kept as its encoded entries joined by commas,
 * which is how the view state has always written one.
 */
function keptExtraValue(
  key: string,
  value: FilterValue,
  config: TableViewStateConfig
): FilterValue | undefined {
  let keep: (value: FilterValue) => FilterValue | undefined = keptText;
  if ((config.arrayExtraKeys ?? NO_KEYS).includes(key)) keep = keptList;
  else if ((config.numberExtraKeys ?? NO_KEYS).includes(key)) keep = keptNumber;
  return isEmptyFilterValue(value) ? undefined : keep(value);
}

/** Entries trimmed, empty ones dropped; text splits at its commas. */
function keptList(value: FilterValue): string[] | undefined {
  const kept = Array.isArray(value)
    ? value.map((entry) => String(entry).trim()).filter(Boolean)
    : splitListParam(String(value));
  return kept.length > 0 ? kept : undefined;
}

/** A list joins its encoded entries with commas. */
function keptText(value: FilterValue): string | undefined {
  const text = Array.isArray(value) ? joinListParam(value) : String(value);
  return text === "" ? undefined : text;
}

function keptNumber(value: FilterValue): number | undefined {
  const text = keptText(value);
  const number = Number(text);
  return text !== undefined && Number.isFinite(number) ? number : undefined;
}

/**
 * The bag a write keeps: each value as the view state keeps it, and an empty
 * marker for every defaulted key the bag clears.
 */
function keptExtra(
  bag: ExtraFilters,
  config: TableViewStateConfig
): ExtraFilters {
  const kept: ExtraFilters = {};
  for (const [key, value] of Object.entries(bag)) {
    const next = keptExtraValue(key, value, config);
    if (next !== undefined) kept[key] = next;
  }
  for (const key of Object.keys(config.defaults?.extra ?? {})) {
    kept[key] ??= "";
  }
  return kept;
}

/** The effective bag: defaults the reader has not touched, then theirs. */
function effectiveExtra(
  overrides: ExtraFilters | undefined,
  defaults: ExtraFilters | undefined
): ExtraFilters {
  const out: ExtraFilters = {};
  for (const [key, value] of Object.entries(defaults ?? {})) {
    if (overrides?.[key] === undefined) out[key] = value;
  }
  for (const [key, value] of Object.entries(overrides ?? {})) {
    if (!isEmptyFilterValue(value)) out[key] = value;
  }
  return out;
}

/**
 * The single sort the overrides describe, with the defaults applied. A
 * defaulted sort takes the defaulted direction, else ascending, so
 * `defaults: { sortBy }` alone still sorts; a set sort with no direction
 * sorts ascending.
 */
function singleSort(
  overrides: ViewOverrides,
  defaults: Partial<TableQueryParams>
): { sortBy?: string; sortDir?: SortDirection } {
  const set = overrides.sortBy !== undefined;
  const sortBy = set ? overrides.sortBy || undefined : defaults.sortBy;
  if (sortBy === undefined) return {};
  const fallback = set ? "asc" : (defaults.sortDir ?? "asc");
  return { sortBy, sortDir: overrides.sortDir ?? fallback };
}

/**
 * A reader of the effective view: the same object until the overrides or
 * the configuration change.
 */
export function viewStateReader(): (
  overrides: ViewOverrides,
  config: TableViewStateConfig
) => TableViewState {
  const extraOf = memoLast(effectiveExtra);
  return memoLast((overrides, config): TableViewState => {
    const defaults = config.defaults ?? {};
    const defaultLimit = defaults.limit ?? DEFAULT_LIMIT;
    const { sortBy, sortDir } = singleSort(overrides, defaults);
    return {
      page: overrides.page ?? defaults.page ?? 1,
      limit: overrides.limit ?? defaultLimit,
      defaultLimit,
      search: (overrides.search ?? defaults.search ?? "").trim(),
      sortBy,
      sortDir,
      sortLevels: overrides.sortLevels ?? NO_LEVELS,
      groupBy:
        overrides.groupBy === undefined
          ? defaults.groupBy
          : overrides.groupBy || undefined,
      groupAggregateOverrides:
        overrides.groupAggregateOverrides ?? NO_OVERRIDES,
      extra: extraOf(overrides.extra, defaults.extra),
      filterTree: overrides.filterTree,
    };
  });
}

/* ── Actions ───────────────────────────────────────────────────────── */

type Overrides = { -readonly [K in keyof ViewOverrides]: ViewOverrides[K] };

/** Change the overrides through a draft; every change returns to page 1. */
function edit(
  store: StoreWriter,
  change: (draft: Overrides, config: TableViewStateConfig) => void,
  keepPage = false
): void {
  const config = store.read(VIEW_CONFIG);
  const draft: Overrides = { ...store.read(VIEW_OVERRIDES) };
  const written = new Set<PropertyKey>();
  const tracked = new Proxy(draft, {
    set(target, key, value) {
      written.add(key);
      return Reflect.set(target, key, value);
    },
    deleteProperty(target, key) {
      written.add(key);
      return Reflect.deleteProperty(target, key);
    },
  });
  change(tracked, config);
  if (!keepPage) resetPage(tracked, config);
  store.write(VIEW_OVERRIDES, withoutUnset(draft));
  store.write(VIEW_WRITTEN, written);
}

/** Back to page 1 — kept as a set page when a later default page would return. */
function resetPage(draft: Overrides, config: TableViewStateConfig): void {
  if ((config.defaults?.page ?? 1) > 1) draft.page = 1;
  else delete draft.page;
}

/** The draft without keys set to `undefined`, so equal views compare equal. */
function withoutUnset(draft: Overrides): ViewOverrides {
  const out: Overrides = {};
  for (const key of Object.keys(draft)) {
    const value: unknown = Reflect.get(draft, key);
    if (value !== undefined) Reflect.set(out, key, value);
  }
  return out;
}

/** Clear a value: an empty marker when a default would come back, else unset. */
function cleared(defaulted: unknown): "" | undefined {
  return defaulted ? "" : undefined;
}

/** Go to a page. */
export const setPage: ActionDefinition<number> = defineAction(
  "view/setPage",
  (store, page) =>
    edit(
      store,
      (draft, config) => {
        if (page <= 1) resetPage(draft, config);
        else draft.page = page;
      },
      true
    )
);

/** Change the page size, within 1 and the maximum; back to page 1. */
export const setLimit: ActionDefinition<number> = defineAction(
  "view/setLimit",
  (store, limit) =>
    edit(store, (draft, config) => {
      const clamped = Math.min(Math.max(1, Math.round(limit)), MAX_LIMIT);
      draft.limit =
        clamped === (config.defaults?.limit ?? DEFAULT_LIMIT)
          ? undefined
          : clamped;
    })
);

/** Search for a term; back to page 1. */
export const setSearch: ActionDefinition<string> = defineAction(
  "view/setSearch",
  (store, search) =>
    edit(store, (draft, config) => {
      const trimmed = search.trim();
      draft.search =
        trimmed === "" ? cleared(config.defaults?.search) : trimmed;
    })
);

/** Sort by one column, dropping any sort chain; back to page 1. */
export const setSort: ActionDefinition<{
  readonly key: string | undefined;
  readonly dir?: SortDirection;
}> = defineAction("view/setSort", (store, { key, dir = "asc" }) =>
  edit(store, (draft, config) => {
    draft.sortLevels = undefined;
    if (key) {
      draft.sortBy = key;
      draft.sortDir = dir;
    } else {
      draft.sortBy = cleared(config.defaults?.sortBy);
      draft.sortDir = undefined;
    }
  })
);

/**
 * Add a column to the sort chain, flip it, or take it off. Starting a chain
 * keeps the current single sort as its first level.
 */
export const toggleSortLevel: ActionDefinition<string> = defineAction(
  "view/toggleSortLevel",
  (store, key) =>
    edit(store, (draft, config) => {
      const defaults = config.defaults ?? {};
      const chain = draft.sortLevels ?? NO_LEVELS;
      const single = singleSort(draft, defaults);
      const seeded =
        chain.length === 0 && single.sortBy !== undefined
          ? { key: single.sortBy, dir: single.sortDir ?? "asc" }
          : undefined;
      const levels: SortLevel[] = seeded ? [seeded] : [...chain];
      const index = levels.findIndex((level) => level.key === key);
      if (index === -1) levels.push({ key, dir: "asc" });
      else if (levels[index]!.dir === "asc")
        levels[index] = { key, dir: "desc" };
      else levels.splice(index, 1);
      draft.sortLevels = levels.length > 0 ? levels : undefined;
      if (levels.length > 0) {
        draft.sortBy = undefined;
        draft.sortDir = undefined;
      } else if (seeded) {
        draft.sortBy = cleared(defaults.sortBy);
        draft.sortDir = undefined;
      }
    })
);

/** Group by these keys (comma-separated), or by nothing; back to page 1. */
export const setGroupBy: ActionDefinition<string | undefined> = defineAction(
  "view/setGroupBy",
  (store, key) =>
    edit(store, (draft) => {
      draft.groupBy = key ?? "";
    })
);

/** Group by these keys unless the reader has already chosen; back to page 1. */
export const initializeGroupBy: ActionDefinition<string> = defineAction(
  "view/initializeGroupBy",
  (store, key) => {
    if (store.read(VIEW_OVERRIDES).groupBy !== undefined) return;
    edit(store, (draft) => {
      draft.groupBy = key;
    });
  }
);

/** Choose each column's group aggregation; back to page 1. */
export const setGroupAggregateOverrides: ActionDefinition<GroupAggregateOverrides> =
  defineAction("view/setGroupAggregateOverrides", (store, overrides) =>
    edit(store, (draft) => {
      draft.groupAggregateOverrides =
        Object.keys(overrides).length > 0 ? overrides : undefined;
    })
  );

/** The bag the reader sees now: defaults they have not touched, then theirs. */
function currentExtra(
  draft: ViewOverrides,
  config: TableViewStateConfig
): ExtraFilters {
  return effectiveExtra(draft.extra, config.defaults?.extra);
}

/** Set one extra filter; back to page 1. */
export const setExtra: ActionDefinition<{
  readonly key: string;
  readonly value: FilterValue;
}> = defineAction("view/setExtra", (store, { key, value }) =>
  edit(store, (draft, config) => {
    draft.extra = keptExtra(
      { ...currentExtra(draft, config), [key]: value },
      config
    );
  })
);

/** Set several extra filters at once; back to page 1. */
export const setExtras: ActionDefinition<ExtraFilters> = defineAction(
  "view/setExtras",
  (store, updates) =>
    edit(store, (draft, config) => {
      draft.extra = keptExtra(
        { ...currentExtra(draft, config), ...updates },
        config
      );
    })
);

/** Clear every extra filter, defaults included; back to page 1. */
export const clearExtras: ActionDefinition<void> = defineAction(
  "view/clearExtras",
  (store) =>
    edit(store, (draft, config) => {
      draft.extra = keptExtra({}, config);
    })
);

/** Replace the filter tree; back to page 1. */
export const setFilterTree: ActionDefinition<QueryFilterGroup | undefined> =
  defineAction("view/setFilterTree", (store, tree) =>
    edit(store, (draft) => {
      draft.filterTree = tree;
    })
  );

/**
 * Clear the search, the sort, the grouping, its aggregation, every extra
 * filter and the filter tree; back to page 1.
 */
export const clearAll: ActionDefinition<void> = defineAction(
  "view/clearAll",
  (store) =>
    edit(store, (draft, config) => {
      const defaults = config.defaults ?? {};
      draft.search = cleared(defaults.search);
      draft.sortLevels = undefined;
      draft.sortBy = cleared(defaults.sortBy);
      draft.sortDir = undefined;
      draft.groupBy = cleared(defaults.groupBy);
      draft.groupAggregateOverrides = undefined;
      draft.extra = keptExtra({}, config);
      draft.filterTree = undefined;
    })
);

/** Replace what the reader set, as a URL or a saved view hands it back. */
export const replaceOverrides: ActionDefinition<ViewOverrides> = defineAction(
  "view/replaceOverrides",
  (store, overrides) => store.write(VIEW_OVERRIDES, overrides)
);

/** Configure the defaults and the extra-filter keys. */
export const configureView: ActionDefinition<TableViewStateConfig> =
  defineAction("view/configure", (store, config) =>
    store.write(VIEW_CONFIG, config)
  );
