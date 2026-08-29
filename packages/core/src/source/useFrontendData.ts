import { useCallback, useMemo, useRef } from "react";

import { resolvePaginationMode, useIsMobile } from "../hooks/useIsMobile";
import {
  applyRowPatchLogToView,
  attachIncrementalView,
  createIncrementalView,
  incrementalSearchText,
  type IncrementalView,
  type IncrementalViewConfig,
  incrementalViewConfig,
  incrementalViewOf,
} from "../rows/incremental";
import { type RowPatchLog, rowPatchLog } from "../rows/patch";
import type { SortLevel } from "../sort/compare";
import type {
  ColumnDef,
  ExtraFilters,
  PaginationMode,
  SortableValue,
  SortDirection,
} from "../types";
import {
  useTableUrlState,
  type UseTableUrlStateOptions,
} from "../url/useTableUrlState";
import { devWarn } from "../utils/devWarn";
import { stableKey } from "../utils/stableKey";
import type { QueryFilterGroup } from "./queryContract";
import type { TableSource } from "./TableSource";

/** Narrows an accessor's `ReactNode` to a sortable primitive, else `null`. */
const toSortable = (value: unknown): SortableValue =>
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean"
    ? value
    : null;

/**
 * Dev-only: surface a sort that cannot resolve values (a silent no-op).
 * The most common cause is forgetting to pass `columns` to the hook.
 */
function warnUnresolvableSort<TRow>(
  sortBy: string,
  column: ColumnDef<TRow> | undefined,
  rows: readonly TRow[],
  getSortValue?: (row: TRow, columnKey: string) => SortableValue
): void {
  if (getSortValue) return;
  if (!column) {
    devWarn(
      `sortBy "${sortBy}" matches no column — pass \`columns\` (or \`getSortValue\`) to useFrontendData so client-side sorting can resolve values.`
    );
    return;
  }
  const first = rows[0];
  if (
    !column.sortValue &&
    first !== undefined &&
    toSortable(column.accessor?.(first)) === null
  ) {
    devWarn(
      `column "${sortBy}" has no sortable value — its accessor returns a non-primitive; add a \`sortValue\` extractor to the column.`
    );
  }
}

/**
 * Options for {@link useFrontendData}.
 *
 * @public
 */
export interface UseFrontendDataOptions<TRow> extends Pick<
  UseTableUrlStateOptions,
  | "urlAdapter"
  | "urlSync"
  | "defaults"
  | "numberExtraKeys"
  | "arrayExtraKeys"
  | "urlKey"
> {
  /** The source array. Filtered / sorted / sliced internally by state. */
  data: readonly TRow[];
  /**
   * How a row's id is derived — the same function {@link applyRowPatches}
   * used. Defaults to `String(row.id)` when the row has an `id`.
   */
  getRowId?: (row: TRow) => string;
  /**
   * Project a row to its searchable text. Defaults to a flatten of the
   * row's own values; override to reach nested fields.
   */
  getSearchText?: (row: TRow) => string;
  /**
   * Resolve a row's sort value for a column key. Falls back to the
   * matching column's `sortValue`.
   */
  getSortValue?: (row: TRow, columnKey: string) => SortableValue;
  /** Columns — read for per-column `sortValue` when sorting. */
  columns?: readonly ColumnDef<TRow>[];
  /**
   * Client-side filter predicate applied after search. Receives the active
   * `extra` filter bag (driven by the filter drawer's `setExtra` calls), so a
   * filter UI filters the rows with no extra wiring. Omit for no filtering.
   */
  filterFn?: (row: TRow, extra: ExtraFilters) => boolean;
  /**
   * Evaluate the URL's AND/OR filter tree against a row. Omit and the
   * tree is stored but not applied (server tiers send it instead).
   */
  filterTreeFn?: (row: TRow, tree: QueryFilterGroup) => boolean;
  /** Pagination mode. Defaults to `"auto"` (mobile → infinite). */
  paginationMode?: PaginationMode;
  /** Forwarded error to display (e.g. from a query that produced `data`). */
  error?: Error | null;
  /** Forwarded refetch. */
  refetch?: () => Promise<unknown> | void;
  /** Forwarded fetching flag. */
  isFetching?: boolean;
  /** Forwarded loading flag. */
  isLoading?: boolean;
  /**
   * Force the resolved mobile state instead of using a media query.
   * Primarily a testing/SSR seam.
   */
  forceMobile?: boolean;
}

