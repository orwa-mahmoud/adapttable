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

import { columnValueInputs } from "../columns/columnValueInputs";
import type {
  ColumnMetadata,
  ExtraFilters,
  SortableValue,
  SortDirection,
} from "../contracts/columns";
import type { QueryFilterGroup, SortLevel } from "../contracts/query";
import {
  createTableEngine,
  type CreateTableEngineOptions,
  type TableEngine,
  type TableEngineReader,
} from "../engine/createTableEngine";
import { engineSearchText } from "../engine/searchText";
import {
  sessionBase,
  sessionEvaluator,
  stageSessionEvaluator,
} from "../engine/tableSession";
import {
  type RowPatchEvent,
  type RowPatchLog,
  rowPatchLog,
  rowPatchLogStartsAt,
} from "../rows/patch";
import type { PaginationMode, ResolvedPaginationMode } from "../types";
import { devWarn } from "../utils/devWarn";
import { stableKey } from "../utils/stableKey";

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
  return engineSearchText(row);
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
  /** Stable row identity. Defaults to `defaultFrontendRowId`. */
  readonly getRowId?: (row: TRow) => string;
  /** Searchable text for a row. Defaults to `defaultSearchText`. */
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
 * Builds the engine a frontend source drives.
 *
 * {@link createFrontendSource} passes the full evaluator. A plain table
 * passes `createBasicTableEngine` so grouping stays out of that graph.
 *
 * @public
 */
export type FrontendEngineFactory<TRow> = (
  options: CreateTableEngineOptions<TRow>
) => TableEngine<TRow>;

/**
 * One table's frontend tier.
 *
 * @public
 */
export interface FrontendSource<TRow> {
  /** The engine the source drives, for agents and a second reader. */
  readonly engine: TableEngine<TRow>;
  /** The evaluator the next update will keep, or install if it changed. */
  readonly engineFactory: FrontendEngineFactory<TRow>;
  /**
   * Stage the host's data and view on the engine's candidate and read what
   * the table shows from it. Nothing outside the caller sees the change until
   * `FrontendSource.commit`.
   */
  readonly update: (
    config: FrontendSourceConfig<TRow>,
    view: FrontendSourceViewState
  ) => FrontendSourceFrame<TRow>;
  /** Publish the staged candidate to the engine's subscribers. */
  readonly commit: () => void;
  /**
   * Evaluate with `createEngine`'s evaluator from the next update on. The
   * engine keeps its id, selection, subscribers and revisions: the next
   * update stages the new evaluator on its candidate, and
   * `FrontendSource.commit` publishes it. An engine built outside
   * `createTableEngine` and `createBasicTableEngine` cannot take another
   * evaluator, so the next update replaces it. The same factory is a no-op.
   */
  readonly replaceEngine: (createEngine: FrontendEngineFactory<TRow>) => void;
}

/**
 * Value-only inputs. Callback and array identity are ignored; a column counts
 * by what its value is read from.
 */
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
    columns: columnValueInputs(config.columns),
    hasFilterFn: config.filterFn !== undefined,
    hasFilterTreeFn: config.filterTreeFn !== undefined,
    hasGetSortValue: config.getSortValue !== undefined,
    locale: config.locale ?? null,
    paginationMode: config.paginationMode,
    page: view.page,
    limit: view.limit,
  });
}

/** What the engine holds of a source's inputs, as far as the source can tell. */
interface HeldFrame<TRow> {
  readonly data: readonly TRow[] | undefined;
  readonly fingerprint: string | undefined;
  readonly filterKey: string | number | undefined;
  /** The search reader the view was evaluated with, when known. */
  readonly read: ((row: TRow) => string) | undefined;
}

/** What one complete update staged, and the engine view it left behind. */
interface StagedFrame<TRow> extends HeldFrame<TRow> {
  readonly view: object | undefined;
}

