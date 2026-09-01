import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { resolveColumns } from "../columns/resolveColumns";
import type { FeatureHostState } from "../features/currentHost";
import type { FacetMap } from "../filters/facets";
import type { FilterDef, FilterRuntime } from "../filters/filterDefs";
import type { FilterEngine } from "../filters/filterEngine";
import type {
  FilterTypeRegistry,
  FilterTypeSpec,
} from "../filters/filterRegistry";
import type {
  ColumnDef,
  ExtraFilters,
  PaginationMode,
  SortableValue,
} from "../types";
import type { UseTableUrlStateOptions } from "../url/useTableUrlState";
import { devWarn } from "../utils/devWarn";
import { stableKey } from "../utils/stableKey";
import { isDeclarativeFilters } from "./isDeclarativeFilters";
import type { QuerySupport } from "./queryContract";
import type { TableSource } from "./TableSource";
import { useFrontendData } from "./useFrontendData";
import {
  type TableQuery,
  useServerData,
  type UseServerDataOptions,
} from "./useServerData";

export type { UseServerDataOptions };

const EMPTY_REGISTRY: FilterTypeRegistry = {
  get: () => undefined,
  has: () => false,
  types: () => [],
  register() {
    return EMPTY_REGISTRY;
  },
  extend() {
    return EMPTY_REGISTRY;
  },
};

const EMPTY_RUNTIME: FilterRuntime<never> = {
  defs: [],
  arrayExtraKeys: [],
  numberExtraKeys: [],
  filterLabels: {},
  filterFn: () => true,
  registry: EMPTY_REGISTRY,
};

/**
 * Options for {@link useTableData}.
 *
 * @public
 */
export interface UseTableDataOptions<TRow> extends Pick<
  UseTableUrlStateOptions,
  "urlAdapter" | "urlSync" | "defaults" | "urlKey"
> {
  /** Full-control tier: a prebuilt source (e.g. `useQuerySource`). */
  source?: TableSource<TRow>;
  /** Frontend tier: the raw rows; the table filters/sorts/pages them. */
  data?: readonly TRow[];
  /** Server tier: total row count across all pages. */
  total?: number;
  /** Server tier: request in flight. */
  loading?: boolean;
  /** Forwarded error. */
  error?: Error | null;
  /**
   * Explicit data mode. `"server"` makes `onQueryChange` the data
   * contract (the caller fetches); `"frontend"` keeps the table's own
   * data processing and turns `onQueryChange` into a pure notification.
   * Absent, the tier is inferred exactly as before: `data` alone →
   * frontend; `data` + `onQueryChange` → server; `source` → source tier.
   */
  mode?: "frontend" | "server";
  /** Server tier: see {@link UseServerDataOptions.onQueryChange}. */
  onQueryChange?: NonNullable<
    Parameters<typeof useServerData<TRow>>[0]["onQueryChange"]
  >;
  /** Columns — their `filter` shorthands feed the runtime. */
  columns: readonly ColumnDef<TRow>[];
  /** Table-level filters: declarative array, or JSX for a hand-drawn form. */
  filters?: readonly FilterDef<TRow>[] | ReactNode;
  /**
   * Extra or replacement filter types merged onto the built-in registry.
   * A spec whose `type` matches a built-in replaces it.
   */
  filterTypes?: readonly FilterTypeSpec[];
  /** Extra client-side predicate AND-ed with the declarative ones. */
  filterFn?: (row: TRow, extra: ExtraFilters) => boolean;
  /** Frontend tier: pagination mode (defaults to `"auto"`). */
  paginationMode?: PaginationMode;
  /** Frontend tier: searchable-text projector. */
  getSearchText?: (row: TRow) => string;
  /** Frontend tier: sort-value resolver. */
  getSortValue?: (row: TRow, columnKey: string) => SortableValue;
  /** Active locale — drives per-column `i18n` path resolution. */
  locale?: string;
  /**
   * Server tier: what this endpoint can answer. `supports.facets`
   * unlocks `query.facets` (checklist keys, or `facetKeys`).
   */
  supports?: QuerySupport;
  /**
   * Server tier: keys to send as `query.facets`. Defaults to every
   * `checklist` definition when omitted.
   */
  facetKeys?: readonly string[];
  /** Server tier: distinct-value counts from the last fetch. */
  facets?: FacetMap;
  /** The host of THIS table — filter-type plugins resolve from here. */
  featureHost?: FeatureHostState;
}