/**
 * Default searchable-text projector: flatten a row's own values.
 *
 * @public
 */
export function defaultSearchText<TRow>(row: TRow): string {
  return incrementalSearchText(row);
}

/**
 * Default row id: `String(row.id)` when the row has a string/number id.
 *
 * @public
 */
export function defaultFrontendRowId<TRow>(row: TRow): string {
  if (row && typeof row === "object" && "id" in row) {
    const id = row.id;
    if (typeof id === "string" || typeof id === "number") return String(id);
  }
  if (typeof row === "string" || typeof row === "number") return String(row);
  return "";
}

/**
 * In-memory {@link TableSource}: reads URL/local state and filters, sorts,
 * and slices a caller-supplied array. The mirror of `useQuerySource` —
 * the table cannot tell which produced it.
 *
 * A {@link rowPatchLog} on `data` continues the live {@link IncrementalView}
 * so only touched rows re-run search, filters and sort. Spreading the
 * patched array drops the log and falls back to a full rebuild.
 *
 * @typeParam TRow - The row item type.
 * @param options - See {@link UseFrontendDataOptions}.
 * @returns A {@link TableSource} over the in-memory data.
 *
 * @public
 */
export function useFrontendData<TRow>(
  options: UseFrontendDataOptions<TRow>
): TableSource<TRow> {
  const {
    data,
    getRowId = defaultFrontendRowId,
    getSearchText = defaultSearchText,
    getSortValue,
    columns,
    filterFn,
    filterTreeFn,
    paginationMode = "auto",
    error = null,
    refetch,
    isFetching = false,
    isLoading = false,
    forceMobile,
    ...urlOptions
  } = options;

  const mediaMobile = useIsMobile();
  const isMobile = forceMobile ?? mediaMobile;
  const resolvedMode = resolvePaginationMode(paginationMode, isMobile);
  const paged = resolvedMode === "paged";

  const state = useTableUrlState(urlOptions);
  const { page, limit, search, sortBy, sortDir, groupBy } = state;
  const sortLevels = state.sortLevels;

  const getSearchTextRef = useRef(getSearchText);
  getSearchTextRef.current = getSearchText;
  const getRowIdRef = useRef(getRowId);
  getRowIdRef.current = getRowId;
  const searchCacheRef = useRef<Map<string, string>>(new Map());
  const projectSearchText = useCallback((row: TRow) => {
    const id = getRowIdRef.current(row);
    const cached = searchCacheRef.current.get(id);
    if (cached !== undefined) return cached;
    const text = getSearchTextRef.current(row);
    searchCacheRef.current.set(id, text);
    return text;
  }, []);

  const fingerprint: FrontendViewFingerprint<TRow> = {
    extra: state.extra,
    filterTree: state.filterTree,
    columns,
    search,
    sortBy,
    sortDir,
    sortLevels,
    groupBy,
    hasFilterFn: filterFn !== undefined,
    hasFilterTreeFn: filterTreeFn !== undefined,
    hasGetSortValue: getSortValue !== undefined,
  };
  const hookConfig: IncrementalViewConfig<TRow> = {
    getRowId,
    getSearchText: projectSearchText,
    filterFn,
    extra: state.extra,
    filterTreeFn,
    filterTree: state.filterTree,
    columns,
    getSortValue,
    sortBy,
    sortDir,
    sortLevels,
    search,
    groupBy,
  };

  const viewRef = useRef<IncrementalView<TRow> | undefined>(undefined);
  const dataRef = useRef(data);
  const fingerprintRef = useRef<string | undefined>(undefined);
  const view = syncFrontendView({
    data,
    hookConfig,
    fingerprint: hookViewFingerprint(fingerprint),
    viewRef,
    dataRef,
    fingerprintRef,
    searchCache: searchCacheRef.current,
  });

  if (sortLevels.length === 0 && sortBy && sortDir) {
    warnUnresolvableSort(
      sortBy,
      columns?.find((column) => column.key === sortBy),
      view.filtered,
      getSortValue
    );
  }

  const sorted = view.sorted;
  attachIncrementalView(sorted, view);

  // Facets read allSearchedRows: after search, BEFORE extra filters.
  // view.filtered already applied filterFn, so a selected checklist
  // would hide every other value if we published that here.
  const searched = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data;
    return data.filter((row) =>
      projectSearchText(row).toLowerCase().includes(term)
    );
  }, [data, search, projectSearchText]);
  const total = sorted.length;
  const lastPage = Math.max(1, Math.ceil(total / Math.max(limit, 1)));
  const safePage = Math.min(Math.max(page, 1), lastPage);

  // The view object is NOT a dependency: hosts rebuild extra/columns
  // (and useTableData's filterTreeFn) every render. A new view identity
  // must not mint a new page slice or radix/base-ui findInTable loops.
  const rows = useMemo<readonly TRow[]>(() => {
    if (paged) {
      const start = (safePage - 1) * limit;
      return sorted.slice(start, start + limit);
    }
    return sorted.slice(0, safePage * limit);
  }, [sorted, paged, safePage, limit]);
  attachIncrementalView(rows, view);

  const hasNextPage = !paged && safePage * limit < total;

  const fetchNextPage = useCallback(() => {
    if (paged || safePage * limit >= total) return;
    state.setPage(safePage + 1);
  }, [paged, safePage, limit, total, state]);

  return {
    rows,
    allFilteredRows: sorted,
    allSearchedRows: searched,
    total,
    isLoading,
    isFetching,
    isFetchingNextPage: false,
    hasNextPage,
    fetchNextPage,
    error,
    refetch,
    paginationMode: resolvedMode,
    page: safePage,
    limit,
    defaultLimit: state.defaultLimit,
    search,
    sortBy,
    sortDir,
    groupBy,
    extra: state.extra,
    filterTree: state.filterTree,
    setPage: state.setPage,
    setLimit: state.setLimit,
    setSort: state.setSort,
    setGroupBy: state.setGroupBy,
    sortLevels: state.sortLevels,
    toggleSortLevel: state.toggleSortLevel,
    setSearch: state.setSearch,
    setExtra: state.setExtra,
    setExtras: state.setExtras,
    setFilterTree: state.setFilterTree,
    clearExtras: state.clearExtras,
    clearAll: state.clearAll,
  };
}

