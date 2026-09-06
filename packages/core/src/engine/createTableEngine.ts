/**
 * Framework-neutral table engine. Filter, sort and page run here; React
 * hooks subscribe. Host callbacks remain the persistence boundary.
 */
import {
  type ColumnMetadata,
  type ExtraFilters,
  type SortDirection,
} from "../columnModel";
import { DEFAULT_LIMIT } from "../constants";
import {
  applyRowPatchLogToView,
  attachIncrementalView,
  configureIncrementalView,
  createIncrementalView,
  type IncrementalView,
  type IncrementalViewConfig,
} from "../rows/incremental";
import { rowPatchLog } from "../rows/patch";
import {
  sourceCapabilities,
  type TableSourceCapabilities,
} from "../source/capabilities";
import { cellValue } from "./cellValue";
import { engineSearchText } from "./searchText";

/**
 * Revision axes AI and bindings subscribe to. Unrelated React renders
 * must not increment these.
 *
 * @public
 */
export interface TableRevisions {
  /** Row identities or cell values changed. */
  readonly data: number;
  /** Sort, filter, page, group, expand, pin, search. */
  readonly view: number;
  /** Column set, types, or operation metadata. */
  readonly schema: number;
  /** Permissions, source capabilities, or wired operations. */
  readonly policy: number;
}

/**
 * One revision axis.
 *
 * @public
 */
export type TableRevisionAxis = keyof TableRevisions;

/**
 * View and policy operations. Row writes stay on host callbacks.
 *
 * @public
 */
export type TableOperation =
  | {
      readonly type: "setSort";
      readonly key?: string;
      readonly dir?: SortDirection;
    }
  | { readonly type: "setSearch"; readonly search: string }
  | { readonly type: "setPage"; readonly page: number }
  | { readonly type: "setLimit"; readonly limit: number }
  | { readonly type: "setFilters"; readonly filters: ExtraFilters }
  | { readonly type: "setGroupBy"; readonly key?: string }
  | { readonly type: "setSelection"; readonly ids?: readonly string[] };

/**
 * Named row window.
 *
 * @public
 */
export type TableRowScope = "visible" | "page" | "full";

/**
 * Readable snapshot of engine state.
 *
 * @public
 */
export interface TableSnapshot<TRow = unknown> {
  readonly revisions: TableRevisions;
  readonly columns: readonly ColumnMetadata<TRow>[];
  readonly capabilities: TableSourceCapabilities;
  /**
   * The page the engine is actually showing. A requested page past the end
   * reports the last page, so this always matches `rows("page")`; the
   * request is remembered and applies again if the data grows back.
   */
  readonly page: number;
  /** Page requested by the host, before clamping. */
  readonly requestedPage: number;
  /** Last page for the current row count and limit. */
  readonly lastPage: number;
  readonly limit: number;
  readonly search: string;
  readonly sortBy: string | undefined;
  readonly sortDir: SortDirection | undefined;
  readonly extra: ExtraFilters;
  readonly groupBy: string | undefined;
  readonly selectedIds: readonly string[];
  readonly total: number;
}

/**
 * Options for {@link createTableEngine}.
 *
 * @public
 */
export interface CreateTableEngineOptions<TRow> {
  /** Source rows. The host still owns this array. */
  readonly data: readonly TRow[];
  /** Neutral columns. */
  readonly columns: readonly ColumnMetadata<TRow>[];
  /** Stable row identity. */
  readonly rowKey: (row: TRow) => string;
  /** `"paged"` slices one page; `"infinite"` grows the window. */
  readonly paginationMode?: "paged" | "infinite";
  /** Initial view values. */
  readonly defaults?: {
    readonly page?: number;
    readonly limit?: number;
    readonly search?: string;
    readonly sortBy?: string;
    readonly sortDir?: SortDirection;
    readonly extra?: ExtraFilters;
    readonly groupBy?: string;
  };
  /** Client filter over the extra bag. Omit and extras are stored only. */
  readonly filterFn?: (row: TRow, extra: ExtraFilters) => boolean;
  /** Override searchable text. Defaults to flattened own values. */
  readonly getSearchText?: (row: TRow) => string;
  /** Active locale for `i18n` column paths. */
  readonly locale?: string;
  /** Stable id for {@link NeutralTable}. Generated when omitted. */
  readonly tableId?: string;
}

