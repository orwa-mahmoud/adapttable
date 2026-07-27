import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { resolveColumns } from "../columns/resolveColumns";
import {
  buildFilterRuntime,
  type FilterDef,
  type FilterOption,
  type FilterRuntime,
  materializeAutoOptions,
  resolveFilterDefs,
} from "../filters/filterDefs";
import type {
  ColumnDef,
  ExtraFilters,
  PaginationMode,
  SortableValue,
} from "../types";
import type { UseTableUrlStateOptions } from "../url/useTableUrlState";
import { devWarn } from "../utils/devWarn";
import { stableKey } from "../utils/stableKey";
import type { TableSource } from "./TableSource";
import { useFrontendData } from "./useFrontendData";
import {
  type TableQuery,
  useServerData,
  type UseServerDataOptions,
} from "./useServerData";

/** Options for {@link useTableData}. */
export interface UseTableDataOptions<TRow> extends Pick<
  UseTableUrlStateOptions,
  "adapter" | "urlAdapter" | "enabled" | "urlSync" | "defaults" | "urlKey"
> {
  /** Full-control tier: a prebuilt source (e.g. `useBackendData`). */
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
}

/** Result of {@link useTableData}. */
export interface UseTableDataResult<TRow> {
  /** The resolved source, whichever tier provided it. */
  source: TableSource<TRow>;
  /** The merged declarative-filter runtime (defs, chips, URL keys, predicate). */
  runtime: FilterRuntime<TRow>;
}

type DataTier = "source" | "server" | "frontend";

/**
 * The public `mode` prop surface, shared by every batteries-included
 * `<DataTable>`: a discriminated union so `mode="server"` REQUIRES
 * `onQueryChange` at compile time, while `mode="frontend"` (or no mode
 * at all) keeps it optional — as a pure notification and as the legacy
 * inference trigger respectively.
 *
 * @typeParam TRow - The row type.
 */