/** Value-only hook inputs. Callback / array identity is ignored. */
interface FrontendViewFingerprint<TRow> {
  extra: ExtraFilters;
  filterTree: QueryFilterGroup | undefined;
  columns: readonly ColumnDef<TRow>[] | undefined;
  search: string;
  sortBy: string | undefined;
  sortDir: SortDirection | undefined;
  sortLevels: readonly SortLevel[];
  groupBy: string | undefined;
  hasFilterFn: boolean;
  hasFilterTreeFn: boolean;
  hasGetSortValue: boolean;
}

function hookViewFingerprint<TRow>(
  fingerprint: FrontendViewFingerprint<TRow>
): string {
  return stableKey({
    extra: fingerprint.extra,
    filterTree: fingerprint.filterTree ?? null,
    search: fingerprint.search,
    sortBy: fingerprint.sortBy ?? null,
    sortDir: fingerprint.sortDir ?? null,
    sortLevels: fingerprint.sortLevels.map((level) => ({
      key: level.key,
      dir: level.dir,
    })),
    groupBy: fingerprint.groupBy ?? null,
    columnKeys: (fingerprint.columns ?? []).map((column) => column.key),
    hasFilterFn: fingerprint.hasFilterFn,
    hasFilterTreeFn: fingerprint.hasFilterTreeFn,
    hasGetSortValue: fingerprint.hasGetSortValue,
  });
}

