/**
 * The frontend tier: a table whose rows are all in memory, sorted, searched,
 * filtered and paged on the client.
 *
 * A binding holds one {@link FrontendSource} per table and hands it the host's
 * data, its row callbacks and the view state on every update. The source keeps
 * the rules every binding shares — the per-row search text cache and when a
 * row patch invalidates it, restaging the engine only when a value-level input
 * moved, the facet rows (searched, not yet filtered), one page slice per engine
 * revision, and whether an infinite list has more — so a binding adds only its
 * own reactivity and the moment it commits.
 */
import type { ColumnMetadata, SortableValue } from "../columnModel";
import {
  createTableEngine,
  type TableEngine,
  type TableEngineReader,
} from "../engine/createTableEngine";
import {
  incrementalSearchText,
  type IncrementalView,
  type IncrementalViewConfig,
  incrementalViewConfig,
  incrementalViewOf,
} from "../rows/incremental";
import {
  type RowPatchLog,
  rowPatchLog,
  rowPatchLogStartsAt,
} from "../rows/patch";
import type { SortLevel } from "../sort/compare";
import type {
  ExtraFilters,
  PaginationMode,
  ResolvedPaginationMode,
  SortDirection,
} from "../types";
import { devWarn } from "../utils/devWarn";
import { stableKey } from "../utils/stableKey";
import type { QueryFilterGroup } from "./queryContract";

/**
 * Resolve `"auto"` to a concrete pagination mode (mobile → infinite,
 * desktop → paged). A non-auto mode is returned unchanged.
 *
 * @param mode - The requested pagination mode.
 * @param isMobile - Whether the table is in its mobile layout.
 * @returns The resolved mode.
 *
 * @public
 */
export function resolvePaginationMode(
  mode: PaginationMode,
  isMobile: boolean
): ResolvedPaginationMode {
  if (mode !== "auto") return mode;
  return isMobile ? "infinite" : "paged";
}

/**
 * Default searchable text for a frontend row: its own values, flattened.
 *
 * @public
 */
export function defaultSearchText<TRow>(row: TRow): string {
  return incrementalSearchText(row);
}

/**
 * Default row id for a frontend row: its `id` field, or the row itself when
 * it is a string or number, else `""`.
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
 * The host's rows and row callbacks, as of one update.
 *
 * @public
 */
export interface FrontendSourceConfig<TRow> {
  /** Every row. The host still owns this array. */
  readonly data: readonly TRow[];
  /** Stable row identity. Defaults to {@link defaultFrontendRowId}. */
  readonly getRowId?: (row: TRow) => string;
  /** Searchable text for a row. Defaults to {@link defaultSearchText}. */
  readonly getSearchText?: (row: TRow) => string;
  /** Sort value for a cell, overriding each column's own. */
  readonly getSortValue?: (row: TRow, columnKey: string) => SortableValue;
  /** Columns, for sort values and `i18n` paths. */
  readonly columns?: readonly ColumnMetadata<TRow>[];
  /** Client filter over the extra-filter bag. */
  readonly filterFn?: (row: TRow, extra: ExtraFilters) => boolean;
  /** Client filter over the nested filter tree. */
  readonly filterTreeFn?: (row: TRow, tree: QueryFilterGroup) => boolean;
  /**
   * Semantic version of the filter predicates. Change it when their meaning
   * changes without a data or query change; callback identity alone is inert.
   */
  readonly filterKey?: string | number;
  /** Active locale for `i18n` column paths. */
  readonly locale?: string;
  /** `"paged"` shows one page; `"infinite"` grows the window. */
  readonly paginationMode: ResolvedPaginationMode;
}

/**
 * The view state a frontend source shows, as the view-state store holds it.
 *
 * @public
 */
export interface FrontendSourceViewState {
  /** Requested 1-based page. */
  readonly page: number;
  /** Rows per page. */
  readonly limit: number;
  /** Committed search term. */
  readonly search: string;
  /** Active sort column key, if any. */
  readonly sortBy: string | undefined;
  /** Active sort direction, if any. */
  readonly sortDir: SortDirection | undefined;
  /** The multi-column sort chain, empty when a single sort (or none) applies. */
  readonly sortLevels: readonly SortLevel[];
  /** Active row-grouping keys, comma-separated, if any. */
  readonly groupBy: string | undefined;
  /** The extra-filter bag. */
  readonly extra: ExtraFilters;
  /** Nested AND/OR filter tree, if any. */
  readonly filterTree: QueryFilterGroup | undefined;
}

/**
 * What a frontend source shows for one update.
 *
 * @public
 */
