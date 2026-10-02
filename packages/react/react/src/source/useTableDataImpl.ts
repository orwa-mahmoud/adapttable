import {
  createTableData,
  type ExtraFilters,
  type FacetMap,
  type FeatureHostState,
  type FilterDef,
  type FilterEngine,
  type FilterRuntime,
  type FilterTypeSpec,
  isDeclarativeFilters,
  type PaginationMode,
  type QueryAggregate,
  type QuerySupport,
  type SortableValue,
  type TableData,
  type TableDataPlan,
  type TableSource,
} from "@adapttable/core";
import type { UseTableDataResult } from "@adapttable/core/binding";
import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import type { ColumnDef } from "../columnDef";
import { resolveColumns } from "../columns/resolveColumns";
import type { UseTableUrlStateOptions } from "../url/useTableUrlState";
import { useFrontendData } from "./useFrontendData";
import {
  type TableQuery,
  useServerData,
  type UseServerDataOptions,
} from "./useServerData";
export type { UseTableDataResult } from "@adapttable/core/binding";

export type { UseServerDataOptions };

/** The inactive server hook's columns: none, so it asks for nothing. */
const NO_COLUMNS: readonly never[] = [];

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
  /** Server tier: see {@link UseServerDataOptions.aggregates}. */
  aggregates?: readonly QueryAggregate[];
  /** Server tier: see {@link UseServerDataOptions.responseKey}. */
  responseKey?: string;
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
  /**
   * Resolve `paginationMode="auto"` as the mobile layout (infinite scroll).
   * The table passes its own `forceMobile`, so the server render and the
   * first client render agree.
   */
  forceMobile?: boolean;
  /**
   * The width, in pixels, at or below which `paginationMode="auto"` resolves
   * to infinite scroll. Defaults to 768. Pass the table's `mobileBreakpoint`
   * so the mode follows the same rule as the card layout.
   */
  mobileBreakpoint?: number;
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
  info: { signal: AbortSignal; key: string }
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
export type DataModeProps<_TRow = unknown> = {
  /**
   * Server tier: the aggregates to ask the endpoint for —
   * `[{ key: "budget", fn: "sum" }]`. Sent only when `supports.aggregates`
   * is declared, and layered under whatever the reader chooses in the
   * grouping panel.
   */
  aggregates?: readonly QueryAggregate[];
  /**
   * Server tier: the `info.key` of the `onQueryChange` call the current
   * `data` answers. Echo it back and a column's `formatAggregate` is told
   * exactly which operation produced the numbers on screen, through a
   * failure, a cancellation and a late `loading` flag alike.
   */
  responseKey?: string;
} & (
  | {
      mode: "server";
      onQueryChange: TableQueryHandler;
    }
  | {
      mode?: "frontend";
      onQueryChange?: TableQueryHandler;
    }
);

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
  runtime: FilterRuntime<TRow>;
  filterTreeFn: TableDataPlan<TRow>["filterTreeFn"];
  isFrontendMode: boolean;
  loading: boolean | undefined;
}) {
  const { runtime } = input;
  return {
    urlSync: activeOnly(input.active, input.urlSync, false),
    data: activeOnly(input.active, input.data ?? [], [] as readonly TRow[]),
    filterTreeFn: input.filterTreeFn,
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
  onQueryChange: TableQueryHandler | undefined;
  aggregates: readonly QueryAggregate[] | undefined;
  responseKey: string | undefined;
  supports: UseServerDataOptions<TRow>["supports"];
  facetKeys: readonly string[] | undefined;
  facets: FacetMap | undefined;
}) {
  const { active, runtime } = input;
  return {
    urlSync: activeOnly(active, input.urlSync, false),
    rows: activeOnly(active, input.data ?? [], [] as readonly TRow[]),
    onQueryChange: activeOnly(active, input.onQueryChange, undefined),
    aggregates: activeOnly(active, input.aggregates, undefined),
    responseKey: activeOnly(active, input.responseKey, undefined),
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
  // The controller is mutable and must see every render's inputs; its pieces
  // are memoized inside it, so the compiler's cache would only skip updates.
  "use no memo";
  const {
    source,
    data,
    total = 0,
    loading,
    error,
    mode,
    onQueryChange,
    aggregates,
    responseKey,
    columns,
    filters,
    filterTypes,
    filterFn,
    paginationMode,
    forceMobile,
    mobileBreakpoint,
    getSearchText,
    getSortValue,
    locale,
    supports,
    facetKeys,
    facets: serverFacets,
    featureHost,
    ...urlOptions
  } = options;

  const [controller] = useState<TableData<TRow>>(createTableData);
  // A filter's own option list landing re-renders through here.
  useSyncExternalStore(
    controller.subscribe,
    controller.revision,
    controller.revision
  );
  const plan = controller.plan({
    engine,
    source,
    data,
    mode,
    onQueryChange,
    columns,
    declaredFilters: isDeclarativeFilters(filters) ? filters : undefined,
    filterTypes,
    featureHost,
    locale,
    filterFn,
    facetKeys,
  });
  const { tier, runtime, filterFn: combinedFilterFn } = plan;

  useEffect(() => controller.loadOptions(), [controller, runtime.defs]);

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
      runtime,
      filterTreeFn: plan.filterTreeFn,
      isFrontendMode: mode === "frontend",
      loading,
    }),
    columns: resolvedColumns,
    filterFn: combinedFilterFn,
    filterKey: plan.filterKey,
    locale,
    paginationMode,
    forceMobile,
    mobileBreakpoint,
    getSearchText,
    getSortValue,
    error,
  });
  const server = useServerData<TRow>({
    ...urlOptions,
    ...serverTierInput<TRow>({
      active: tier === "server",
      urlSync: urlOptions.urlSync,
      data,
      runtime,
      onQueryChange,
      aggregates,
      responseKey,
      supports,
      facetKeys: plan.facetKeys,
      facets: serverFacets,
    }),
    // A column's default aggregate is a request to the server; the hook that
    // would send it only runs for the server tier, so only that tier reads it.
    columns: tier === "server" ? resolvedColumns : NO_COLUMNS,
    total,
    loading,
    error,
    paginationMode,
    forceMobile,
    mobileBreakpoint,
  });

  let resolved: TableSource<TRow>;
  if (source) resolved = source;
  else if (tier === "server") resolved = server;
  else resolved = frontend;

  const sourced = controller.finish({ resolved, frontend });
  // Once React accepts the render: tell a frontend table's `onQueryChange`
  // about a change.
  useEffect(() => {
    controller.commit();
  });
  useEffect(() => controller.dispose, [controller]);

  return { source: sourced, runtime };
}