/**
 * Live configuration a binding may replay onto a committed engine.
 *
 * Extends the incremental query options with the creation-level settings
 * that remain changeable: `locale`, `paginationMode` and row identity.
 * `tableId` and `defaults` are identity and seed values — they are read
 * once, at creation.
 *
 * @public
 */
export interface TableEngineConfigPatch<TRow> extends Partial<
  IncrementalViewConfig<TRow>
> {
  /** Active locale for `i18n` column paths. */
  readonly locale?: string;
  /** `"paged"` slices one page; `"infinite"` grows the window. */
  readonly paginationMode?: "paged" | "infinite";
  /**
   * Requested 1-based page. Unlike `dispatch({ type: "setLimit" })`, a patch
   * carrying both `page` and `limit` lands as one transaction and does not
   * reset to page 1 — that reset belongs to a user changing the page size,
   * not to a binding replaying controlled state.
   */
  readonly page?: number;
  /** Rows per page. */
  readonly limit?: number;
}

/**
 * Everything that can be read off a table without changing it.
 *
 * The engine itself is one of these, and so is the candidate a binding stages
 * while it renders — which is what lets a render read the state it is about
 * to publish without anyone outside that render seeing it.
 *
 * @public
 */
export interface TableEngineReader<TRow = unknown> {
  /** State of the table, including its revision tokens. */
  readonly snapshot: () => TableSnapshot<TRow>;
  /** One declared column, by key. */
  readonly getColumn: (key: string) => ColumnMetadata<TRow> | undefined;
  /** The neutral value of one cell. */
  readonly cellValue: (row: TRow, columnKey: string) => unknown;
  /** The rows of a named window. */
  readonly rows: (scope: TableRowScope) => readonly TRow[];
  /** The row behind a key, or `undefined` when it is not loaded. */
  readonly rowByKey: (rowKey: string) => TRow | undefined;
}

/**
 * Framework-neutral table.
 *
 * @public
 */
export interface TableEngine<TRow = unknown> extends TableEngineReader<TRow> {
  readonly tableId: string;
  readonly rowKey: (row: TRow) => string;
  /**
   * What the render in progress staged, or the committed state when nothing
   * is pending. Read this to render the state about to be published; read the
   * engine itself for the state everyone else can see.
   */
  readonly candidate: TableEngineReader<TRow>;
  readonly subscribe: (
    axes: readonly TableRevisionAxis[] | "all",
    listener: (revisions: TableRevisions) => void
  ) => () => void;
  readonly dispatch: (operation: TableOperation) => void;
  /**
   * Align incremental query options (filter tree, sort levels, grouping
   * chrome) without a second derivation path.
   */
  readonly configure: (
    patch: TableEngineConfigPatch<TRow>,
    options?: { silent?: boolean }
  ) => void;
  /**
   * Mark axes stale. Invalidating `"data"` without a new array re-derives
   * from the array the engine already holds, so a host that mutated its rows
   * in place gets fresh results and not merely a new revision token.
   */
  readonly invalidate: (
    axes: readonly TableRevisionAxis[],
    next?: {
      readonly data?: readonly TRow[];
      readonly columns?: readonly ColumnMetadata<TRow>[];
    },
    options?: { silent?: boolean }
  ) => void;
  /**
   * Apply configuration and data to a private candidate.
   *
   * Nothing outside the caller sees it: `snapshot`, `rows`, the revision
   * tokens and every subscriber stay on the committed state until
   * {@link TableEngine.commitCandidate} runs. A render that is abandoned
   * calls {@link TableEngine.discardCandidate} — or simply never commits, and
   * the committed state was never touched either way.
   *
   * Repeating the same stage is the same stage: the candidate is derived from
   * the committed state each time, so a double render in Strict Mode and a
   * render React replays both land on one identical candidate.
   */
  readonly stageCandidate: (
    patch: TableEngineConfigPatch<TRow>,
    next?: {
      readonly data?: readonly TRow[];
      readonly columns?: readonly ColumnMetadata<TRow>[];
    }
  ) => void;
  /** Publish the candidate as the committed state and notify subscribers. */
  readonly commitCandidate: () => void;
  /** Drop the candidate; the committed state is already what it was. */
  readonly discardCandidate: () => void;
  readonly dispose: () => void;
}

