/**
 * Incremental re-evaluation of a patched row set.
 *
 * {@link applyRowPatches} is the data path — it still owns the rows. This
 * module sits on the patch log and re-runs search, filters, sort, grouping
 * and aggregates for the rows a patch touched, instead of walking the
 * whole set again.
 *
 * Build a snapshot with {@link createIncrementalView}, then feed patches
 * through {@link applyRowPatchesToView}. A host that already called
 * `applyRowPatches` can pass {@link rowPatchLog} into
 * {@link applyRowPatchLogToView} so the same patches are not applied twice.
 */
import type { ReactNode } from "react";

import {
  aggregate,
  type AggregateOptions,
  type AggregateSpec,
} from "../aggregate/aggregate";
import {
  type BuildGroupedFlatModelOptions,
  flattenGroupPartitions,
  type GroupAggregatesFn,
  type GroupedFlatEntry,
  groupingKeys,
  type GroupNode,
  type GroupPaging,
  type GroupSort,
  makeGroupRowKey,
  partitionGroupedRows,
} from "../grouping/groupRows";
import {
  compareSortEntries,
  compareSortLevel,
  sortedInsertIndex,
  type SortLevel,
  sortRows,
  sortRowsMulti,
} from "../sort/compare";
import type { QueryFilterGroup } from "../source/queryContract";
import type {
  ColumnDef,
  ExtraFilters,
  SortableValue,
  SortDirection,
} from "../types";
import { stableKey } from "../utils/stableKey";
import {
  addAggregateRow,
  createIncrementalAggregate,
  type IncrementalAggregate,
  readIncrementalAggregate,
  removeAggregateRow,
  replaceAggregateRow,
} from "./incrementalAggregate";
import {
  addGroupedRow,
  type IncrementalGroupTree,
  incrementalGroupTree,
  moveGroupedRow,
  removeGroupedRow,
  rowGroupPath,
  snapshotPartitions,
} from "./incrementalGroup";
import {
  applyRowPatchesWithLog,
  type RowPatch,
  type RowPatchEvent,
  type RowPatchLog,
} from "./patch";

export { rowPatchLog } from "./patch";

/**
 * How the table turns a row set into a filtered, sorted, grouped view.
 *
 * @public
 */
export interface IncrementalViewConfig<TRow> {
  /** How a row's id is derived; the table's own `rowKey`. */
  getRowId: (row: TRow) => string;
  /**
   * Project a row to its searchable text. Defaults to a flatten of the
   * row's own values — the same default `useFrontendData` uses.
   */
  getSearchText?: (row: TRow) => string;
  /** Active search term. Empty / omitted means no search. */
  search?: string;
  /** Client-side extra-filter predicate. */
  filterFn?: (row: TRow, extra: ExtraFilters) => boolean;
  /** The extra-filter bag `filterFn` reads. */
  extra?: ExtraFilters;
  /**
   * Evaluate the AND/OR filter tree against a row. Omit and the tree is
   * stored but not applied — same seam as `useFrontendData`.
   */
  filterTreeFn?: (row: TRow, tree: QueryFilterGroup) => boolean;
  /** The active filter tree, when there is one. */
  filterTree?: QueryFilterGroup;
  /** Columns — sort and group values resolve through these. */
  columns?: readonly ColumnDef<TRow>[];
  /** Override a column's sort value. */
  getSortValue?: (row: TRow, columnKey: string) => SortableValue;
  /** Single-column sort. Ignored when `sortLevels` is non-empty. */
  sortBy?: string;
  /** Single-column sort direction. */
  sortDir?: SortDirection;
  /** Multi-column sort chain. Supersedes `sortBy` / `sortDir`. */
  sortLevels?: readonly SortLevel[];
  /** Group by one key, or several for a nested grouping. */
  groupBy?: string | readonly string[];
  /** Per-group cells — same signature as `summaryRow`. */
  groupAggregates?: GroupAggregatesFn<TRow>;
  /** Order groups within their parent. */
  groupSort?: GroupSort<TRow>;
  /** Keep only the groups this answers true for. */
  groupFilter?: (group: GroupNode<TRow>) => boolean;
  /** Close every group with a footer row. */
  groupFooters?: boolean;
  /** Collapsed group keys. */
  collapsedGroupIds?: ReadonlySet<string>;
  /** Override the blank-group label. */
  blankLabel?: string;
  /** Page size for top-level groups. */
  groupPageSize?: number;
  /** Page size for leaves inside a group. */
  rowPageSize?: number;
  /** How many extra groups / rows are currently revealed. */
  paging?: GroupPaging;
  /** Grand-total mapper over the sorted (filtered) set. */
  summaryRow?: (rows: readonly TRow[]) => Partial<Record<string, ReactNode>>;
  /**
   * Built-in aggregate spec for incremental totals. Used for the grand
   * total when `summaryRow` is omitted, and for group cells when
   * `groupAggregates` is omitted.
   */
  aggregateSpec?: AggregateSpec;
  /** Options for {@link IncrementalViewConfig.aggregateSpec}. */
  aggregateOptions?: AggregateOptions<TRow>;
}

