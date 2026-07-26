import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

import { DEFAULT_LIMIT } from "../constants";
import type { TableStateMutators } from "../tableStateMutators";
import type {
  ExtraFilters,
  FilterValue,
  SortDirection,
  TableQueryParams,
} from "../types";
import { devWarn } from "../utils/devWarn";
import { type UrlStateAdapter, useResolvedAdapter } from "./adapter";
import {
  FILTER_PREFIX,
  isEmptyFilterValue,
  MAX_LIMIT,
  PARAM_GROUP_BY,
  PARAM_LIMIT,
  PARAM_PAGE,
  PARAM_SEARCH,
  PARAM_SORT_BY,
  PARAM_SORT_DIR,
  readExtra,
  readLimit,
  readPage,
  readSortDir,
  readSortLevels,
  writeExtra,
  writeSortLevels,
} from "./serialize";

/** Options for {@link useTableUrlState}. */
export interface UseTableUrlStateOptions {
  /**
   * URL-state backend. Defaults to the browser History API. Supply a
   * router-specific adapter (react-router / Next.js) to integrate with an
   * existing navigation stack.
   */
  adapter?: UrlStateAdapter;
  /**
   * When `false`, state is kept in a component-local memory store instead
   * of the URL — the table still works fully, it just isn't shareable.
   * Defaults to `true`.
   */
  enabled?: boolean;
  /** Initial values applied when the URL has no value for a key. */
  defaults?: Partial<TableQueryParams> & { extra?: ExtraFilters };
  /** Extra-filter keys whose values are parsed as numbers. */
  numberExtraKeys?: readonly string[];
  /** Extra-filter keys whose values are comma-separated arrays. */
  arrayExtraKeys?: readonly string[];
  /**
   * Namespace for this table's URL params, so multiple tables can share one
   * URL without colliding. With `urlKey="left"` the params become
   * `left.q`, `left.page`, `left.f_status`, … Omit for the bare keys.
   */
  urlKey?: string;
}

/** State + setters returned by {@link useTableUrlState}. */
export interface UseTableUrlStateResult extends TableStateMutators {
  /** Current 1-based page. */
  page: number;
  /** Current page size. */
  limit: number;
  /** Current committed search term. */
  search: string;
  /** Active sort column key, if any. */
  sortBy: string | undefined;
  /** Active sort direction, if any. */
  sortDir: SortDirection | undefined;
  /** Active single-level row-grouping column key, if any. */
  groupBy: string | undefined;
  /** The extra-filter bag. */
  extra: ExtraFilters;
}

/** Mounted namespaces per adapter, for the duplicate-urlKey dev warning. */
const nsRegistry = new WeakMap<UrlStateAdapter, Map<string, number>>();

/**
 * Stable default for the key registries. Destructuring defaults (`= []`)
 * would mint a fresh array per render, invalidating the `extra` memo and
 * re-running the host's whole filter/sort pipeline on EVERY re-render.
 */
const NO_KEYS: readonly string[] = [];

/**
 * Headless URL-synced table state. Keeps page / limit / search / sort and
 * an arbitrary `extra` filter bag in the query string (or a local store
 * when disabled), so reloads, shared links, and back/forward all restore
 * the exact slice. Decoupled from any router via {@link UrlStateAdapter}.
 *
 * `defaults` apply only while the URL is silent about a key. When the user
 * explicitly clears a defaulted value (clearing the search, removing a
 * filter chip, clear-all), the hook records the clearing as an EMPTY-valued
 * param (`q=`, `sortBy=`, `f_status=`) so the default does not instantly
 * resurrect. Without a default for the key the param is simply deleted, so
 * URLs stay clean in the common case.
 *
 * @param options - See {@link UseTableUrlStateOptions}.
 * @returns The current state and its setters.
 */