/** Two lists holding the same items, by item identity. */
function sameList<T>(a: readonly T[], b: readonly T[]): boolean {
  if (Object.is(a, b)) return true;
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index++) {
    if (!Object.is(a[index], b[index])) return false;
  }
  return true;
}

/** Two filter bags holding the same values. */
function sameExtra(a: ExtraFilters, b: ExtraFilters): boolean {
  if (Object.is(a, b)) return true;
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => {
    const left = a[key];
    const right = b[key];
    if (Array.isArray(left) && Array.isArray(right)) {
      return sameList(left, right);
    }
    return Object.is(left, right);
  });
}

/**
 * The axes on which two states differ in a way anyone can observe.
 *
 * Deliberately about VALUES, not about which keys were assigned. A host that
 * writes `rowKey={(row) => row.id}` inline hands the table a new function on
 * every render; adopting it is right, but announcing it as a change would wake
 * every subscriber, re-render, produce another new function, and never stop.
 * What subscribers are told about is a table that actually reads differently.
 */
function observableAxes<TRow>(
  before: CommittedState<TRow>,
  after: CommittedState<TRow>
): TableRevisionAxis[] {
  const axes: TableRevisionAxis[] = [];
  if (!sameList(before.view.columns, after.view.columns)) axes.push("schema");
  // `data` is the dataset. What the query makes of it is a view change, so a
  // search or a filter moves `view` and leaves a data-only subscriber alone.
  if (!sameList(before.view.data, after.view.data)) axes.push("data");
  const a = before.view;
  const b = after.view;
  if (
    !sameList(before.derived.sorted, after.derived.sorted) ||
    a.page !== b.page ||
    a.limit !== b.limit ||
    a.search !== b.search ||
    a.sortBy !== b.sortBy ||
    a.sortDir !== b.sortDir ||
    a.groupBy !== b.groupBy ||
    a.paginationMode !== b.paginationMode ||
    a.locale !== b.locale ||
    !sameList(a.selectedIds, b.selectedIds) ||
    !sameExtra(a.extra, b.extra)
  ) {
    axes.push("view");
  }
  return axes;
}

/** The three values that together are one observable table state. */
interface CommittedState<TRow> {
  view: EngineView<TRow>;
  derived: IncrementalView<TRow>;
  revisions: TableRevisions;
}

interface EngineView<TRow> {
  page: number;
  limit: number;
  search: string;
  sortBy: string | undefined;
  sortDir: SortDirection | undefined;
  extra: ExtraFilters;
  groupBy: string | undefined;
  selectedIds: readonly string[];
  data: readonly TRow[];
  columns: readonly ColumnMetadata<TRow>[];
  locale: string | undefined;
  paginationMode: "paged" | "infinite";
  getRowId: (row: TRow) => string;
  filterFn?: (row: TRow, extra: ExtraFilters) => boolean;
  getSearchText?: (row: TRow) => string;
  filterTree?: NonNullable<IncrementalViewConfig<TRow>["filterTree"]>;
  filterTreeFn?: NonNullable<IncrementalViewConfig<TRow>["filterTreeFn"]>;
  sortLevels?: NonNullable<IncrementalViewConfig<TRow>["sortLevels"]>;
  getSortValue?: NonNullable<IncrementalViewConfig<TRow>["getSortValue"]>;
  groupAggregates?: NonNullable<IncrementalViewConfig<TRow>["groupAggregates"]>;
  groupSort?: NonNullable<IncrementalViewConfig<TRow>["groupSort"]>;
  groupFilter?: NonNullable<IncrementalViewConfig<TRow>["groupFilter"]>;
  groupFooters?: NonNullable<IncrementalViewConfig<TRow>["groupFooters"]>;
  collapsedGroupIds?: NonNullable<
    IncrementalViewConfig<TRow>["collapsedGroupIds"]
  >;
  blankLabel?: NonNullable<IncrementalViewConfig<TRow>["blankLabel"]>;
  groupPageSize?: NonNullable<IncrementalViewConfig<TRow>["groupPageSize"]>;
  rowPageSize?: NonNullable<IncrementalViewConfig<TRow>["rowPageSize"]>;
  paging?: NonNullable<IncrementalViewConfig<TRow>["paging"]>;
  summaryRow?: NonNullable<IncrementalViewConfig<TRow>["summaryRow"]>;
  aggregateSpec?: NonNullable<IncrementalViewConfig<TRow>["aggregateSpec"]>;
  aggregateOptions?: NonNullable<
    IncrementalViewConfig<TRow>["aggregateOptions"]
  >;
}