/**
 * A derived snapshot of a row set. The latest snapshot is the only one
 * {@link applyRowPatchesToView} may be called on — applying to a stale
 * snapshot rebuilds from its `rows` instead of continuing incrementally.
 *
 * @public
 */
export interface IncrementalView<TRow> {
  /** Source rows after patches — same contract as {@link applyRowPatches}. */
  readonly rows: readonly TRow[];
  /** After search, extra filters and the filter tree. */
  readonly filtered: readonly TRow[];
  /** After sort, or `filtered` when unsorted. */
  readonly sorted: readonly TRow[];
  /** Grouped flat model, when grouping is configured. */
  readonly groups: readonly GroupedFlatEntry<TRow>[] | undefined;
  /** Grand-total cells over `sorted`. */
  readonly aggregates: Partial<Record<string, ReactNode>> | undefined;
}

interface ViewState<TRow> {
  config: IncrementalViewConfig<TRow>;
  searchText: Map<string, string>;
  sortValues: Map<string, readonly SortableValue[]>;
  filtered: TRow[];
  filteredSourceIndex: number[];
  filteredPos: Map<string, number>;
  sorted: TRow[];
  sortedPos: Map<string, number>;
  tree: IncrementalGroupTree<TRow> | undefined;
  summary: IncrementalAggregate<TRow> | undefined;
  summaryDirty: boolean;
  groupCells: Map<string, Partial<Record<string, ReactNode>>>;
  dirtyGroups: Set<string>;
}

type FilterDelta<TRow> =
  | { kind: "none" }
  | { kind: "enter"; id: string; row: TRow }
  | { kind: "leave"; id: string; row: TRow }
  | { kind: "replace"; id: string; prev: TRow; next: TRow };

const STATES = new WeakMap<IncrementalView<unknown>, ViewState<unknown>>();
const VIEWS = new WeakMap<readonly unknown[], IncrementalView<unknown>>();

/**
 * The snapshot {@link createIncrementalView} attached to a derived row
 * array (`rows` / `filtered` / `sorted`, or a page slice the host
 * attached). Spreading that array drops the link, same as
 * {@link rowPatchLog}.
 *
 * @public
 */
export function incrementalViewOf<TRow>(
  rows: readonly TRow[]
): IncrementalView<TRow> | undefined {
  return VIEWS.get(rows) as IncrementalView<TRow> | undefined;
}

/**
 * Point a derived array (a page slice) at the snapshot it came from, so
 * {@link incrementalViewOf} can find aggregates / groups without a
 * second argument.
 *
 * @public
 */
export function attachIncrementalView<TRow>(
  rows: readonly TRow[],
  view: IncrementalView<TRow>
): void {
  VIEWS.set(rows, view);
}

/**
 * The config the snapshot was last built or reconfigured with.
 *
 * @public
 */
export function incrementalViewConfig<TRow>(
  view: IncrementalView<TRow>
): IncrementalViewConfig<TRow> | undefined {
  return getState(view)?.config;
}

/**
 * Merge new settings into a snapshot without walking the row set when
 * only grouping / summary extras changed.
 *
 * Filter, sort and search changes rebuild the derived arrays. Grouping
 * and summary extras rebuild only those stages and keep `filtered` /
 * `sorted` identity. A patch that only replaces a callback or a
 * `columns` array with the same keys returns the same view object —
 * hosts rebuild those every render, and a new view identity must not
 * ripple into the page slice.
 *
 * @typeParam TRow - The row type.
 * @param view - The latest snapshot.
 * @param patch - Fields to merge. `undefined` entries are ignored.
 *
 * @public
 */
export function configureIncrementalView<TRow>(
  view: IncrementalView<TRow>,
  patch: Partial<IncrementalViewConfig<TRow>>
): IncrementalView<TRow> {
  const state = getState(view);
  if (!state) {
    throw new Error(
      "configureIncrementalView needs a snapshot from createIncrementalView"
    );
  }
  const merged: IncrementalViewConfig<TRow> = {
    ...state.config,
    ...definedConfigPatch(patch),
  };
  const queryChanged =
    queryConfigFingerprint(state.config) !== queryConfigFingerprint(merged);
  const derivedChanged =
    derivedConfigFingerprint(state.config) !== derivedConfigFingerprint(merged);
  state.config = merged;
  if (!queryChanged && !derivedChanged) return view;
  if (queryChanged) return createIncrementalView(view.rows, merged);
  return republishDerived(view, state, merged);
}