/**
 * Result of {@link useTableData}.
 *
 * @public
 */
export interface UseTableDataResult<TRow> {
  /** The resolved source, whichever tier provided it. */
  source: TableSource<TRow>;
  /** The merged declarative-filter runtime (defs, chips, URL keys, predicate). */
  runtime: FilterRuntime<TRow>;
}

type DataTier = "source" | "server" | "frontend";

/**
 * The consolidated query, and the abort signal for the request it starts.
 *
 * Written out rather than indexed off `UseServerDataOptions<TRow>`: the query
 * does not mention the row type, and a generic indexed access forces the
 * declaration emitter to inline this shape into every type that reaches it —
 * which it does under a renamed type parameter it never declares.
 *
 * @public
 */
export type TableQueryHandler = (
  query: TableQuery,
  info: { signal: AbortSignal }
) => void | Promise<void>;

/**
 * The public `mode` prop surface, shared by every batteries-included
 * `<DataTable>`.
 *
 * @typeParam _TRow - The row type. Every adapter writes `DataModeProps<TRow>`,
 * so the parameter stays; the query itself never mentions a row.
 *
 * @public
 */
export type DataModeProps<_TRow = unknown> =
  | {
      mode: "server";
      onQueryChange: TableQueryHandler;
    }
  | {
      mode?: "frontend";
      onQueryChange?: TableQueryHandler;
    };

function resolveTier(
  source: unknown,
  mode: "frontend" | "server" | undefined,
  onQueryChange: unknown
): DataTier {
  if (source) return "source";
  if (mode) return mode;
  return onQueryChange ? "server" : "frontend";
}

function warnTierMisuse(
  source: unknown,
  mode: "frontend" | "server" | undefined,
  data: unknown,
  onQueryChange: unknown
): void {
  if (source && mode) {
    devWarn(
      "`mode` is ignored when `source` is provided — the prebuilt source wins. Pass one data tier."
    );
  }
  if (source && (data || onQueryChange)) {
    devWarn(
      "both `source` and `data`/`onQueryChange` were provided — using `source`. Pass one data tier."
    );
  }
  if (!source && !data) {
    devWarn(
      "no data tier provided — pass `data` (frontend), `data` + `onQueryChange` (server) or `source`."
    );
  }
}

function useQueryNotification<TRow>(
  source: TableSource<TRow>,
  handler: TableQueryHandler | undefined
): void {
  const { page, limit, search, sortBy, sortDir, sortLevels, extra } = source;
  const query = useMemo<TableQuery>(
    () => ({
      page,
      limit,
      search,
      sortBy,
      sortDir,
      sortLevels: sortLevels ?? [],
      filters: extra,
    }),
    [page, limit, search, sortBy, sortDir, sortLevels, extra]
  );
  const queryKey = stableKey(query);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const queryRef = useRef(query);
  queryRef.current = query;
  const lastKeyRef = useRef(queryKey);
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (lastKeyRef.current === queryKey) return;
    lastKeyRef.current = queryKey;
    const notify = handlerRef.current;
    if (!notify) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    void notify(queryRef.current, { signal: controller.signal });
    return () => controller.abort();
  }, [queryKey]);
}

/**
 * Shared data-tier hook. The filter engine is injected so the DataTable
 * root can omit it; headless callers pass the real implementation.
 *
 * @internal
 */
interface LoadedOption {
  value: string;
  label: string;
}

/**
 * Resolve every option list a filter def loads on its own, once each.
 *
 * A def whose `options` is a function names a list the host fetches — a set of
 * assignees, the countries in use. The result is cached by key for the life of
 * the table, so opening the Filters form twice does not fetch twice, and a def
 * that appears later is picked up on the render that introduces it.
 */
