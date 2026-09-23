import {
  createTableEngine,
  devWarn,
  type ExtraFilters,
  incrementalSearchText,
  type IncrementalView,
  type IncrementalViewConfig,
  incrementalViewConfig,
  incrementalViewOf,
  type PaginationMode,
  type QueryFilterGroup,
  type RowPatchLog,
  rowPatchLog,
  type SortableValue,
  type SortDirection,
  type SortLevel,
  stableKey,
  type TableEngine,
  type TableSource,
} from "@adapttable/core";
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";

import type { ColumnDef } from "../columnDef";
import { resolvePaginationMode, useIsMobile } from "../hooks/useIsMobile";
import {
  useTableUrlState,
  type UseTableUrlStateOptions,
} from "../url/useTableUrlState";

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
   * Active locale tag. Sorting reads each column's `i18n` path for it, the
   * same path its cells and filters read.
   */
  locale?: string;
  /**
   * Force the resolved mobile state instead of using a media query.
   * Primarily a testing/SSR seam.
   */
  forceMobile?: boolean;
  /**
   * The width, in pixels, at or below which `paginationMode="auto"` resolves
   * to infinite scroll. Defaults to 768. Pass the table's `mobileBreakpoint`
   * so the mode follows the same rule as the card layout.
   */
  mobileBreakpoint?: number;
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
    mobileBreakpoint,
    locale,
    ...urlOptions
  } = options;

  const mediaMobile = useIsMobile(mobileBreakpoint);
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
    locale,
  };
  const hookConfig: IncrementalViewConfig<TRow> = {
    getRowId,
    getSearchText: projectSearchText,
    filterFn,
    extra: state.extra,
    filterTreeFn,
    filterTree: state.filterTree,
    columns,
    locale,
    getSortValue,
    sortBy,
    sortDir,
    sortLevels,
    search,
    groupBy,
  };

  const engineRef = useRef<TableEngine<TRow> | undefined>(undefined);
  const dataRef = useRef(data);
  const fingerprintRef = useRef<string | undefined>(undefined);
  engineRef.current ??= createTableEngine({
    data,
    columns: columns ?? [],
    locale,
    rowKey: getRowId,
    paginationMode: paged ? "paged" : "infinite",
    defaults: {
      page,
      limit,
      search,
      sortBy,
      sortDir,
      extra: state.extra,
      groupBy,
    },
    filterFn,
    getSearchText: projectSearchText,
  });
  const engine = engineRef.current;
  if (data !== dataRef.current) {
    const log = rowPatchLog(data);
    if (log) forgetPatchedSearch(searchCacheRef.current, log);
    else searchCacheRef.current.clear();
    engine.stageCandidate({}, { data });
    dataRef.current = data;
  }

  // One transaction carries the whole controlled view — query state, the
  // pagination strategy, and the page window — so the engine this hook
  // exposes can never describe a different window than the rows it returns.
  const nextFingerprint = `${hookViewFingerprint(fingerprint)}|${resolvedMode}|${String(page)}|${String(limit)}`;
  if (fingerprintRef.current !== nextFingerprint) {
    engine.stageCandidate({
      ...hookConfig,
      paginationMode: paged ? "paged" : "infinite",
      page,
      limit,
    });
    fingerprintRef.current = nextFingerprint;
  }

  // Everything this render reads comes from the candidate: the rows it is
  // about to show, the page it settled on, the totals beside them. The
  // committed engine — the one an agent or a second component holds — stays
  // on the table that is on screen until React accepts this render, which is
  // where `commitCandidate` below publishes it.
  const reader = engine.candidate;
  useLayoutEffect(() => {
    engine.commitCandidate();
  });

  const view = incrementalViewOf(reader.rows("full"));
  if (!view) {
    throw new Error("TableEngine is missing its incremental snapshot");
  }
  adoptHookRefs(view, hookConfig);

  if (sortLevels.length === 0 && sortBy && sortDir) {
    warnUnresolvableSort(
      sortBy,
      columns?.find((column) => column.key === sortBy),
      view.filtered,
      getSortValue
    );
  }

  const sorted = view.sorted;

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

  // The engine owns clamping, so `page` here is the page actually shown —
  // the same one the committed snapshot will report once this render lands.
  const snapshot = reader.snapshot();
  const total = snapshot.total;
  const safePage = snapshot.page;

  // A read of engine state, cached under the engine's own account of when that
  // state moved: `data` covers row identity and cell values, `view` covers
  // sort, filter, search, group, page and limit — between them, every input to
  // `rows("page")`. Deliberately not `useMemo`: the key is what changes and the
  // read never mentions it, which is the one shape a dependency array cannot
  // state without listing something it does not use.
  //
  // The reader is compared too, because a replaced engine starts its revisions
  // again at one and would otherwise match a cache from the engine before it.
  // Holding the slice by identity is the point: hosts rebuild extra/columns
  // (and useTableData's filterTreeFn) every render, and a new view identity
  // must not mint a new page slice or radix/base-ui findInTable loops.
  const pageCache = useRef<{
    reader: unknown;
    key: string;
    rows: readonly TRow[];
  } | null>(null);
  const pageKey = `${String(snapshot.revisions.data)}:${String(snapshot.revisions.view)}`;
  if (
    pageCache.current?.reader !== reader ||
    pageCache.current.key !== pageKey
  ) {
    pageCache.current = { reader, key: pageKey, rows: reader.rows("page") };
  }
  const rows = pageCache.current.rows;

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
    groupAggregateOverrides: state.groupAggregateOverrides,
    extra: state.extra,
    filterTree: state.filterTree,
    setPage: state.setPage,
    setLimit: state.setLimit,
    setSort: state.setSort,
    setGroupBy: state.setGroupBy,
    initializeGroupBy: state.initializeGroupBy,
    setGroupAggregateOverrides: state.setGroupAggregateOverrides,
    sortLevels: state.sortLevels,
    toggleSortLevel: state.toggleSortLevel,
    setSearch: state.setSearch,
    setExtra: state.setExtra,
    setExtras: state.setExtras,
    setFilterTree: state.setFilterTree,
    clearExtras: state.clearExtras,
    clearAll: state.clearAll,
    tableEngine: engine,
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
  locale: string | undefined;
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
    locale: fingerprint.locale ?? null,
  });
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

function forgetPatchedSearch<TRow>(
  cache: Map<string, string>,
  log: RowPatchLog<TRow>
): void {
  for (const event of log.events) {
    if (event.type !== "insert") cache.delete(event.id);
  }
}