/**
 * Default searchable-text projector: flatten a row's own values. Kept
 * here so this module does not import the React hook that publishes the
 * same helper on `useFrontendData`.
 *
 * @public
 */
export function incrementalSearchText<TRow>(row: TRow): string {
  if (row && typeof row === "object") {
    return Object.values(row)
      .map((value) => {
        if (value == null) return "";
        if (typeof value === "object") return JSON.stringify(value);
        return String(value as string | number | boolean);
      })
      .join(" ");
  }
  return String(row ?? "");
}

/**
 * Build a snapshot by fully evaluating `rows`. Patches after this go
 * through {@link applyRowPatchesToView} so only touched rows are
 * re-evaluated.
 *
 * @typeParam TRow - The row type.
 * @param rows - The current source rows.
 * @param config - Filter / sort / group / aggregate settings.
 *
 * @public
 */
export function createIncrementalView<TRow>(
  rows: readonly TRow[],
  config: IncrementalViewConfig<TRow>
): IncrementalView<TRow> {
  const getId = config.getRowId;
  const filtered = hasFilter(config)
    ? rows.filter((row) => rowMatches(row, config))
    : [...rows];
  const sorted = hasSort(config) ? fullSort(filtered, config) : filtered;
  const keys = groupingKeys(config.groupBy ?? []);
  const columns = config.columns ?? [];
  const partitions =
    keys.length > 0 ? partitionGroupedRows(sorted, keys, columns) : [];
  const tree =
    keys.length > 0
      ? incrementalGroupTree(partitions, keys, columns)
      : undefined;
  const groups =
    keys.length > 0
      ? flattenGroupPartitions(partitions, groupFlattenOptions(config))
      : undefined;
  const summary = config.aggregateSpec
    ? createIncrementalAggregate(
        config.aggregateSpec,
        sorted,
        config.aggregateOptions
      )
    : undefined;
  const aggregates = readSummary(sorted, config, summary);
  const state: ViewState<TRow> = {
    config,
    searchText: new Map(),
    sortValues: new Map(),
    filtered: filtered,
    filteredSourceIndex: sourceIndices(filtered, rows, getId),
    filteredPos: indexMap(filtered, getId),
    sorted: sorted,
    sortedPos: indexMap(sorted, getId),
    tree,
    summary,
    summaryDirty: false,
    groupCells: new Map(),
    dirtyGroups: new Set(),
  };
  warmCaches(state, filtered, config);
  if (groups) cacheGroupCells(state, groups);
  return publish(rows, filtered, sorted, groups, aggregates, state);
}

/**
 * Apply patches to a snapshot: {@link applyRowPatches} for the rows, then
 * incremental re-evaluation of every derived stage.
 *
 * @typeParam TRow - The row type.
 * @param view - The latest snapshot.
 * @param patches - The changes to apply, in order.
 *
 * @public
 */
export function applyRowPatchesToView<TRow>(
  view: IncrementalView<TRow>,
  patches: readonly RowPatch<TRow>[]
): IncrementalView<TRow> {
  const state = getState(view);
  if (!state) {
    throw new Error(
      "applyRowPatchesToView needs a snapshot from createIncrementalView"
    );
  }
  return applyRowPatchLogToView(
    view,
    applyRowPatchesWithLog(view.rows, patches, state.config.getRowId)
  );
}

/**
 * Continue a snapshot from a log {@link applyRowPatches} already produced.
 * Use this when the host applied the patches itself and the incremental
 * view must not apply them a second time.
 *
 * @typeParam TRow - The row type.
 * @param view - The snapshot taken against the pre-patch rows.
 * @param log - The log attached to the post-patch array.
 *
 * @public
 */