function syncFrontendView<TRow>(args: {
  data: readonly TRow[];
  hookConfig: IncrementalViewConfig<TRow>;
  fingerprint: string;
  viewRef: { current: IncrementalView<TRow> | undefined };
  dataRef: { current: readonly TRow[] };
  fingerprintRef: { current: string | undefined };
  searchCache: Map<string, string>;
}): IncrementalView<TRow> {
  // Only follow a chrome reconfigure of THIS hook's snapshot. Looking
  // up `data` on first mount would steal another table's view — hosts
  // (and tests) reuse the same source array.
  if (args.viewRef.current) {
    const latest = incrementalViewOf(args.data);
    if (latest) args.viewRef.current = latest;
  }

  const previousData = args.dataRef.current;
  const previousFingerprint = args.fingerprintRef.current;
  const configChanged =
    previousFingerprint !== undefined &&
    previousFingerprint !== args.fingerprint;

  const log = args.data === previousData ? undefined : rowPatchLog(args.data);
  const canPatch =
    !configChanged &&
    args.viewRef.current !== undefined &&
    log !== undefined &&
    args.viewRef.current.rows === previousData &&
    logBelongsToPrevious(log, previousData);

  if (canPatch && log) {
    forgetPatchedSearch(args.searchCache, log);
    adoptHookRefs(args.viewRef.current!, args.hookConfig);
    const next = applyRowPatchLogToView(args.viewRef.current!, log);
    args.viewRef.current = next;
    args.dataRef.current = args.data;
    args.fingerprintRef.current = args.fingerprint;
    return next;
  }

  const dataChanged = args.data !== previousData;
  const first = args.viewRef.current === undefined;
  if (!first && !configChanged && !dataChanged) {
    adoptHookRefs(args.viewRef.current!, args.hookConfig);
    return args.viewRef.current!;
  }

  if (dataChanged && !canPatch) args.searchCache.clear();
  const created = createIncrementalView(
    args.data,
    mergeHookConfig(args.hookConfig, args.viewRef.current)
  );
  args.viewRef.current = created;
  args.dataRef.current = args.data;
  args.fingerprintRef.current = args.fingerprint;
  return created;
}

function adoptHookRefs<TRow>(
  view: IncrementalView<TRow>,
  hookConfig: IncrementalViewConfig<TRow>
): void {
  const current = incrementalViewConfig(view);
  if (!current) return;
  current.getRowId = hookConfig.getRowId;
  current.getSearchText = hookConfig.getSearchText;
  current.filterFn = hookConfig.filterFn;
  current.filterTreeFn = hookConfig.filterTreeFn;
  current.columns = hookConfig.columns;
  current.getSortValue = hookConfig.getSortValue;
}

function mergeHookConfig<TRow>(
  hookConfig: IncrementalViewConfig<TRow>,
  current: IncrementalView<TRow> | undefined
): IncrementalViewConfig<TRow> {
  const previous = current ? incrementalViewConfig(current) : undefined;
  if (!previous) return hookConfig;
  return {
    ...hookConfig,
    groupAggregates: previous.groupAggregates,
    groupSort: previous.groupSort,
    groupFilter: previous.groupFilter,
    groupFooters: previous.groupFooters,
    collapsedGroupIds: previous.collapsedGroupIds,
    blankLabel: previous.blankLabel,
    groupPageSize: previous.groupPageSize,
    rowPageSize: previous.rowPageSize,
    paging: previous.paging,
    summaryRow: previous.summaryRow,
    aggregateSpec: previous.aggregateSpec,
    aggregateOptions: previous.aggregateOptions,
    groupBy: hookConfig.groupBy ?? previous.groupBy,
  };
}

function forgetPatchedSearch<TRow>(
  cache: Map<string, string>,
  log: RowPatchLog<TRow>
): void {
  for (const event of log.events) {
    if (event.type !== "insert") cache.delete(event.id);
  }
}

/**
 * Did this log come from applying patches to `previous`? A copied array
 * (`[...applyRowPatches(...)]`) has no log; a log from a different source
 * fails the replay.
 */
function logBelongsToPrevious<TRow>(
  log: RowPatchLog<TRow>,
  previous: readonly TRow[]
): boolean {
  if (log.events.length === 0) return false;
  const working = previous.slice();
  for (const event of log.events) {
    if (event.type === "insert") {
      if (event.index < 0 || event.index > working.length) return false;
      working.splice(event.index, 0, event.row);
    } else if (event.type === "remove") {
      if (working[event.index] !== event.row) return false;
      working.splice(event.index, 1);
    } else if (working[event.index] !== event.prev) {
      return false;
    } else {
      working[event.index] = event.next;
    }
  }
  return working.length === log.rows.length;
}