export function useTableUrlState(
  options: UseTableUrlStateOptions = {}
): UseTableUrlStateResult {
  const {
    adapter,
    enabled = true,
    defaults = {},
    numberExtraKeys = NO_KEYS,
    arrayExtraKeys = NO_KEYS,
    urlKey,
  } = options;
  // Per-table namespace, e.g. "left." → left.q / left.page / left.f_status.
  const ns = urlKey ? `${urlKey}.` : "";

  const resolved = useResolvedAdapter(adapter, enabled);
  // Server snapshot: with the default (history) adapter the server rendered
  // from an empty memory store, so hydration must read "" too — the real URL
  // applies right after hydration. An EXPLICIT adapter is assumed to be
  // SSR-consistent (e.g. a router adapter that knows the request URL).
  const search = useSyncExternalStore(
    (onChange) => resolved.subscribe(onChange),
    () => resolved.getSearch(),
    () => (adapter ? adapter.getSearch() : "")
  );
  const params = useMemo(() => new URLSearchParams(search), [search]);

  // Two tables on one adapter without distinct urlKeys silently clobber each
  // other's params — catch it in development.
  useEffect(() => {
    const counts = nsRegistry.get(resolved) ?? new Map<string, number>();
    nsRegistry.set(resolved, counts);
    const next = (counts.get(ns) ?? 0) + 1;
    counts.set(ns, next);
    if (next > 1) {
      devWarn(
        `two tables share the URL namespace "${ns || "(bare)"}" — give each table a distinct \`urlKey\` or their state will clobber each other.`
      );
    }
    return () => {
      // The registration above guarantees an entry; drop it at zero so the
      // registry never grows.
      const remaining = counts.get(ns)! - 1;
      if (remaining === 0) counts.delete(ns);
      else counts.set(ns, remaining);
    };
  }, [resolved, ns]);

  const initialLimit = defaults.limit ?? DEFAULT_LIMIT;
  const initialPage = defaults.page ?? 1;
  const page = readPage(params, initialPage, ns);
  const limit = readLimit(params, initialLimit, ns);
  // An empty-valued param is an explicit "cleared" marker (see the hook
  // docs): the URL overrides the default with nothing.
  const searchTerm = (
    params.get(ns + PARAM_SEARCH) ??
    defaults.search ??
    ""
  ).trim();
  const sortByRaw = params.get(ns + PARAM_SORT_BY);
  const sortBy = sortByRaw === null ? defaults.sortBy : sortByRaw || undefined;
  // A defaulted sort adopts the defaulted direction; an explicit URL sort
  // with no direction falls back to ascending.
  const sortDirFallback = sortByRaw === null ? defaults.sortDir : "asc";
  const sortDir =
    sortBy === undefined
      ? undefined
      : (readSortDir(params, ns) ?? sortDirFallback);
  const groupByRaw = params.get(ns + PARAM_GROUP_BY);
  const groupBy =
    groupByRaw === null ? defaults.groupBy : groupByRaw || undefined;
  const sortLevels = useMemo(() => readSortLevels(params, ns), [params, ns]);

  /** Merge `defaults.extra` under the URL bag, honouring cleared markers. */
  const mergeDefaultExtra = useCallback(
    (p: URLSearchParams, urlBag: ExtraFilters): ExtraFilters => {
      if (!defaults.extra) return urlBag;
      const out: ExtraFilters = {};
      for (const [key, value] of Object.entries(defaults.extra)) {
        // A present-but-empty param means the user cleared this default.
        if (p.get(ns + FILTER_PREFIX + key) === null) out[key] = value;
      }
      return { ...out, ...urlBag };
    },
    [defaults.extra, ns]
  );

  const extra = useMemo<ExtraFilters>(
    () =>
      mergeDefaultExtra(
        params,
        readExtra(params, numberExtraKeys, arrayExtraKeys, ns)
      ),
    [mergeDefaultExtra, params, numberExtraKeys, arrayExtraKeys, ns]
  );

  const commit = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(resolved.getSearch());
      mutate(next);
      resolved.setSearch(next.toString());
    },
    [resolved]
  );

  /**
   * Write the full extra bag, then stamp a cleared marker for every
   * defaulted key the bag no longer carries — deleting the param instead
   * would resurrect the default on the next read.
   */
  const writeExtraWithDefaults = useCallback(
    (p: URLSearchParams, bag: ExtraFilters) => {
      writeExtra(p, bag, ns);
      for (const key of Object.keys(defaults.extra ?? {})) {
        if (isEmptyFilterValue(bag[key])) p.set(ns + FILTER_PREFIX + key, "");
      }
    },
    [defaults.extra, ns]
  );

  /** The current effective extra bag read fresh from a params snapshot. */
  const readEffectiveExtra = useCallback(
    (p: URLSearchParams): ExtraFilters =>
      mergeDefaultExtra(p, readExtra(p, numberExtraKeys, arrayExtraKeys, ns)),
    [mergeDefaultExtra, numberExtraKeys, arrayExtraKeys, ns]
  );

  /** Reset to page 1 — as a marker when a non-1 default would resurface. */
  const resetPage = useCallback(
    (p: URLSearchParams) => {
      if (initialPage > 1) p.set(ns + PARAM_PAGE, "1");
      else p.delete(ns + PARAM_PAGE);
    },
    [initialPage, ns]
  );

  const setPage = useCallback(
    (next: number) =>
      commit((p) => {
        if (next <= 1) resetPage(p);
        else p.set(ns + PARAM_PAGE, String(next));
      }),
    [commit, ns, resetPage]
  );

  const setLimit = useCallback(
    (next: number) =>
      commit((p) => {
        // Keep the written value inside the range the read side accepts
        // so URL and table state never diverge.
        const clamped = Math.min(Math.max(1, Math.round(next)), MAX_LIMIT);
        if (clamped === initialLimit) p.delete(ns + PARAM_LIMIT);
        else p.set(ns + PARAM_LIMIT, String(clamped));
        resetPage(p);
      }),
    [commit, initialLimit, ns, resetPage]
  );

  const setSearch = useCallback(
    (next: string) =>
      commit((p) => {
        const trimmed = next.trim();
        if (trimmed !== "") p.set(ns + PARAM_SEARCH, trimmed);
        else if (defaults.search) p.set(ns + PARAM_SEARCH, "");
        else p.delete(ns + PARAM_SEARCH);
        resetPage(p);
      }),
    [commit, defaults.search, ns, resetPage]
  );

  const setSort = useCallback(
    (key: string | undefined, dir: SortDirection = "asc") =>
      commit((p) => {
        // A plain (single) sort RESETS any multi-sort chain — otherwise the
        // chain keeps superseding it and the click appears dead.
        writeSortLevels(p, [], ns);
        if (key) {
          p.set(ns + PARAM_SORT_BY, key);
          p.set(ns + PARAM_SORT_DIR, dir);
        } else {
          if (defaults.sortBy) p.set(ns + PARAM_SORT_BY, "");
          else p.delete(ns + PARAM_SORT_BY);
          p.delete(ns + PARAM_SORT_DIR);
        }
        resetPage(p);
      }),
    [commit, defaults.sortBy, ns, resetPage]
  );

  const setGroupBy = useCallback(
    (key: string | undefined) =>
      commit((p) => {
        if (key) p.set(ns + PARAM_GROUP_BY, key);
        else if (defaults.groupBy) p.set(ns + PARAM_GROUP_BY, "");
        else p.delete(ns + PARAM_GROUP_BY);
        resetPage(p);
      }),
    [commit, defaults.groupBy, ns, resetPage]
  );

  const toggleSortLevel = useCallback(
    (key: string) =>
      commit((p) => {
        const levels = [...readSortLevels(p, ns)];
        const index = levels.findIndex((l) => l.key === key);
        if (index === -1) levels.push({ key, dir: "asc" });
        else if (levels[index]!.dir === "asc")
          levels[index] = { key, dir: "desc" };
        else levels.splice(index, 1);
        writeSortLevels(p, levels, ns);
        // The chain supersedes the single-sort params while present.
        if (levels.length > 0) {
          p.delete(ns + PARAM_SORT_BY);
          p.delete(ns + PARAM_SORT_DIR);
        }
        resetPage(p);
      }),
    [commit, ns, resetPage]
  );

  const setExtra = useCallback(
    (key: string, value: FilterValue) =>
      commit((p) => {
        writeExtraWithDefaults(p, { ...readEffectiveExtra(p), [key]: value });
        resetPage(p);
      }),
    [commit, readEffectiveExtra, resetPage, writeExtraWithDefaults]
  );

  const setExtras = useCallback(
    (updates: ExtraFilters) =>
      commit((p) => {
        writeExtraWithDefaults(p, { ...readEffectiveExtra(p), ...updates });
        resetPage(p);
      }),
    [commit, readEffectiveExtra, resetPage, writeExtraWithDefaults]
  );

  const clearExtras = useCallback(
    () =>
      commit((p) => {
        writeExtraWithDefaults(p, {});
        resetPage(p);
      }),
    [commit, resetPage, writeExtraWithDefaults]
  );

  const clearAll = useCallback(
    () =>
      commit((p) => {
        if (defaults.search) p.set(ns + PARAM_SEARCH, "");
        else p.delete(ns + PARAM_SEARCH);
        // The multi-sort chain supersedes the single-sort params, so "clear
        // all" must drop it too or the rows visibly stay sorted.
        writeSortLevels(p, [], ns);
        if (defaults.sortBy) p.set(ns + PARAM_SORT_BY, "");
        else p.delete(ns + PARAM_SORT_BY);
        p.delete(ns + PARAM_SORT_DIR);
        if (defaults.groupBy) p.set(ns + PARAM_GROUP_BY, "");
        else p.delete(ns + PARAM_GROUP_BY);
        resetPage(p);
        writeExtraWithDefaults(p, {});
      }),
    [
      commit,
      defaults.search,
      defaults.sortBy,
      defaults.groupBy,
      ns,
      resetPage,
      writeExtraWithDefaults,
    ]
  );

  return {
    page,
    limit,
    search: searchTerm,
    sortBy,
    sortDir,
    groupBy,
    extra,
    setPage,
    setLimit,
    setSort,
    setGroupBy,
    sortLevels,
    toggleSortLevel,
    setSearch,
    setExtra,
    setExtras,
    clearExtras,
    clearAll,
  };
}