export function applyRowPatchLogToView<TRow>(
  view: IncrementalView<TRow>,
  log: RowPatchLog<TRow>
): IncrementalView<TRow> {
  const state = getState(view);
  if (!state) {
    throw new Error(
      "applyRowPatchLogToView needs a snapshot from createIncrementalView"
    );
  }
  if (log.events.length === 0) return view;
  const config = state.config;
  if (!needsDerived(config)) {
    return publish(log.rows, log.rows, log.rows, undefined, undefined, state);
  }

  state.filtered = state.filtered.slice();
  state.filteredSourceIndex = state.filteredSourceIndex.slice();
  state.sorted = state.sorted.slice();

  const source = [...view.rows];
  for (const event of log.events) {
    applySourceEvent(source, event);
    const delta = applyFilterEvent(state, event, source, config);
    applySortEvent(state, delta, config);
    applyGroupEvent(state, delta, config);
    applySummaryEvent(state, delta, config);
  }

  const filtered = hasFilter(config) ? state.filtered : log.rows;
  const sorted = hasSort(config) ? state.sorted : filtered;
  state.filtered = filtered as TRow[];
  state.sorted = sorted as TRow[];
  state.filteredPos = indexMap(filtered, config.getRowId);
  state.sortedPos = indexMap(sorted, config.getRowId);

  const groups = state.tree
    ? paintGroups(
        flattenGroupPartitions(
          snapshotPartitions(state.tree),
          groupFlattenOptions(config, true)
        ),
        state,
        config
      )
    : undefined;
  const aggregates = readSummary(sorted, config, state.summary);
  state.summaryDirty = false;
  return publish(log.rows, filtered, sorted, groups, aggregates, state);
}

function getState<TRow>(
  view: IncrementalView<TRow>
): ViewState<TRow> | undefined {
  return STATES.get(view) as ViewState<TRow> | undefined;
}

function publish<TRow>(
  rows: readonly TRow[],
  filtered: readonly TRow[],
  sorted: readonly TRow[],
  groups: readonly GroupedFlatEntry<TRow>[] | undefined,
  aggregates: Partial<Record<string, ReactNode>> | undefined,
  state: ViewState<TRow>
): IncrementalView<TRow> {
  const view: IncrementalView<TRow> = {
    rows,
    filtered,
    sorted,
    groups,
    aggregates,
  };
  STATES.set(view, state as ViewState<unknown>);
  VIEWS.set(rows, view);
  VIEWS.set(filtered, view);
  VIEWS.set(sorted, view);
  return view;
}

function republishDerived<TRow>(
  view: IncrementalView<TRow>,
  state: ViewState<TRow>,
  config: IncrementalViewConfig<TRow>
): IncrementalView<TRow> {
  const keys = groupingKeys(config.groupBy ?? []);
  const columns = config.columns ?? [];
  const partitions =
    keys.length > 0 ? partitionGroupedRows(state.sorted, keys, columns) : [];
  state.tree =
    keys.length > 0
      ? incrementalGroupTree(partitions, keys, columns)
      : undefined;
  state.groupCells = new Map();
  state.dirtyGroups = new Set();
  const groups =
    keys.length > 0
      ? flattenGroupPartitions(partitions, groupFlattenOptions(config))
      : undefined;
  if (groups) cacheGroupCells(state, groups);
  state.summary = config.aggregateSpec
    ? createIncrementalAggregate(
        config.aggregateSpec,
        state.sorted,
        config.aggregateOptions
      )
    : undefined;
  state.summaryDirty = false;
  return publish(
    view.rows,
    view.filtered,
    view.sorted,
    groups,
    readSummary(state.sorted, config, state.summary),
    state
  );
}

function definedConfigPatch<TRow>(
  patch: Partial<IncrementalViewConfig<TRow>>
): Partial<IncrementalViewConfig<TRow>> {
  const defined: Partial<IncrementalViewConfig<TRow>> = {};
  for (const key of Object.keys(
    patch
  ) as (keyof IncrementalViewConfig<TRow>)[]) {
    const value = patch[key];
    if (value !== undefined) Object.assign(defined, { [key]: value });
  }
  return defined;
}

function queryConfigFingerprint<TRow>(
  config: IncrementalViewConfig<TRow>
): string {
  return stableKey({
    search: config.search ?? "",
    extra: config.extra ?? {},
    filterTree: config.filterTree ?? null,
    sortBy: config.sortBy ?? null,
    sortDir: config.sortDir ?? null,
    sortLevels: (config.sortLevels ?? []).map((level) => ({
      key: level.key,
      dir: level.dir,
    })),
    columnKeys: (config.columns ?? []).map((column) => column.key),
    hasFilterFn: config.filterFn !== undefined,
    hasFilterTreeFn: config.filterTreeFn !== undefined,
    hasGetSortValue: config.getSortValue !== undefined,
  });
}