const EMPTY_EXTRA: ExtraFilters = {};
let tableSeq = 0;

/**
 * Configure keys that map straight onto the view. `locale`, `sortBy` and
 * `sortDir` belong here too — they need no normalizing, only the `in` test
 * so that passing `undefined` clears them.
 */
const PASS_THROUGH_KEYS = [
  "locale",
  "sortBy",
  "sortDir",
  "filterFn",
  "getSearchText",
  "filterTree",
  "filterTreeFn",
  "sortLevels",
  "getSortValue",
  "groupAggregates",
  "groupSort",
  "groupFilter",
  "groupFooters",
  "collapsedGroupIds",
  "blankLabel",
  "groupPageSize",
  "rowPageSize",
  "paging",
  "summaryRow",
  "aggregateSpec",
  "aggregateOptions",
] as const satisfies readonly (keyof EngineView<never>)[];

function bump(
  revisions: TableRevisions,
  axes: readonly TableRevisionAxis[]
): TableRevisions {
  const next = { ...revisions };
  for (const axis of axes) next[axis] += 1;
  return next;
}

function normalizeGroupBy(
  groupBy: string | readonly string[] | undefined
): string | undefined {
  if (groupBy === undefined) return undefined;
  return typeof groupBy === "string" ? groupBy : groupBy[0];
}

function defaultSearchText<TRow>(row: TRow): string {
  return engineSearchText(row);
}

/** What a changed view key costs: a rebuild, a re-derive, or just a slice. */
type ViewChangeKind = "schema" | "identity" | "window" | "view";

function viewChangeKind(key: keyof EngineView<never>): ViewChangeKind {
  if (key === "columns" || key === "locale") return "schema";
  if (key === "getRowId") return "identity";
  // page and limit move the window only — they never re-derive.
  if (key === "page" || key === "limit") return "window";
  return "view";
}

function axesForChange(
  changed: ReadonlySet<ViewChangeKind>
): readonly TableRevisionAxis[] {
  const axes: TableRevisionAxis[] = [];
  if (changed.has("view") || changed.has("window")) axes.push("view");
  if (changed.has("schema")) axes.push("schema");
  if (changed.has("identity")) axes.push("data");
  return axes;
}

/**
 * Create a table engine over in-memory rows.
 *
 * @public
 */