export interface FrontendSourceFrame<TRow> {
  /** The rows on the current page (or window, when infinite). */
  readonly rows: readonly TRow[];
  /** Every row after search and filters, sorted. */
  readonly allFilteredRows: readonly TRow[];
  /** Every row after search, before filters — what facets count. */
  readonly allSearchedRows: readonly TRow[];
  /** Rows matching the search and filters. */
  readonly total: number;
  /** The page actually shown, after clamping. */
  readonly page: number;
  /** Whether an infinite list has rows beyond the window. */
  readonly hasNextPage: boolean;
}

/**
 * One table's frontend tier.
 *
 * @public
 */
export interface FrontendSource<TRow> {
  /** The engine the source drives, for agents and a second reader. */
  readonly engine: TableEngine<TRow>;
  /**
   * Stage the host's data and view on the engine's candidate and read what
   * the table shows from it. Nothing outside the caller sees the change until
   * {@link FrontendSource.commit}.
   */
  readonly update: (
    config: FrontendSourceConfig<TRow>,
    view: FrontendSourceViewState
  ) => FrontendSourceFrame<TRow>;
  /** Publish the staged candidate to the engine's subscribers. */
  readonly commit: () => void;
}

/** Value-only inputs. Callback and array identity are ignored. */
function viewFingerprint<TRow>(
  config: FrontendSourceConfig<TRow>,
  view: FrontendSourceViewState
): string {
  return stableKey({
    extra: view.extra,
    filterTree: view.filterTree ?? null,
    search: view.search,
    sortBy: view.sortBy ?? null,
    sortDir: view.sortDir ?? null,
    sortLevels: view.sortLevels.map((level) => ({
      key: level.key,
      dir: level.dir,
    })),
    groupBy: view.groupBy ?? null,
    columnKeys: (config.columns ?? []).map((column) => column.key),
    hasFilterFn: config.filterFn !== undefined,
    hasFilterTreeFn: config.filterTreeFn !== undefined,
    hasGetSortValue: config.getSortValue !== undefined,
    locale: config.locale ?? null,
    paginationMode: config.paginationMode,
    page: view.page,
    limit: view.limit,
  });
}

/** Point the live view at this update's callbacks without restaging it. */
function adoptCallbacks<TRow>(
  view: IncrementalView<TRow>,
  config: IncrementalViewConfig<TRow>
): void {
  const current = incrementalViewConfig(view);
  if (!current) return;
  current.getRowId = config.getRowId;
  current.getSearchText = config.getSearchText;
  current.filterFn = config.filterFn;
  current.filterTreeFn = config.filterTreeFn;
  current.columns = config.columns;
  current.getSortValue = config.getSortValue;
}

function forgetPatchedSearch<TRow>(
  cache: Map<string, string>,
  log: RowPatchLog<TRow>
): void {
  for (const event of log.events) {
    if (event.type !== "insert") cache.delete(event.id);
  }
}

/** Narrows an accessor's value to a sortable primitive, else `null`. */
const toSortable = (value: unknown): SortableValue =>
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean"
    ? value
    : null;

/**
 * Dev-only: surface a sort that cannot resolve values (a silent no-op).
 * The most common cause is forgetting to pass `columns`.
 */