function derivedConfigFingerprint<TRow>(
  config: IncrementalViewConfig<TRow>
): string {
  return stableKey({
    groupBy: groupingKeys(config.groupBy ?? []),
    groupFooters: Boolean(config.groupFooters),
    collapsed: config.collapsedGroupIds
      ? [...config.collapsedGroupIds].sort((a, b) => a.localeCompare(b))
      : [],
    groupPageSize: config.groupPageSize ?? null,
    rowPageSize: config.rowPageSize ?? null,
    paging: config.paging ?? null,
    blankLabel: config.blankLabel ?? null,
    hasGroupAggregates: config.groupAggregates !== undefined,
    hasGroupSort: config.groupSort !== undefined,
    hasGroupFilter: config.groupFilter !== undefined,
    hasSummaryRow: config.summaryRow !== undefined,
    hasAggregateSpec: config.aggregateSpec !== undefined,
  });
}

function needsDerived<TRow>(config: IncrementalViewConfig<TRow>): boolean {
  return (
    hasFilter(config) ||
    hasSort(config) ||
    groupingKeys(config.groupBy ?? []).length > 0 ||
    config.summaryRow !== undefined ||
    config.aggregateSpec !== undefined
  );
}

function hasFilter<TRow>(config: IncrementalViewConfig<TRow>): boolean {
  return (
    Boolean(searchTerm(config)) ||
    config.filterFn !== undefined ||
    (config.filterTree !== undefined && config.filterTreeFn !== undefined)
  );
}

function hasSort<TRow>(config: IncrementalViewConfig<TRow>): boolean {
  if (config.sortLevels && config.sortLevels.length > 0) return true;
  return Boolean(config.sortBy && config.sortDir);
}

function searchTerm<TRow>(config: IncrementalViewConfig<TRow>): string {
  return config.search?.trim().toLowerCase() ?? "";
}

function rowMatches<TRow>(
  row: TRow,
  config: IncrementalViewConfig<TRow>,
  cachedText?: string
): boolean {
  const term = searchTerm(config);
  if (term) {
    const projector = config.getSearchText ?? incrementalSearchText;
    const text = (cachedText ?? projector(row)).toLowerCase();
    if (!text.includes(term)) return false;
  }
  if (config.filterFn && !config.filterFn(row, config.extra ?? {})) {
    return false;
  }
  if (
    config.filterTree &&
    config.filterTreeFn &&
    !config.filterTreeFn(row, config.filterTree)
  ) {
    return false;
  }
  return true;
}

function fullSort<TRow>(
  rows: readonly TRow[],
  config: IncrementalViewConfig<TRow>
): TRow[] {
  const levels = config.sortLevels;
  if (levels && levels.length > 0) {
    return sortRowsMulti(rows, levels, (row, key) =>
      resolveSortValue(row, key, config)
    );
  }
  return sortRows(
    rows,
    (row) => resolveSortValue(row, config.sortBy!, config),
    config.sortDir!
  );
}

function resolveSortValue<TRow>(
  row: TRow,
  key: string,
  config: IncrementalViewConfig<TRow>
): SortableValue {
  if (config.getSortValue) return config.getSortValue(row, key);
  const column = config.columns?.find((item) => item.key === key);
  // A column that declares `sortValue` owns its whole ordering, including the
  // rows it answers `null` for — that answer means "this one has no place in
  // the order", and the comparator groups those at the end. Reading the
  // accessor for those rows instead would order one column by two different
  // extractors at once: some rows by their value, the rest by their rendered
  // text, with nothing on screen to say which row got which.
  if (column?.sortValue) return column.sortValue(row);
  return toSortable(column?.accessor?.(row));
}

function toSortable(value: unknown): SortableValue {
  return typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
    ? value
    : null;
}

function warmCaches<TRow>(
  state: ViewState<TRow>,
  filtered: readonly TRow[],
  config: IncrementalViewConfig<TRow>
): void {
  const getId = config.getRowId;
  const term = searchTerm(config);
  const projector = config.getSearchText ?? incrementalSearchText;
  for (const row of filtered) {
    const id = getId(row);
    if (term) state.searchText.set(id, projector(row));
    if (hasSort(config)) state.sortValues.set(id, sortKeyOf(row, config));
  }
}

function sortKeyOf<TRow>(
  row: TRow,
  config: IncrementalViewConfig<TRow>
): SortableValue[] {
  const levels = config.sortLevels;
  if (levels && levels.length > 0) {
    return levels.map((level) => resolveSortValue(row, level.key, config));
  }
  return [resolveSortValue(row, config.sortBy!, config)];
}

function applySourceEvent<TRow>(
  source: TRow[],
  event: RowPatchEvent<TRow>
): void {
  if (event.type === "insert") {
    source.splice(event.index, 0, event.row);
    return;
  }
  if (event.type === "remove") {
    source.splice(event.index, 1);
    return;
  }
  source[event.index] = event.next;
}