/** The row a patch event took out of the dataset, if it took one out. */
function replacedRow<TRow>(event: RowPatchEvent<TRow>): TRow | undefined {
  if (event.type === "remove") return event.row;
  if (event.type === "update") return event.prev;
  return undefined;
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
 * Create one table's frontend tier on an explicit evaluator.
 *
 * The first update seeds the engine; every later one restages it only when
 * the data array or a value-level input moved, so a host that rebuilds its
 * columns or filter callbacks on every render keeps the same page slice.
 * What the source last staged is compared only while the engine still holds
 * it: an update that threw, or a candidate that was dropped before its
 * commit, is staged again whole.
 * {@link createFrontendSource} is the convenience form that supplies the
 * full evaluator.
 *
 * @returns The source; call `FrontendSource.update` before reading.
 *
 * @public
 */
export function createFrontendSourceWith<TRow>(
  initialEngine: FrontendEngineFactory<TRow>
): FrontendSource<TRow> {
  let createEngine = initialEngine;
  let engine: TableEngine<TRow> | undefined;
  /** The factory that built {@link engine}, the evaluator it began with. */
  let builtWith = initialEngine;
  /**
   * What the last complete update staged, and the engine view it left. It
   * describes the engine only while the engine's base is still that view.
   */
  let staged: StagedFrame<TRow> | undefined;
  let getRowId: (row: TRow) => string = defaultFrontendRowId;
  let getSearchText: (row: TRow) => string = defaultSearchText;
  /**
   * Search text by row id, for the rows of {@link searchCacheData}. An entry
   * answers only for the row object it was read from and the reader that
   * read it, so text read from rows another dataset held — a patch, an
   * update that threw, a candidate that was dropped — or by a reader the
   * host has since replaced is read again rather than reused.
   */
  const searchCache = new Map<
    string,
    { row: TRow; read: (row: TRow) => string; text: string }
  >();
  let searchCacheData: readonly TRow[] | undefined;
  const projectSearchText = (row: TRow): string => {
    const id = getRowId(row);
    const cached = searchCache.get(id);
    if (cached?.row === row && cached.read === getSearchText)
      return cached.text;
    const text = getSearchText(row);
    searchCache.set(id, { row, read: getSearchText, text });
    return text;
  };

  /**
   * Point the search cache at `rows`. A row patch replaces the rows it
   * changes, so the other entries stay; any other new array may carry rows
   * the host changed in place, so the cache starts again.
   */
  function pointSearchCacheAt(rows: readonly TRow[]): void {
    if (rows === searchCacheData) return;
    const log = rowPatchLog(rows);
    if (log && searchCacheData && rowPatchLogStartsAt(log, searchCacheData)) {
      forgetPatchedRows(log);
    } else {
      searchCache.clear();
    }
    searchCacheData = rows;
  }

  /** Drop the text of every row a patch removed or replaced. */
  function forgetPatchedRows(log: RowPatchLog<TRow>): void {
    for (const event of log.events) {
      const gone = replacedRow(event);
      if (gone !== undefined && searchCache.get(event.id)?.row === gone) {
        searchCache.delete(event.id);
      }
    }
  }

  /** Stages since creation: revisions move once per candidate, not per stage. */
  let stages = 0;
  let searched:
    | {
        data: readonly TRow[];
        search: string;
        read: (row: TRow) => string;
        rows: readonly TRow[];
      }
    | undefined;

  let page:
    | { reader: TableEngineReader<TRow>; key: string; rows: readonly TRow[] }
    | undefined;

  function engineOf(
    config: FrontendSourceConfig<TRow>,
    view: FrontendSourceViewState
  ): TableEngine<TRow> {
    if (engine) return adoptEvaluator(engine, config, view);
    builtWith = createEngine;
    engine = createEngine({
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

  /**
   * Stage the requested evaluator on the live engine when it runs another.
   * A candidate dropped before its commit takes its evaluator with it, so
   * this asks the engine rather than remembering what it staged.
   */
  function adoptEvaluator(
    table: TableEngine<TRow>,
    config: FrontendSourceConfig<TRow>,
    view: FrontendSourceViewState
  ): TableEngine<TRow> {
    const live = sessionEvaluator(table) ?? builtWith;
    if (live === createEngine) return table;
    const carrier = createEngine({
      data: [],
      columns: config.columns ?? [],
      rowKey: getRowId,
    });
    const staged = stageSessionEvaluator(table, carrier, createEngine);
    carrier.dispose();
    if (staged) return table;
    // An engine of the host's own making cannot take another evaluator.
    table.discardCandidate();
    table.dispose();
    engine = undefined;
    forgetEngineState();
    return engineOf(config, view);
  }

  function forgetEngineState(): void {
    staged = undefined;
    stages = 0;
    searched = undefined;
    page = undefined;
    searchCache.clear();
    searchCacheData = undefined;
  }

  /**
   * The source's record of the engine, when the engine still holds what it
   * describes. An engine of the host's own making reports no base, and its
   * record is trusted as it was left.
   */
  function heldFrame(table: TableEngine<TRow>): HeldFrame<TRow> | undefined {
    const base = sessionBase(table);
    if (!base) return staged;
    const current = staged?.view === base.view ? staged : undefined;
    return {
      data: base.data as readonly TRow[],
      fingerprint: current?.fingerprint,
      filterKey: current?.filterKey,
      read: current?.read,
    };
  }

  function searchedRows(
    rows: readonly TRow[],
    search: string
  ): readonly TRow[] {
    if (
      searched?.data === rows &&
      searched.search === search &&
      searched.read === getSearchText
    ) {
      return searched.rows;
    }
    const term = search.trim().toLowerCase();
    const next = term
      ? rows.filter((row) =>
          projectSearchText(row).toLowerCase().includes(term)
        )
      : rows;
    searched = { data: rows, search, read: getSearchText, rows: next };
    return next;
  }

  function update(
    config: FrontendSourceConfig<TRow>,
    view: FrontendSourceViewState
  ): FrontendSourceFrame<TRow> {
    getRowId = config.getRowId ?? defaultFrontendRowId;
    getSearchText = config.getSearchText ?? defaultSearchText;
    pointSearchCacheAt(config.data);
    const table = engineOf(config, view);
    const held = heldFrame(table);

    if (config.data !== held?.data) {
      table.stageCandidate({}, { data: config.data });
      stages += 1;
    }

    const viewConfig = {
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
    // A new reader changes which rows a search keeps, without changing the
    // query, so an active search is evaluated again against it.
    const searchReaderChanged =
      held !== undefined &&
      held.read !== getSearchText &&
      view.search.trim() !== "";
    const filtersChanged =
      (held?.fingerprint !== undefined &&
        !Object.is(held.filterKey, config.filterKey)) ||
      searchReaderChanged;
    if (held?.fingerprint !== nextFingerprint || filtersChanged) {
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
      stages += 1;
    }

    // Everything this frame reads comes from the candidate; the committed
    // engine stays on the table on screen until the binding commits.
    const reader = table.candidate;
    table.refreshCallbacks({
      getRowId: viewConfig.getRowId,
      getSearchText: viewConfig.getSearchText,
      filterFn: viewConfig.filterFn,
      filterTreeFn: viewConfig.filterTreeFn,
      columns: viewConfig.columns,
      getSortValue: viewConfig.getSortValue,
    });

    const { sortBy, sortDir, sortLevels } = view;
    const sorted = reader.rows("full");
    if (sortLevels.length === 0 && sortBy && sortDir) {
      warnUnresolvableSort(
        sortBy,
        config.columns?.find((column) => column.key === sortBy),
        sorted,
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
    // Recorded last: an update that throws above leaves the previous record,
    // and the engine has already dropped the candidate it was building.
    staged = {
      view: sessionBase(table)?.view,
      data: config.data,
      fingerprint: nextFingerprint,
      filterKey: config.filterKey,
      read: getSearchText,
    };

    return {
      rows: page.rows,
      allFilteredRows: sorted,
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

  function replaceEngine(next: FrontendEngineFactory<TRow>): void {
    createEngine = next;
  }

  return {
    get engine() {
      if (!engine) {
        throw new Error("createFrontendSource: call update() before engine");
      }
      return engine;
    },
    get engineFactory() {
      return createEngine;
    },
    update,
    commit: () => engine?.commitCandidate(),
    replaceEngine,
  };
}

/**
 * Create one table's frontend tier with the full evaluator.
 *
 * Filter, sort, search, grouping, and aggregates all run in the engine.
 * A table that only filters, sorts, and searches uses
 * {@link createFrontendSourceWith} with `createBasicTableEngine`.
 *
 * @returns The source; call `FrontendSource.update` before reading.
 *
 * @public
 */
export function createFrontendSource<TRow>(): FrontendSource<TRow> {
  return createFrontendSourceWith(createTableEngine);
}