function useAsyncFilterOptions(
  enabled: boolean,
  defs: readonly FilterDef<never>[],
  onLoaded: (key: string, options: readonly LoadedOption[]) => void
): void {
  const awaitedRef = useRef(new Set<string>());
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    for (const def of defs) {
      if (typeof def.options !== "function") continue;
      if (awaitedRef.current.has(def.key)) continue;
      awaitedRef.current.add(def.key);
      const key = def.key;
      void def.options().then(
        (next) => {
          if (alive) onLoaded(key, next);
        },
        () => {
          // The form's useFilterOptions surfaces the failure.
        }
      );
    }
    return () => {
      alive = false;
    };
  }, [enabled, defs, onLoaded]);
}

/**
 * Facet counts for the checklist filters, computed here when nothing else did.
 *
 * A server tier answers with its own counts; a frontend one has the rows in
 * hand, so the counts come from the same predicate the table filters with —
 * every filter EXCEPT the one being counted, which is what makes a checklist
 * show what each remaining choice would yield.
 */
function useComputedFacets<TRow>(
  engine: FilterEngine | undefined,
  resolved: TableSource<TRow>,
  runtime: FilterRuntime<TRow>,
  filterFn: (row: TRow, extra: ExtraFilters) => boolean
): FacetMap | undefined {
  return useMemo(() => {
    if (!engine || resolved.facets) return resolved.facets;
    const rows = resolved.allSearchedRows;
    if (!rows) return undefined;
    const keep = (row: TRow, extra: ExtraFilters) => {
      if (!filterFn(row, extra)) return false;
      if (!resolved.filterTree) return true;
      return engine.evaluateTree(
        resolved.filterTree,
        row,
        runtime.defs,
        runtime.registry
      );
    };
    return engine.computeFacets(
      runtime.defs,
      rows,
      resolved.extra,
      keep,
      runtime.registry
    );
  }, [engine, resolved, runtime.defs, runtime.registry, filterFn]);
}

/**
 * The tier a table is NOT on still has its hook called — that is the rule of
 * hooks — so it is handed inert input instead: no rows, no URL, no query
 * callback. These two say what each tier gets, in one place, so the reader can
 * see the whole of "which tier owns this table" without walking two call sites.
 */
function activeOnly<T>(active: boolean, value: T, idle: T): T {
  return active ? value : idle;
}

/** What the frontend tier is given. Inert while the table is on the server. */
function frontendTierInput<TRow>(input: {
  active: boolean;
  urlSync: boolean | undefined;
  data: readonly TRow[] | undefined;
  engine: FilterEngine | undefined;
  runtime: FilterRuntime<TRow>;
  isFrontendMode: boolean;
  loading: boolean | undefined;
}) {
  const { engine, runtime } = input;
  return {
    urlSync: activeOnly(input.active, input.urlSync, false),
    data: activeOnly(input.active, input.data ?? [], [] as readonly TRow[]),
    filterTreeFn: engine
      ? (row: TRow, tree: Parameters<FilterEngine["evaluateTree"]>[0]) =>
          engine.evaluateTree(tree, row, runtime.defs, runtime.registry)
      : undefined,
    arrayExtraKeys: runtime.arrayExtraKeys,
    numberExtraKeys: runtime.numberExtraKeys,
    isLoading: activeOnly(input.isFrontendMode, input.loading, undefined),
  };
}

/** What the server tier is given. Inert while the table is on the frontend. */
function serverTierInput<TRow>(input: {
  active: boolean;
  urlSync: boolean | undefined;
  data: readonly TRow[] | undefined;
  runtime: FilterRuntime<TRow>;
  onQueryChange:
    | ((
        query: TableQuery,
        info: { signal: AbortSignal }
      ) => void | Promise<void>)
    | undefined;
  supports: UseServerDataOptions<TRow>["supports"];
  facetKeys: readonly string[] | undefined;
  facets: FacetMap | undefined;
}) {
  const { active, runtime } = input;
  return {
    urlSync: activeOnly(active, input.urlSync, false),
    rows: activeOnly(active, input.data ?? [], [] as readonly TRow[]),
    onQueryChange: activeOnly(active, input.onQueryChange, undefined),
    arrayExtraKeys: runtime.arrayExtraKeys,
    numberExtraKeys: runtime.numberExtraKeys,
    supports: activeOnly(active, input.supports, undefined),
    facetKeys: activeOnly(active, input.facetKeys, undefined),
    facets: activeOnly(active, input.facets, undefined),
  };
}