function applyFilterEvent<TRow>(
  state: ViewState<TRow>,
  event: RowPatchEvent<TRow>,
  source: readonly TRow[],
  config: IncrementalViewConfig<TRow>
): FilterDelta<TRow> {
  if (!hasFilter(config)) {
    state.filtered = source as TRow[];
    state.filteredSourceIndex = source.map((_, index) => index);
    return sourceDelta(event);
  }
  if (event.type === "insert") return filterInsert(state, event, config);
  if (event.type === "remove") return filterRemove(state, event, config);
  return filterUpdate(state, event, config);
}

function sourceDelta<TRow>(event: RowPatchEvent<TRow>): FilterDelta<TRow> {
  if (event.type === "insert") {
    return { kind: "enter", id: event.id, row: event.row };
  }
  if (event.type === "remove") {
    return { kind: "leave", id: event.id, row: event.row };
  }
  return { kind: "replace", id: event.id, prev: event.prev, next: event.next };
}

function filterInsert<TRow>(
  state: ViewState<TRow>,
  event: Extract<RowPatchEvent<TRow>, { type: "insert" }>,
  config: IncrementalViewConfig<TRow>
): FilterDelta<TRow> {
  const at = firstIndexAtLeast(state.filteredSourceIndex, event.index);
  for (let i = at; i < state.filteredSourceIndex.length; i++) {
    state.filteredSourceIndex[i]! += 1;
  }
  rememberSearch(state, event.id, event.row, config);
  if (!rowMatches(event.row, config, state.searchText.get(event.id))) {
    return { kind: "none" };
  }
  state.filtered.splice(at, 0, event.row);
  state.filteredSourceIndex.splice(at, 0, event.index);
  return { kind: "enter", id: event.id, row: event.row };
}

function filterRemove<TRow>(
  state: ViewState<TRow>,
  event: Extract<RowPatchEvent<TRow>, { type: "remove" }>,
  config: IncrementalViewConfig<TRow>
): FilterDelta<TRow> {
  const at = state.filtered.findIndex(
    (row) => config.getRowId(row) === event.id
  );
  forgetRow(state, event.id);
  for (let i = 0; i < state.filteredSourceIndex.length; i++) {
    if (state.filteredSourceIndex[i]! > event.index) {
      state.filteredSourceIndex[i]! -= 1;
    }
  }
  if (at === -1) return { kind: "none" };
  state.filtered.splice(at, 1);
  state.filteredSourceIndex.splice(at, 1);
  return { kind: "leave", id: event.id, row: event.row };
}

function filterUpdate<TRow>(
  state: ViewState<TRow>,
  event: Extract<RowPatchEvent<TRow>, { type: "update" }>,
  config: IncrementalViewConfig<TRow>
): FilterDelta<TRow> {
  const at = state.filtered.findIndex(
    (row) => config.getRowId(row) === event.id
  );
  rememberSearch(state, event.id, event.next, config);
  const matches = rowMatches(
    event.next,
    config,
    state.searchText.get(event.id)
  );
  if (at !== -1 && matches) {
    state.filtered[at] = event.next;
    return {
      kind: "replace",
      id: event.id,
      prev: event.prev,
      next: event.next,
    };
  }
  if (at !== -1 && !matches) {
    state.filtered.splice(at, 1);
    state.filteredSourceIndex.splice(at, 1);
    return { kind: "leave", id: event.id, row: event.prev };
  }
  if (at === -1 && matches) {
    const insertAt = firstIndexAtLeast(state.filteredSourceIndex, event.index);
    state.filtered.splice(insertAt, 0, event.next);
    state.filteredSourceIndex.splice(insertAt, 0, event.index);
    return { kind: "enter", id: event.id, row: event.next };
  }
  return { kind: "none" };
}

function applySortEvent<TRow>(
  state: ViewState<TRow>,
  delta: FilterDelta<TRow>,
  config: IncrementalViewConfig<TRow>
): void {
  if (!hasSort(config)) {
    state.sorted = state.filtered;
    state.sortedPos = indexMap(state.filtered, config.getRowId);
    return;
  }
  if (delta.kind === "none") return;
  state.filteredPos = indexMap(state.filtered, config.getRowId);
  if (delta.kind === "enter") {
    insertSorted(state, delta.row, config);
  } else if (delta.kind === "leave") {
    removeSorted(state, delta.id, config);
  } else {
    replaceSorted(state, delta.prev, delta.next, config);
  }
  state.sortedPos = indexMap(state.sorted, config.getRowId);
}