function warnUnresolvableSort<TRow>(
  sortBy: string,
  column: ColumnMetadata<TRow> | undefined,
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
 * Create one table's frontend tier.
 *
 * The first update seeds the engine; every later one restages it only when
 * the data array or a value-level input moved, so a host that rebuilds its
 * columns or filter callbacks on every render keeps the same page slice.
 *
 * @returns The source; call {@link FrontendSource.update} before reading.
 *
 * @public
 */
export function createFrontendSource<TRow>(): FrontendSource<TRow> {
  let engine: TableEngine<TRow> | undefined;
  let data: readonly TRow[] | undefined;
  let fingerprint: string | undefined;
  let filterKey: string | number | undefined;
  let getRowId: (row: TRow) => string = defaultFrontendRowId;
  let getSearchText: (row: TRow) => string = defaultSearchText;
  const searchCache = new Map<string, string>();
  const projectSearchText = (row: TRow): string => {
    const id = getRowId(row);
    const cached = searchCache.get(id);
    if (cached !== undefined) return cached;
    const text = getSearchText(row);
    searchCache.set(id, text);
    return text;
  };
  /** Stages since creation: revisions move once per candidate, not per stage. */
  let stages = 0;
  let searched:
    | { data: readonly TRow[]; search: string; rows: readonly TRow[] }
    | undefined;
  let page:
    | { reader: TableEngineReader<TRow>; key: string; rows: readonly TRow[] }
    | undefined;

  function engineOf(
    config: FrontendSourceConfig<TRow>,
    view: FrontendSourceViewState
  ): TableEngine<TRow> {
    if (engine) return engine;
    data = config.data;
    engine = createTableEngine({
      data: config.data,
      columns: config.columns ?? [],
      locale: config.locale,
      rowKey: getRowId,
      paginationMode: config.paginationMode,
      defaults: {
        page: view.page,
        limit: view.limit,
        search: view.search,
        sortBy: view.sortBy,
        sortDir: view.sortDir,
        extra: view.extra,
        groupBy: view.groupBy,
      },
      filterFn: config.filterFn,
      getSearchText: projectSearchText,
    });
    return engine;
  }

  function searchedRows(
    rows: readonly TRow[],
    search: string
  ): readonly TRow[] {
    if (searched?.data === rows && searched.search === search) {
      return searched.rows;
    }
    const term = search.trim().toLowerCase();
    const next = term
      ? rows.filter((row) =>
          projectSearchText(row).toLowerCase().includes(term)
        )
      : rows;
    searched = { data: rows, search, rows: next };
    return next;
  }

  function update(
    config: FrontendSourceConfig<TRow>,
    view: FrontendSourceViewState
  ): FrontendSourceFrame<TRow> {
    getRowId = config.getRowId ?? defaultFrontendRowId;
    getSearchText = config.getSearchText ?? defaultSearchText;
    const table = engineOf(config, view);

    if (config.data !== data) {
      const log = rowPatchLog(config.data);
      if (log && data && rowPatchLogStartsAt(log, data)) {
        forgetPatchedSearch(searchCache, log);
      } else searchCache.clear();
      table.stageCandidate({}, { data: config.data });
      data = config.data;
      stages += 1;
    }

    const viewConfig: IncrementalViewConfig<TRow> = {
      getRowId,
      getSearchText: projectSearchText,
      filterFn: config.filterFn,
      extra: view.extra,
      filterTreeFn: config.filterTreeFn,
      filterTree: view.filterTree,
      columns: config.columns,
      locale: config.locale,
      getSortValue: config.getSortValue,
      sortBy: view.sortBy,
      sortDir: view.sortDir,
      sortLevels: view.sortLevels,
      search: view.search,
      groupBy: view.groupBy,
    };

    // One transaction carries the whole view — query state, the pagination
    // strategy and the page window — so the engine can never describe a
    // different window than the rows this frame returns.
    const nextFingerprint = viewFingerprint(config, view);
    const filtersChanged =
      fingerprint !== undefined && !Object.is(filterKey, config.filterKey);
    if (fingerprint !== nextFingerprint || filtersChanged) {
      table.stageCandidate({
        ...viewConfig,
        paginationMode: config.paginationMode,
        page: view.page,
        limit: view.limit,
      });
      if (filtersChanged) {
        // First adopt the new callbacks, then re-evaluate the same dataset.
        // The engine stages changed row membership as a view revision and
        // publishes it only at commit; the host's data identity stays intact.
        table.stageCandidate({}, { data: config.data });
      }
      fingerprint = nextFingerprint;
      filterKey = config.filterKey;
      stages += 1;
    }

    // Everything this frame reads comes from the candidate; the committed
    // engine stays on the table on screen until the binding commits.
    const reader = table.candidate;
    const incremental = incrementalViewOf(reader.rows("full"));
    if (!incremental) {
      throw new Error("TableEngine is missing its incremental snapshot");
    }
    adoptCallbacks(incremental, viewConfig);

    const { sortBy, sortDir, sortLevels } = view;
    if (sortLevels.length === 0 && sortBy && sortDir) {
      warnUnresolvableSort(
        sortBy,
        config.columns?.find((column) => column.key === sortBy),
        incremental.filtered,
        config.getSortValue
      );
    }

    // The engine owns clamping, so `page` is the page actually shown.
    const snapshot = reader.snapshot();

    // One page slice per engine revision: `data` covers row identity and
    // cell values, `view` covers everything else `rows("page")` reads. A host
    // that rebuilds its callbacks keeps the same slice by identity. The stage
    // count covers a second stage onto a candidate not yet committed, whose
    // revisions have already moved once. The reader is compared too, because
    // a replaced engine restarts its revisions.
    const pageKey = `${String(snapshot.revisions.data)}:${String(snapshot.revisions.view)}:${String(stages)}`;
    if (page?.reader !== reader || page.key !== pageKey) {
      page = { reader, key: pageKey, rows: reader.rows("page") };
    }

    return {
      rows: page.rows,
      allFilteredRows: incremental.sorted,
      // Facets count after search, BEFORE extra filters: `filtered` already
      // applied filterFn, so a selected checklist would hide every other value.
      allSearchedRows: searchedRows(config.data, view.search),
      total: snapshot.total,
      page: snapshot.page,
      hasNextPage:
        config.paginationMode !== "paged" &&
        snapshot.page * view.limit < snapshot.total,
    };
  }

  return {
    get engine() {
      if (!engine) {
        throw new Error("createFrontendSource: call update() before engine");
      }
      return engine;
    },
    update,
    commit: () => engine?.commitCandidate(),
  };
}