export function useTableDataWithEngine<TRow>(
  options: UseTableDataOptions<TRow>,
  engine: FilterEngine | undefined
): UseTableDataResult<TRow> {
  const {
    source,
    data,
    total = 0,
    loading,
    error,
    mode,
    onQueryChange,
    columns,
    filters,
    filterTypes,
    filterFn,
    paginationMode,
    getSearchText,
    getSortValue,
    locale,
    supports,
    facetKeys,
    facets: serverFacets,
    featureHost,
    ...urlOptions
  } = options;

  const declaredFilters = isDeclarativeFilters(filters) ? filters : undefined;
  const loaderCacheRef = useRef(
    new Map<
      string,
      () => Promise<readonly { value: string; label: string }[]>
    >()
  );
  const [loadedOptions, setLoadedOptions] = useState<
    Record<string, readonly LoadedOption[]>
  >({});
  const onOptionsLoaded = useCallback(
    (key: string, next: readonly LoadedOption[]) => {
      setLoadedOptions((prev) => ({ ...prev, [key]: next }));
    },
    []
  );

  const runtime = useMemo(() => {
    if (!engine) return EMPTY_RUNTIME as FilterRuntime<TRow>;
    return engine.buildRuntime({
      columns,
      declaredFilters,
      locale,
      data: data ?? [],
      loadedOptions,
      filterTypes,
      featureHost,
      optionCache: loaderCacheRef.current,
    });
  }, [
    engine,
    columns,
    declaredFilters,
    locale,
    data,
    loadedOptions,
    filterTypes,
    featureHost,
  ]);

  useAsyncFilterOptions(engine !== undefined, runtime.defs, onOptionsLoaded);

  const tier = resolveTier(source, mode, onQueryChange);
  warnTierMisuse(source, mode, data, onQueryChange);

  const combinedFilterFn = useMemo(
    () =>
      filterFn
        ? (row: TRow, extra: ExtraFilters) =>
            runtime.filterFn(row, extra) && filterFn(row, extra)
        : runtime.filterFn,
    [runtime, filterFn]
  );

  const resolvedColumns = useMemo(
    () => resolveColumns(columns, locale),
    [columns, locale]
  );
  const frontend = useFrontendData<TRow>({
    ...urlOptions,
    ...frontendTierInput<TRow>({
      active: tier === "frontend",
      urlSync: urlOptions.urlSync,
      data,
      engine,
      runtime,
      isFrontendMode: mode === "frontend",
      loading,
    }),
    columns: resolvedColumns,
    filterFn: combinedFilterFn,
    paginationMode,
    getSearchText,
    getSortValue,
    error,
  });
  const derivedFacetKeys = useMemo(() => {
    if (facetKeys) return facetKeys;
    if (!engine) return undefined;
    return runtime.defs
      .filter(
        (def) =>
          (runtime.registry.get(def.type)?.widget ?? def.type) === "checklist"
      )
      .map((def) => def.key);
  }, [engine, facetKeys, runtime.defs, runtime.registry]);

  const server = useServerData<TRow>({
    ...urlOptions,
    ...serverTierInput<TRow>({
      active: tier === "server",
      urlSync: urlOptions.urlSync,
      data,
      runtime,
      onQueryChange,
      supports,
      facetKeys: derivedFacetKeys,
      facets: serverFacets,
    }),
    total,
    loading,
    error,
    paginationMode,
  });

  useQueryNotification(
    frontend,
    tier === "frontend" && mode === "frontend" ? onQueryChange : undefined
  );

  let resolved: TableSource<TRow>;
  if (source) resolved = source;
  else if (tier === "server") resolved = server;
  else resolved = frontend;

  const facets = useComputedFacets(engine, resolved, runtime, combinedFilterFn);

  const sourced = useMemo(
    () => (facets ? { ...resolved, facets } : resolved),
    [resolved, facets]
  );

  return { source: sourced, runtime };
}
