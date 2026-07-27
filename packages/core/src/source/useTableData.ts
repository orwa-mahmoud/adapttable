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
import type { TableSource } from "./TableSource";
import { useFrontendData } from "./useFrontendData";
import { useServerData } from "./useServerData";

/** Options for {@link useTableData}. */
export interface UseTableDataOptions<TRow> extends Pick<
  UseTableUrlStateOptions,
  "adapter" | "enabled" | "defaults" | "urlKey"
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

function resolveTier(source: unknown, onQueryChange: unknown): DataTier {
  if (source) return "source";
  if (onQueryChange) return "server";
  return "frontend";
}

function warnTierMisuse(
  source: unknown,
  data: unknown,
  onQueryChange: unknown
): void {
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

  const mode = resolveTier(source, onQueryChange);
  warnTierMisuse(source, data, onQueryChange);

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
    enabled: mode === "frontend" ? urlOptions.enabled : false,
    data: mode === "frontend" ? (data ?? []) : [],
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
    enabled: mode === "server" ? urlOptions.enabled : false,
    rows: mode === "server" ? (data ?? []) : [],
    total,
    loading,
    error,
    onQueryChange: mode === "server" ? onQueryChange : undefined,
    arrayExtraKeys: runtime.arrayExtraKeys,
    numberExtraKeys: runtime.numberExtraKeys,
  });

  let resolved: TableSource<TRow>;
  if (source) resolved = source;
  else if (mode === "server") resolved = server;
  else resolved = frontend;

  return { source: resolved, runtime };
}
