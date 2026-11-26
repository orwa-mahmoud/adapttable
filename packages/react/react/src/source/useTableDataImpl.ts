import {
  type ExtraFilters,
  type FeatureHostState,
  type FilterDef,
  type FilterEngine,
  type FilterRuntime,
  type FilterTypeSpec,
  isDeclarativeFilters,
  type PaginationMode,
  type QueryFilterGroup,
  type SortableValue,
  type TableSource,
} from "@adapttable/core";
import {
  activeTierValue,
  createTableData,
  type TableData,
  type TableDataPlan,
  tierRows,
  type UseTableDataResult,
} from "@adapttable/core/binding";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import type { ColumnDef } from "../columnDef";
import { resolveColumns } from "../columns/resolveColumns";
import type { UseTableUrlStateOptions } from "../url/useTableUrlState";
import { useFrontendData } from "./useFrontendData";
import type { TableQuery } from "./useServerData";
export type { UseServerDataOptions } from "./useServerData";
export type { UseTableDataResult } from "@adapttable/core/binding";

/**
 * Options for {@link useTableData}.
 *
 * @public
 */
export interface UseTableDataOptions<TRow> extends Pick<
  UseTableUrlStateOptions,
  "urlAdapter" | "urlSync" | "defaults" | "urlKey" | "store"
> {
  /**
   * A prebuilt source, used as-is: a server source (`useServerData`), a
   * query-library source (`useQuerySource`) or any other `TableSource`.
   */
  source?: TableSource<TRow>;
  /** Frontend tier: every row; the table filters, sorts and pages them. */
  data?: readonly TRow[];
  /** Frontend tier: the rows are still loading. */
  loading?: boolean;
  /** Forwarded error. */
  error?: Error | null;
  /**
   * Frontend tier: told of each committed change to page, page size, search,
   * sort and filters, never of the mount. The table keeps processing `data`.
   */
  onViewChange?: TableQueryHandler;
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
 * What the frontend tier is given. Inert while the table reads a source.
 *
 * The frontend hook is called on every render, so while a source serves the
 * rows it receives no rows and no URL. The facade itself stays.
 */
function frontendTierInput<TRow>(input: {
  active: boolean;
  urlSync: boolean | undefined;
  data: readonly TRow[] | undefined;
  runtime: FilterRuntime<TRow>;
  filterTreeFn: TableDataPlan<TRow>["filterTreeFn"];
  loading: boolean | undefined;
}) {
  const { runtime } = input;
  return {
    active: input.active,
    urlSync: activeTierValue(input.active, input.urlSync, false),
    data: tierRows(input.active, input.data),
    filterTreeFn: input.filterTreeFn,
    arrayExtraKeys: runtime.arrayExtraKeys,
    numberExtraKeys: runtime.numberExtraKeys,
    isLoading: activeTierValue(input.active, input.loading, undefined),
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
    loading,
    error,
    onViewChange,
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
    featureHost,
    store,
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
    onViewChange,
    columns,
    declaredFilters: isDeclarativeFilters(filters) ? filters : undefined,
    filterTypes,
    featureHost,
    locale,
    filterFn,
  });
  const { tier, runtime, filterFn: combinedFilterFn } = plan;

  useEffect(() => controller.loadOptions(), [controller, runtime.defs]);

  const resolvedColumns = useMemo(
    () => resolveColumns(columns, locale),
    [columns, locale]
  );
  // `plan()` builds a new tree predicate every render. The predicate's
  // meaning is `filterKey`; a fresh closure would keep an idle tier refreshing.
  const filterTreeRef = useRef(plan.filterTreeFn);
  filterTreeRef.current = plan.filterTreeFn;
  const applyFilterTree = useCallback((row: TRow, tree: QueryFilterGroup) => {
    const apply = filterTreeRef.current;
    return apply ? apply(row, tree) : false;
  }, []);
  const frontend = useFrontendData<TRow>({
    ...urlOptions,
    // Only the active tier keeps its view state in the table's store; the
    // idle one keeps its own.
    store: tier === "frontend" ? store : undefined,
    ...frontendTierInput<TRow>({
      active: tier === "frontend",
      urlSync: urlOptions.urlSync,
      data,
      runtime,
      filterTreeFn: plan.filterTreeFn ? applyFilterTree : undefined,
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
  const resolved = source ?? frontend;
  const sourced = controller.finish({ resolved, frontend });
  // Once React accepts the render: tell a frontend table's `onViewChange`
  // about a change.
  useEffect(() => {
    controller.commit();
  });
  useEffect(() => controller.dispose, [controller]);

  return useMemo(() => ({ source: sourced, runtime }), [sourced, runtime]);
}