function insertSorted<TRow>(
  state: ViewState<TRow>,
  row: TRow,
  config: IncrementalViewConfig<TRow>
): void {
  const key = sortKeyOf(row, config);
  state.sortValues.set(config.getRowId(row), key);
  const at = sortedInsertIndex(state.sorted, (item) =>
    compareCached(item, row, state, config)
  );
  state.sorted.splice(at, 0, row);
}

function removeSorted<TRow>(
  state: ViewState<TRow>,
  id: string,
  config: IncrementalViewConfig<TRow>
): void {
  const at = state.sorted.findIndex((row) => config.getRowId(row) === id);
  if (at !== -1) state.sorted.splice(at, 1);
  state.sortValues.delete(id);
}

function replaceSorted<TRow>(
  state: ViewState<TRow>,
  _prev: TRow,
  next: TRow,
  config: IncrementalViewConfig<TRow>
): void {
  const id = config.getRowId(next);
  const prevKey = state.sortValues.get(id);
  const nextKey = sortKeyOf(next, config);
  state.sortValues.set(id, nextKey);
  if (sameSortKey(prevKey, nextKey)) {
    const at = state.sorted.findIndex((row) => config.getRowId(row) === id);
    if (at !== -1) state.sorted[at] = next;
    return;
  }
  removeSorted(state, id, config);
  state.sortValues.set(id, nextKey);
  insertSorted(state, next, config);
}

function compareCached<TRow>(
  item: TRow,
  target: TRow,
  state: ViewState<TRow>,
  config: IncrementalViewConfig<TRow>
): number {
  const getId = config.getRowId;
  const itemId = getId(item);
  const targetId = getId(target);
  const itemIndex = state.filteredPos.get(itemId) ?? 0;
  const targetIndex = state.filteredPos.get(targetId) ?? 0;
  const itemKeys = state.sortValues.get(itemId) ?? sortKeyOf(item, config);
  const targetKeys =
    state.sortValues.get(targetId) ?? sortKeyOf(target, config);
  const levels = config.sortLevels;
  if (levels && levels.length > 0) {
    for (const [i, level] of levels.entries()) {
      const decided = compareSortLevel(itemKeys[i], targetKeys[i], level.dir);
      if (decided !== undefined) return decided;
    }
    return itemIndex - targetIndex;
  }
  return compareSortEntries(
    { value: itemKeys[0], index: itemIndex },
    { value: targetKeys[0], index: targetIndex },
    config.sortDir!
  );
}

function sameSortKey(
  prev: readonly SortableValue[] | undefined,
  next: readonly SortableValue[]
): boolean {
  return (
    prev?.length === next.length &&
    prev.every((value, i) => Object.is(value, next[i]))
  );
}

function applyGroupEvent<TRow>(
  state: ViewState<TRow>,
  delta: FilterDelta<TRow>,
  config: IncrementalViewConfig<TRow>
): void {
  const tree = state.tree;
  if (!tree || delta.kind === "none") return;
  const getId = config.getRowId;
  if (delta.kind === "enter") {
    const path = rowGroupPath(delta.row, tree.keys, tree.columns);
    addGroupedRow(tree, delta.row, path, state.sortedPos, getId);
    markDirtyPath(state, tree.keys, path);
    return;
  }
  if (delta.kind === "leave") {
    const path = rowGroupPath(delta.row, tree.keys, tree.columns);
    removeGroupedRow(tree, delta.id, path, state.sortedPos, getId);
    markDirtyPath(state, tree.keys, path);
    return;
  }
  const prevPath = rowGroupPath(delta.prev, tree.keys, tree.columns);
  const nextPath = rowGroupPath(delta.next, tree.keys, tree.columns);
  moveGroupedRow(
    tree,
    delta.prev,
    delta.next,
    prevPath,
    nextPath,
    state.sortedPos,
    getId
  );
  markDirtyPath(state, tree.keys, prevPath);
  markDirtyPath(state, tree.keys, nextPath);
}

function markDirtyPath<TRow>(
  state: ViewState<TRow>,
  keys: readonly string[],
  path: readonly { valueKey: string }[]
): void {
  const valueKeys = path.map((step) => step.valueKey);
  for (let i = 0; i < path.length; i++) {
    state.dirtyGroups.add(
      makeGroupRowKey(keys.slice(0, i + 1), valueKeys.slice(0, i + 1))
    );
  }
}

