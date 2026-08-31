import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

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
 * The public `mode` prop surface, shared by every batteries-included
 * `<DataTable>`.
 *
 * @public
 */
export type DataModeProps<TRow> =
  | {
      mode: "server";
      onQueryChange: NonNullable<UseServerDataOptions<TRow>["onQueryChange"]>;
    }
  | {
      mode?: "frontend";
      onQueryChange?: NonNullable<UseServerDataOptions<TRow>["onQueryChange"]>;
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
  handler: NonNullable<UseServerDataOptions<TRow>["onQueryChange"]> | undefined
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
  const awaitedRef = useRef(new Set<string>());
  const [loadedOptions, setLoadedOptions] = useState<
    Record<string, readonly { value: string; label: string }[]>
  >({});

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

  useEffect(() => {
    if (!engine) return;
    let alive = true;
    for (const def of runtime.defs) {
      if (typeof def.options !== "function") continue;
      if (awaitedRef.current.has(def.key)) continue;
      awaitedRef.current.add(def.key);
      const key = def.key;
      void def.options().then(
        (next) => {
          if (alive) {
            setLoadedOptions((prev) => ({ ...prev, [key]: next }));
          }
        },
        () => {
          // The form's useFilterOptions surfaces the failure.
        }
      );
    }
    return () => {
      alive = false;
    };
  }, [engine, runtime.defs]);

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
    urlSync: tier === "frontend" ? urlOptions.urlSync : false,
    data: tier === "frontend" ? (data ?? []) : [],
    columns: resolvedColumns,
    filterFn: combinedFilterFn,
    filterTreeFn: engine
      ? (row, tree) =>
          engine.evaluateTree(tree, row, runtime.defs, runtime.registry)
      : undefined,
    arrayExtraKeys: runtime.arrayExtraKeys,
    numberExtraKeys: runtime.numberExtraKeys,
    paginationMode,
    getSearchText,
    getSortValue,
    error,
    isLoading: mode === "frontend" ? loading : undefined,
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
    urlSync: tier === "server" ? urlOptions.urlSync : false,
    rows: tier === "server" ? (data ?? []) : [],
    total,
    loading,
    error,
    paginationMode,
    onQueryChange: tier === "server" ? onQueryChange : undefined,
    arrayExtraKeys: runtime.arrayExtraKeys,
    numberExtraKeys: runtime.numberExtraKeys,
    supports: tier === "server" ? supports : undefined,
    facetKeys: tier === "server" ? derivedFacetKeys : undefined,
    facets: tier === "server" ? serverFacets : undefined,
  });

  useQueryNotification(
    frontend,
    tier === "frontend" && mode === "frontend" ? onQueryChange : undefined
  );

  let resolved: TableSource<TRow>;
  if (source) resolved = source;
  else if (tier === "server") resolved = server;
  else resolved = frontend;

  const facets = useMemo(() => {
    if (!engine) return resolved.facets;
    if (resolved.facets) return resolved.facets;
    const rows = resolved.allSearchedRows;
    if (!rows) return undefined;
    return engine.computeFacets(
      runtime.defs,
      rows,
      resolved.extra,
      (row, extra) => {
        if (!combinedFilterFn(row, extra)) return false;
        if (!resolved.filterTree) return true;
        return engine.evaluateTree(
          resolved.filterTree,
          row,
          runtime.defs,
          runtime.registry
        );
      },
      runtime.registry
    );
  }, [engine, resolved, runtime.defs, runtime.registry, combinedFilterFn]);

  const sourced = useMemo(
    () => (facets ? { ...resolved, facets } : resolved),
    [resolved, facets]
  );

  return { source: sourced, runtime };
}