export function createTableEngine<TRow>(
  options: CreateTableEngineOptions<TRow>
): TableEngine<TRow> {
  const getSearchText = options.getSearchText ?? defaultSearchText;
  const filterFn = options.filterFn;
  const defaults = options.defaults ?? {};
  const tableId = options.tableId ?? `table-${++tableSeq}`;

  let view: EngineView<TRow> = {
    page: defaults.page ?? 1,
    limit: defaults.limit ?? DEFAULT_LIMIT,
    search: defaults.search ?? "",
    sortBy: defaults.sortBy,
    sortDir: defaults.sortBy ? (defaults.sortDir ?? "asc") : undefined,
    extra: defaults.extra ?? EMPTY_EXTRA,
    groupBy: defaults.groupBy,
    selectedIds: [],
    data: options.data,
    columns: options.columns,
    locale: options.locale,
    paginationMode: options.paginationMode ?? "paged",
    getRowId: options.rowKey,
    filterFn: options.filterFn,
    getSearchText,
  };
  let revisions: TableRevisions = { data: 1, view: 1, schema: 1, policy: 1 };
  /**
   * The committed state, held apart while a candidate is pending. Everything
   * public reads through here; `view`, `derived` and `revisions` are the
   * candidate the stager is building.
   */
  let committed: CommittedState<TRow> | undefined;
  /** Axes the pending candidate moved, published together at commit. */
  let pendingAxes: TableRevisionAxis[] = [];
  let disposed = false;
  const listeners = new Set<{
    axes: ReadonlySet<TableRevisionAxis> | "all";
    listener: (next: TableRevisions) => void;
  }>();

  /** The state a public read answers from: committed, never a candidate. */
  function readable(): CommittedState<TRow> {
    return committed ?? { view, derived, revisions };
  }

  function columnMap(
    state: CommittedState<TRow>
  ): Map<string, ColumnMetadata<TRow>> {
    return new Map(state.view.columns.map((column) => [column.key, column]));
  }

  function viewConfig(): IncrementalViewConfig<TRow> {
    return {
      getRowId: view.getRowId,
      getSearchText: view.getSearchText ?? getSearchText,
      filterFn: view.filterFn ?? filterFn,
      extra: view.extra,
      columns: view.columns,
      sortBy: view.sortBy,
      sortDir: view.sortDir,
      search: view.search,
      groupBy: view.groupBy,
      filterTree: view.filterTree,
      filterTreeFn: view.filterTreeFn,
      sortLevels: view.sortLevels,
      getSortValue: view.getSortValue,
      groupAggregates: view.groupAggregates,
      groupSort: view.groupSort,
      groupFilter: view.groupFilter,
      groupFooters: view.groupFooters,
      collapsedGroupIds: view.collapsedGroupIds,
      blankLabel: view.blankLabel,
      groupPageSize: view.groupPageSize,
      rowPageSize: view.rowPageSize,
      paging: view.paging,
      summaryRow: view.summaryRow,
      aggregateSpec: view.aggregateSpec,
      aggregateOptions: view.aggregateOptions,
    };
  }

  let derived: IncrementalView<TRow> = createIncrementalView(
    view.data,
    viewConfig()
  );
  attachIncrementalView(derived.sorted, derived);

  function syncDerived(): void {
    derived = configureIncrementalView(derived, viewConfig());
    attachIncrementalView(derived.sorted, derived);
  }

  function replaceData(next: readonly TRow[]): void {
    const log = rowPatchLog(next);
    if (log && derived.rows === view.data) {
      derived = applyRowPatchLogToView(derived, log);
    } else {
      derived = createIncrementalView(next, viewConfig());
    }
    attachIncrementalView(derived.sorted, derived);
    view = { ...view, data: next };
  }

  /** Last page for the rows currently derived. */
  function lastPageOf(state: CommittedState<TRow>): number {
    return Math.max(
      1,
      Math.ceil(state.derived.sorted.length / Math.max(state.view.limit, 1))
    );
  }

  /** The page actually shown — the request clamped to what exists. */
  function effectivePage(state: CommittedState<TRow>): number {
    return Math.min(Math.max(state.view.page, 1), lastPageOf(state));
  }

  function pagedRows(state: CommittedState<TRow>): readonly TRow[] {
    const sorted = state.derived.sorted;
    const page = effectivePage(state);
    const limit = state.view.limit;
    const slice =
      state.view.paginationMode === "infinite"
        ? sorted.slice(0, page * limit)
        : sorted.slice((page - 1) * limit, page * limit);
    attachIncrementalView(slice, state.derived);
    return slice;
  }

  /** The reads of one state, as a {@link TableEngineReader}. */
  function readerOf(
    state: () => CommittedState<TRow>
  ): TableEngineReader<TRow> {
    return {
      snapshot() {
        assertLive();
        return snapshotOf(state());
      },
      getColumn(key) {
        assertLive();
        return columnMap(state()).get(key);
      },
      cellValue(row, columnKey) {
        assertLive();
        const current = state();
        const column = columnMap(current).get(columnKey);
        if (!column) return undefined;
        return cellValue(row, column, current.view.locale);
      },
      rows(scope) {
        assertLive();
        const current = state();
        if (scope === "full") return current.derived.sorted;
        return pagedRows(current);
      },
      rowByKey(rowKey) {
        assertLive();
        const current = state();
        return current.view.data.find(
          (row) => current.view.getRowId(row) === rowKey
        );
      },
    };
  }

  function snapshotOf(state: CommittedState<TRow>): TableSnapshot<TRow> {
    const sorted = state.derived.sorted;
    return {
      revisions: state.revisions,
      columns: state.view.columns,
      capabilities: sourceCapabilities({
        allFilteredRows: sorted,
        total: sorted.length,
      }),
      page: effectivePage(state),
      requestedPage: state.view.page,
      lastPage: lastPageOf(state),
      limit: state.view.limit,
      search: state.view.search,
      sortBy: state.view.sortBy,
      sortDir: state.view.sortDir,
      extra: state.view.extra,
      groupBy: state.view.groupBy,
      selectedIds: state.view.selectedIds,
      total: sorted.length,
    };
  }

  /**
   * Take the committed state out of the way so the writes that follow build a
   * candidate instead. Called once per pending candidate.
   */
  function beginCandidate(): void {
    committed ??= { view, derived, revisions };
  }

  /**
   * A write that is not staged owns the table again: an event handler, a
   * host invalidation or a dispatch replaces whatever a render was still
   * holding, rather than landing on top of it.
   */
  function dropCandidate(): void {
    if (!committed) return;
    view = committed.view;
    derived = committed.derived;
    revisions = committed.revisions;
    committed = undefined;
    pendingAxes = [];
  }

  function publish(
    changed: readonly TableRevisionAxis[],
    silent?: boolean
  ): void {
    revisions = bump(revisions, changed);
    if (silent) return;
    notifyListeners(changed);
  }

  /**
   * Wake the subscribers for axes whose tokens have ALREADY moved. A staged
   * candidate bumped its own tokens when it was built, so publishing it is
   * only the waking — bumping again here would hand every subscriber a token
   * the render that made it never saw.
   */
  function notifyListeners(changed: readonly TableRevisionAxis[]): void {
    for (const entry of listeners) {
      const axes = entry.axes;
      if (axes === "all") {
        entry.listener(revisions);
        continue;
      }
      if (changed.some((axis) => axes.has(axis))) {
        entry.listener(revisions);
      }
    }
  }

  function applyConfigurePatch(
    patch: TableEngineConfigPatch<TRow>
  ): readonly TableRevisionAxis[] {
    const next: EngineView<TRow> = { ...view };
    const changed = new Set<ViewChangeKind>();

    const assign = <K extends keyof EngineView<TRow>>(
      key: K,
      value: EngineView<TRow>[K]
    ): void => {
      if (Object.is(view[key], value)) return;
      next[key] = value;
      changed.add(viewChangeKind(key));
    };

    // Keys the patch hands straight to the view. `in` is the test, so an
    // explicit `undefined` clears a value and an absent key leaves it alone.
    for (const key of PASS_THROUGH_KEYS) {
      if (key in patch) assign(key, patch[key]);
    }
    // The rest normalize, default, or refuse an empty value.
    if (typeof patch.page === "number") {
      assign("page", Math.max(1, Math.round(patch.page)));
    }
    if (typeof patch.limit === "number") {
      assign("limit", Math.max(1, Math.round(patch.limit)));
    }
    if ("search" in patch) assign("search", patch.search ?? "");
    if ("groupBy" in patch) assign("groupBy", normalizeGroupBy(patch.groupBy));
    if ("extra" in patch) assign("extra", patch.extra ?? EMPTY_EXTRA);
    // Replacing columns, row identity or the paging strategy with nothing is
    // never meaningful, so an empty value is ignored rather than applied.
    if (patch.columns) assign("columns", patch.columns);
    if (patch.getRowId) assign("getRowId", patch.getRowId);
    if (patch.paginationMode) assign("paginationMode", patch.paginationMode);

    if (changed.size === 0) return [];
    view = next;
    if (changed.has("identity")) {
      // Row identity decides membership in every incremental bucket, so the
      // view is rebuilt rather than reconciled.
      derived = createIncrementalView(view.data, viewConfig());
      attachIncrementalView(derived.sorted, derived);
    } else if (changed.has("view") || changed.has("schema")) {
      syncDerived();
    }
    return axesForChange(changed);
  }

  function notify(changed: readonly TableRevisionAxis[]): void {
    publish(changed);
  }

  function assertLive(): void {
    if (disposed) {
      throw new Error("TableEngine is disposed");
    }
  }

  const committedReader = readerOf(readable);
  // The candidate is whatever the last stage left behind, which is the
  // committed state itself when nothing is pending.
  const candidateReader = readerOf(() => ({ view, derived, revisions }));

  return {
    tableId,
    ...committedReader,
    candidate: candidateReader,
    rowKey(row) {
      assertLive();
      return view.getRowId(row);
    },
    subscribe(axes, listener) {
      assertLive();
      const entry = {
        axes: axes === "all" ? ("all" as const) : new Set(axes),
        listener,
      };
      listeners.add(entry);
      return () => {
        listeners.delete(entry);
      };
    },
    dispatch(operation) {
      assertLive();
      dropCandidate();
      switch (operation.type) {
        case "setSort":
          view = {
            ...view,
            sortBy: operation.key,
            sortDir: operation.key ? (operation.dir ?? "asc") : undefined,
            page: 1,
          };
          syncDerived();
          notify(["view"]);
          return;
        case "setSearch":
          view = { ...view, search: operation.search, page: 1 };
          syncDerived();
          notify(["view"]);
          return;
        case "setPage":
          view = { ...view, page: Math.max(1, Math.round(operation.page)) };
          notify(["view"]);
          return;
        case "setLimit":
          view = {
            ...view,
            limit: Math.max(1, Math.round(operation.limit)),
            page: 1,
          };
          notify(["view"]);
          return;
        case "setFilters":
          view = { ...view, extra: { ...operation.filters }, page: 1 };
          syncDerived();
          notify(["view"]);
          return;
        case "setGroupBy":
          view = { ...view, groupBy: operation.key, page: 1 };
          syncDerived();
          notify(["view"]);
          return;
        case "setSelection":
          view = { ...view, selectedIds: operation.ids ?? [] };
          notify(["view"]);
          return;
        default:
          return;
      }
    },
    configure(patch, options) {
      assertLive();
      dropCandidate();
      const changed = applyConfigurePatch(patch);
      if (changed.length > 0) publish(changed, options?.silent);
    },
    stageCandidate(patch, next) {
      assertLive();
      beginCandidate();
      if (next?.data) replaceData(next.data);
      if (next?.columns) {
        view = { ...view, columns: next.columns };
        syncDerived();
      }
      applyConfigurePatch(patch);
      // The tokens follow what the candidate actually reads differently, so a
      // render sees a coherent snapshot and an unchanged table stays still.
      const base = committed ?? { view, derived, revisions };
      pendingAxes = observableAxes(base, { view, derived, revisions });
      revisions = bump(base.revisions, pendingAxes);
    },
    commitCandidate() {
      assertLive();
      if (!committed) return;
      const changed = pendingAxes;
      committed = undefined;
      pendingAxes = [];
      if (changed.length === 0) return;
      // The revisions already moved with the candidate; publishing is what
      // makes them, and the rows they describe, visible.
      notifyListeners(changed);
    },
    discardCandidate() {
      assertLive();
      dropCandidate();
    },
    invalidate(axes, next, options) {
      assertLive();
      dropCandidate();
      let changed = [...axes];
      if (next?.data) {
        replaceData(next.data);
        if (!changed.includes("data")) changed = [...changed, "data"];
      } else if (axes.includes("data")) {
        // In-place mutation: rebuild from the array the engine already holds
        // so derived results move with the revision token.
        derived = createIncrementalView(view.data, viewConfig());
        attachIncrementalView(derived.sorted, derived);
      }
      if (next?.columns) {
        view = { ...view, columns: next.columns };
        syncDerived();
        if (!changed.includes("schema")) changed = [...changed, "schema"];
      }
      if (changed.length > 0) publish(changed, options?.silent);
    },
    dispose() {
      disposed = true;
      listeners.clear();
    },
  };
}