export type DataModeProps<TRow> =
  | {
      /** The table owns the query state; the CALLER fetches. */
      mode: "server";
      /** The data contract: run the request, hand back `data` + `total`. */
      onQueryChange: NonNullable<UseServerDataOptions<TRow>["onQueryChange"]>;
    }
  | {
      /**
       * The table processes `data` itself. Omit `mode` for the inferred
       * tiers (`data` + `onQueryChange` still means server).
       */
      mode?: "frontend";
      /**
       * With `mode="frontend"`: a pure notification, fired on every
       * committed sort / filter / page / search change and never on
       * mount. Without `mode`: providing it selects the server tier.
       */
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

/**
 * Notify-only `onQueryChange` for the explicit frontend mode: fires with
 * the consolidated {@link TableQuery} on every COMMITTED state change —
 * sort, filter, page, page size, search — and never on mount. The
 * previous call's signal aborts when a newer notification supersedes it,
 * mirroring the server tier's contract.
 */
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
  // Primed with the mount key, so the first firing needs a REAL change.
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

/** True when the `filters` prop is the declarative array form. */
export function isDeclarativeFilters<TRow>(
  filters: readonly FilterDef<TRow>[] | ReactNode
): filters is readonly FilterDef<TRow>[] {
  return Array.isArray(filters);
}

/**
 * Resolve the table's data tier from what the caller passed:
 *
 * - `source` — full control (query-library integration), used as-is;
 * - `data` + `onQueryChange` — server mode: the table owns the query state
 *   and emits consolidated change events; the caller fetches;
 * - `data` alone — frontend mode: filtering/sorting/paging are automatic,
 *   with the declarative filters' predicate already applied.
 *
 * All three run through the same declarative-filter runtime, so column
 * `filter` shorthands and the `filters` array drive chips and URL parsing
 * regardless of tier.
 *
 * @typeParam TRow - The row type.
 */
export function useTableData<TRow>(
  options: UseTableDataOptions<TRow>
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
    filterFn,
    paginationMode,
    getSearchText,
    getSortValue,
    locale,
    ...urlOptions
  } = options;

  const declaredFilters = isDeclarativeFilters(filters) ? filters : undefined;

  // Async option loaders: ONE cached promise serves both the chip labels
  // (here) and the form's `useFilterOptions` (same function identity), so
  // nothing fetches twice — and once resolved, the defs carry the ARRAY,
  // which re-labels active chips and makes the form instant.
  const loaderCacheRef = useRef(
    new Map<string, () => Promise<readonly FilterOption[]>>()
  );
  const awaitedRef = useRef(new Set<string>());
  const [loadedOptions, setLoadedOptions] = useState<
    Record<string, readonly FilterOption[]>
  >({});

  const runtime = useMemo(() => {
    const materialized = materializeAutoOptions(
      resolveFilterDefs(columns, declaredFilters, locale),
      // `"auto"` derives from the full frontend dataset; other tiers
      // only ever see the current page (useFilterOptions dev-warns).
      data ?? []
    );
    const withAsync = materialized.map((def) => {
      if (typeof def.options !== "function") return def;
      const loaded = loadedOptions[def.key];
      if (loaded) return { ...def, options: loaded };
      let cached = loaderCacheRef.current.get(def.key);
      if (!cached) {
        const original = def.options;
        let inFlight: Promise<readonly FilterOption[]> | null = null;
        cached = () => (inFlight ??= original());
        loaderCacheRef.current.set(def.key, cached);
      }
      return { ...def, options: cached };
    });
    return buildFilterRuntime(withAsync);
  }, [columns, declaredFilters, locale, data, loadedOptions]);

  useEffect(() => {
    let alive = true;
    for (const def of runtime.defs) {
      if (typeof def.options !== "function") continue;
      if (awaitedRef.current.has(def.key)) continue;
      awaitedRef.current.add(def.key);
      const key = def.key;
      void def.options().then(
        (options) => {
          if (alive) {
            setLoadedOptions((prev) => ({ ...prev, [key]: options }));
          }
        },
        () => {
          // The form's useFilterOptions surfaces the failure dev warning;
          // chips simply keep labeling with raw values.
        }
      );
    }
    return () => {
      alive = false;
    };
  }, [runtime.defs]);

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

  // Hooks must run unconditionally; the inactive tiers run disabled (memory
  // URL store, empty data, no emitter) and cost nothing.
  const resolvedColumns = useMemo(
    () => resolveColumns(columns, locale),
    [columns, locale]
  );
  const frontend = useFrontendData<TRow>({
    ...urlOptions,
    urlSync:
      tier === "frontend" ? (urlOptions.urlSync ?? urlOptions.enabled) : false,
    data: tier === "frontend" ? (data ?? []) : [],
    columns: resolvedColumns,
    filterFn: combinedFilterFn,
    arrayExtraKeys: runtime.arrayExtraKeys,
    numberExtraKeys: runtime.numberExtraKeys,
    paginationMode,
    getSearchText,
    getSortValue,
    error,
    isLoading: mode === "frontend" ? loading : undefined,
  });
  const server = useServerData<TRow>({
    ...urlOptions,
    urlSync:
      tier === "server" ? (urlOptions.urlSync ?? urlOptions.enabled) : false,
    rows: tier === "server" ? (data ?? []) : [],
    total,
    loading,
    error,
    onQueryChange: tier === "server" ? onQueryChange : undefined,
    arrayExtraKeys: runtime.arrayExtraKeys,
    numberExtraKeys: runtime.numberExtraKeys,
  });

  // Explicit frontend mode turns `onQueryChange` into a pure notification
  // over the frontend source's committed state.
  useQueryNotification(
    frontend,
    tier === "frontend" && mode === "frontend" ? onQueryChange : undefined
  );

  let resolved: TableSource<TRow>;
  if (source) resolved = source;
  else if (tier === "server") resolved = server;
  else resolved = frontend;

  return { source: resolved, runtime };
}