function applySummaryEvent<TRow>(
  state: ViewState<TRow>,
  delta: FilterDelta<TRow>,
  config: IncrementalViewConfig<TRow>
): void {
  if (delta.kind === "none") return;
  if (config.summaryRow && !config.aggregateSpec) {
    state.summaryDirty = true;
    return;
  }
  if (!state.summary) return;
  if (delta.kind === "enter") addAggregateRow(state.summary, delta.row);
  else if (delta.kind === "leave") removeAggregateRow(state.summary, delta.row);
  else replaceAggregateRow(state.summary, delta.prev, delta.next);
}

function readSummary<TRow>(
  rows: readonly TRow[],
  config: IncrementalViewConfig<TRow>,
  summary: IncrementalAggregate<TRow> | undefined
): Partial<Record<string, ReactNode>> | undefined {
  if (config.summaryRow) return config.summaryRow(rows);
  if (summary) return readIncrementalAggregate(summary, rows);
  return undefined;
}

function groupFlattenOptions<TRow>(
  config: IncrementalViewConfig<TRow>,
  skipAggregates = false
): Omit<BuildGroupedFlatModelOptions<TRow>, "rows"> {
  return {
    groupBy: config.groupBy ?? [],
    columns: config.columns ?? [],
    getRowId: config.getRowId,
    collapsedGroupIds: config.collapsedGroupIds ?? new Set(),
    aggregates: skipAggregates ? undefined : config.groupAggregates,
    blankLabel: config.blankLabel,
    footers: config.groupFooters === true,
    sort: config.groupSort,
    filter: config.groupFilter,
    groupPageSize: config.groupPageSize,
    rowPageSize: config.rowPageSize,
    paging: config.paging,
  };
}

function paintGroups<TRow>(
  entries: GroupedFlatEntry<TRow>[],
  state: ViewState<TRow>,
  config: IncrementalViewConfig<TRow>
): GroupedFlatEntry<TRow>[] {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (entry.kind === "group") {
      entry.aggregateCells = cellsForGroup(state, config, entry);
      seen.add(entry.key);
    } else if (entry.kind === "groupFooter") {
      entry.aggregateCells = state.groupCells.get(entry.groupKey);
    }
  }
  for (const key of state.groupCells.keys()) {
    if (!seen.has(key)) state.groupCells.delete(key);
  }
  state.dirtyGroups.clear();
  return entries;
}

function cellsForGroup<TRow>(
  state: ViewState<TRow>,
  config: IncrementalViewConfig<TRow>,
  entry: Extract<GroupedFlatEntry<TRow>, { kind: "group" }>
): Partial<Record<string, ReactNode>> | undefined {
  if (!state.dirtyGroups.has(entry.key) && state.groupCells.has(entry.key)) {
    return state.groupCells.get(entry.key);
  }
  const cells = groupCellsFrom(config, entry.leafRows);
  if (cells) state.groupCells.set(entry.key, cells);
  return cells;
}

function groupCellsFrom<TRow>(
  config: IncrementalViewConfig<TRow>,
  rows: readonly TRow[]
): Partial<Record<string, ReactNode>> | undefined {
  if (config.groupAggregates) return config.groupAggregates(rows);
  if (config.aggregateSpec) {
    return aggregate(config.aggregateSpec, config.aggregateOptions)(rows);
  }
  return undefined;
}

function cacheGroupCells<TRow>(
  state: ViewState<TRow>,
  groups: readonly GroupedFlatEntry<TRow>[]
): void {
  for (const entry of groups) {
    if (entry.kind === "group" && entry.aggregateCells) {
      state.groupCells.set(entry.key, entry.aggregateCells);
    }
  }
}

function rememberSearch<TRow>(
  state: ViewState<TRow>,
  id: string,
  row: TRow,
  config: IncrementalViewConfig<TRow>
): void {
  if (!searchTerm(config)) return;
  const projector = config.getSearchText ?? incrementalSearchText;
  state.searchText.set(id, projector(row));
}

function forgetRow<TRow>(state: ViewState<TRow>, id: string): void {
  state.searchText.delete(id);
  state.sortValues.delete(id);
}

function sourceIndices<TRow>(
  filtered: readonly TRow[],
  rows: readonly TRow[],
  getId: (row: TRow) => string
): number[] {
  const index = new Map(rows.map((row, i) => [getId(row), i]));
  return filtered.map((row) => index.get(getId(row)) ?? -1);
}

function indexMap<TRow>(
  rows: readonly TRow[],
  getId: (row: TRow) => string
): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < rows.length; i++) map.set(getId(rows[i]!), i);
  return map;
}

function firstIndexAtLeast(indices: readonly number[], value: number): number {
  const at = indices.findIndex((index) => index >= value);
  return at === -1 ? indices.length : at;
}
