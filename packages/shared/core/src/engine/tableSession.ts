/**
 * The table session. It owns committed state, candidates, revisions, and
 * subscriptions. A {@link RowModel} evaluates the rows.
 */
import { DEFAULT_LIMIT } from "../constants";
import type {
  ColumnMetadata,
  ExtraFilters,
  SortDirection,
} from "../contracts/columns";
import type { TableRevisionAxis, TableRevisions } from "../contracts/lifecycle";
import { formatGroupBy } from "../grouping/groupKeys";
import type {
  IncrementalView,
  IncrementalViewConfig,
} from "../rows/incremental";
import { attachIncrementalView } from "../rows/incrementalView";
import { rowPatchLog, rowPatchLogStartsAt } from "../rows/patch";
import { sourceCapabilities } from "../source/capabilities";
import { sameItems } from "../utils/sameItems";
import { cellValue } from "./cellValue";
import type {
  CreateTableEngineOptions,
  TableCallbackRefresh,
  TableEngine,
  TableEngineConfigPatch,
  TableEngineReader,
  TableSnapshot,
} from "./createTableEngine";
import type { RowModel } from "./rowModelContract";
import { engineSearchText } from "./searchText";

/** Two filter bags holding the same values. */
function sameExtra(a: ExtraFilters, b: ExtraFilters): boolean {
  if (Object.is(a, b)) return true;
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => {
    const left = a[key];
    const right = b[key];
    if (Array.isArray(left) && Array.isArray(right)) {
      return sameItems(left, right);
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
  before: SessionState<TRow>,
  after: SessionState<TRow>
): TableRevisionAxis[] {
  const axes: TableRevisionAxis[] = [];
  if (!sameItems(before.view.columns, after.view.columns)) axes.push("schema");
  // `data` is the dataset. What the query makes of it is a view change, so a
  // search or a filter moves `view` and leaves a data-only subscriber alone.
  if (!sameItems(before.view.data, after.view.data)) axes.push("data");
  const a = before.view;
  const b = after.view;
  if (
    !sameItems(before.derived.sorted, after.derived.sorted) ||
    a.page !== b.page ||
    a.limit !== b.limit ||
    a.search !== b.search ||
    a.sortBy !== b.sortBy ||
    a.sortDir !== b.sortDir ||
    a.groupBy !== b.groupBy ||
    a.paginationMode !== b.paginationMode ||
    a.locale !== b.locale ||
    before.evaluator !== after.evaluator ||
    !sameItems(a.selectedIds, b.selectedIds) ||
    !sameExtra(a.extra, b.extra)
  ) {
    axes.push("view");
  }
  return axes;
}

/**
 * One coherent table: the view, what the row model derived from it, the
 * revision tokens that name it, and the evaluator that derived it.
 */
interface SessionState<TRow> {
  readonly view: EngineView<TRow>;
  readonly derived: IncrementalView<TRow>;
  readonly revisions: TableRevisions;
  readonly model: RowModel<TRow>;
  /** Who staged the evaluator; `undefined` for the one the table began with. */
  readonly evaluator: unknown;
  /** Whether `derived` is this state's own, so a write may change it in place. */
  readonly owned: boolean;
}

/** A write in progress: the next state, before it is published. */
interface Draft<TRow> {
  view: EngineView<TRow>;
  derived: IncrementalView<TRow>;
  model: RowModel<TRow>;
  evaluator: unknown;
  owned: boolean;
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
  derivedKey?: NonNullable<IncrementalViewConfig<TRow>["derivedKey"]>;
  groupAggregateOps?: NonNullable<
    IncrementalViewConfig<TRow>["groupAggregateOps"]
  >;
}

/** Callbacks {@link TableEngine.refreshCallbacks} may adopt or clear. */
const CALLBACK_KEYS = [
  "getRowId",
  "getSearchText",
  "filterFn",
  "filterTreeFn",
  "columns",
  "getSortValue",
] as const satisfies readonly (keyof TableCallbackRefresh<never>)[];

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
  "derivedKey",
  "groupAggregateOps",
] as const satisfies readonly (keyof EngineView<never>)[];

/** The engine fields the incremental view reads under the same name. */
const INCREMENTAL_KEYS = new Set<string>([
  ...PASS_THROUGH_KEYS,
  "search",
  "groupBy",
  "extra",
]);

/** Whether clearing `key` on the engine clears it on the incremental view. */
function isIncrementalKey<TRow>(
  key: keyof EngineView<TRow>
): key is keyof EngineView<TRow> & keyof IncrementalViewConfig<TRow> {
  return INCREMENTAL_KEYS.has(key);
}

function bump(
  revisions: TableRevisions,
  axes: readonly TableRevisionAxis[]
): TableRevisions {
  const next = { ...revisions };
  for (const axis of axes) next[axis] += 1;
  return next;
}

/**
 * One stored form for every grouping input: the comma-joined keys, outermost
 * first, which the incremental view reads back as the same levels. A list
 * keeps all of its levels; an empty one is no grouping.
 */
function normalizeGroupBy(
  groupBy: string | readonly string[] | undefined
): string | undefined {
  if (groupBy === undefined) return undefined;
  return formatGroupBy(groupBy);
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

/** Session internals a frontend source reaches through the engine handle. */
interface SessionControls {
  /** The row model the committed state evaluates with. */
  committedModel(): unknown;
  /** The evaluator the next commit leaves live. */
  evaluator(): unknown;
  /** Stage `model` as the evaluator, published with the next commit. */
  stageModel(model: unknown, evaluator: unknown): void;
}

const SESSIONS = new WeakMap<object, SessionControls>();

/**
 * The evaluator `engine` will run once its pending candidate commits: the
 * one a source last staged on it, or `undefined` for the one it was created
 * with. `undefined` too for an engine this module did not build.
 *
 * @internal
 */
export function sessionEvaluator(engine: object): unknown {
  return SESSIONS.get(engine)?.evaluator();
}

/**
 * Stage the row model `carrier` evaluates with on `engine`, as part of its
 * candidate. The engine keeps its id, selection, subscribers and revisions;
 * the new evaluator is published with the next commit and dropped with the
 * candidate.
 *
 * @param engine - The live engine.
 * @param carrier - An engine built by the evaluator to adopt.
 * @param evaluator - What identifies that evaluator.
 * @returns `false` when either engine was not built by this module.
 *
 * @internal
 */
export function stageSessionEvaluator(
  engine: object,
  carrier: object,
  evaluator: unknown
): boolean {
  const target = SESSIONS.get(engine);
  const source = SESSIONS.get(carrier);
  if (!target || !source) return false;
  target.stageModel(source.committedModel(), evaluator);
  return true;
}

/**
 * Create a table engine over in-memory rows.
 *
 * @public
 */
export function createTableSession<TRow>(
  options: CreateTableEngineOptions<TRow>,
  model: RowModel<TRow>
): TableEngine<TRow> {
  const getSearchText = options.getSearchText ?? defaultSearchText;
  const filterFn = options.filterFn;
  const defaults = options.defaults ?? {};
  const tableId = options.tableId ?? `table-${++tableSeq}`;

  const initialView: EngineView<TRow> = {
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

  function configOf(view: EngineView<TRow>): IncrementalViewConfig<TRow> {
    return {
      getRowId: view.getRowId,
      getSearchText: view.getSearchText ?? getSearchText,
      filterFn: view.filterFn ?? filterFn,
      extra: view.extra,
      columns: view.columns,
      locale: view.locale,
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
      derivedKey: view.derivedKey,
      groupAggregateOps: view.groupAggregateOps,
    };
  }

  const initialDerived = model.create(initialView.data, configOf(initialView));
  attachIncrementalView(initialDerived.sorted, initialDerived);

  /**
   * The table every public reader and subscriber sees. It is replaced whole,
   * and its derivation is never written in place: a write builds a draft
   * and publishes it only once the draft has evaluated.
   */
  let committed: SessionState<TRow> = {
    view: initialView,
    derived: initialDerived,
    revisions: { data: 1, view: 1, schema: 1, policy: 1 },
    model,
    evaluator: undefined,
    owned: false,
  };
  /** A render's private next table, published by commit. */
  let candidate: SessionState<TRow> | undefined;
  /** Axes the candidate reads differently from the committed table. */
  let pendingAxes: readonly TableRevisionAxis[] = [];
  let disposed = false;
  const listeners = new Set<{
    axes: ReadonlySet<TableRevisionAxis> | "all";
    listener: (next: TableRevisions) => void;
  }>();

  /**
   * The column for `key`, last duplicate wins.
   *
   * A reverse scan allocates nothing and reads the object the host still
   * holds, so an in-place key or header edit is visible. A map cached by
   * the column-array identity would keep the previous object.
   */
  function columnByKey(
    columns: readonly ColumnMetadata<TRow>[],
    key: string
  ): ColumnMetadata<TRow> | undefined {
    for (let index = columns.length - 1; index >= 0; index -= 1) {
      const column = columns[index];
      if (column?.key === key) return column;
    }
    return undefined;
  }

  /**
   * A write in progress over `base`. Only a candidate may own its
   * derivation: the committed one is never written in place.
   */
  function draftOf(base: SessionState<TRow>): Draft<TRow> {
    return {
      view: base.view,
      derived: base.derived,
      model: base.model,
      evaluator: base.evaluator,
      owned: base === candidate && base.owned,
    };
  }

  /**
   * Give the draft its own copy of the derivation before a write that
   * changes it in place. The committed table, and a candidate a failed
   * write abandons, keep theirs.
   */
  function ownDerived(draft: Draft<TRow>): void {
    if (draft.owned) return;
    draft.derived = draft.model.fork(draft.derived);
    draft.owned = true;
  }

  /** Re-derive with a fresh evaluation: the result shares nothing. */
  function rebuild(draft: Draft<TRow>): void {
    draft.derived = draft.model.create(draft.view.data, configOf(draft.view));
    draft.owned = true;
  }

  /**
   * Bring the derivation in line with the draft's view. The fields the last
   * patch cleared are named, because a configure merge ignores an
   * `undefined` entry and would keep the old sort or grouping.
   */
  function syncDerived(
    draft: Draft<TRow>,
    cleared: readonly (keyof IncrementalViewConfig<TRow>)[] = []
  ): void {
    draft.derived = draft.model.reconfigure(
      draft.derived,
      configOf(draft.view),
      cleared
    );
  }

  function replaceData(draft: Draft<TRow>, next: readonly TRow[]): void {
    const log = rowPatchLog(next);
    draft.view = { ...draft.view, data: next };
    // A binding can coalesce several host patches into one update. The last
    // log describes only its own base, not every change since our snapshot.
    if (log && rowPatchLogStartsAt(log, draft.derived.rows)) {
      ownDerived(draft);
      draft.derived = draft.model.applyPatch(draft.derived, log);
    } else {
      rebuild(draft);
    }
  }

  function stateOf(
    draft: Draft<TRow>,
    revisions: TableRevisions
  ): SessionState<TRow> {
    attachIncrementalView(draft.derived.sorted, draft.derived);
    return {
      view: draft.view,
      derived: draft.derived,
      revisions,
      model: draft.model,
      evaluator: draft.evaluator,
      owned: draft.owned,
    };
  }

  /** Last page for the rows currently derived. */
  function lastPageOf(state: SessionState<TRow>): number {
    return Math.max(
      1,
      Math.ceil(state.derived.sorted.length / Math.max(state.view.limit, 1))
    );
  }

  /** The page actually shown — the request clamped to what exists. */
  function effectivePage(state: SessionState<TRow>): number {
    return Math.min(Math.max(state.view.page, 1), lastPageOf(state));
  }

  function pagedRows(state: SessionState<TRow>): readonly TRow[] {
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
  function readerOf(state: () => SessionState<TRow>): TableEngineReader<TRow> {
    return {
      snapshot() {
        assertLive();
        return snapshotOf(state());
      },
      getColumn(key) {
        assertLive();
        return columnByKey(state().view.columns, key);
      },
      cellValue(row, columnKey) {
        assertLive();
        const current = state();
        const column = columnByKey(current.view.columns, columnKey);
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

  function snapshotOf(state: SessionState<TRow>): TableSnapshot<TRow> {
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
   * A write that is not staged owns the table again: an event handler, a
   * host invalidation or a dispatch replaces whatever a render was still
   * holding, rather than landing on top of it.
   */
  function dropCandidate(): void {
    candidate = undefined;
    pendingAxes = [];
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
        entry.listener(committed.revisions);
        continue;
      }
      if (changed.some((axis) => axes.has(axis))) {
        entry.listener(committed.revisions);
      }
    }
  }

  /**
   * Run a direct write on the committed table: build it on a draft, then
   * replace the committed table and wake the subscribers of `changed`. A
   * write that throws leaves the committed table as it was.
   */
  function writeCommitted(
    write: (draft: Draft<TRow>) => readonly TableRevisionAxis[],
    silent?: boolean
  ): void {
    dropCandidate();
    const draft = draftOf(committed);
    const changed = write(draft);
    committed = {
      ...stateOf(draft, bump(committed.revisions, changed)),
      owned: false,
    };
    if (!silent && changed.length > 0) notifyListeners(changed);
  }

  /**
   * Build the candidate on a draft over the current candidate, or over the
   * committed table when there is none. A write that throws abandons the
   * candidate, so a render can never read a half-built one.
   */
  function writeCandidate(write: (draft: Draft<TRow>) => void): void {
    const base = candidate ?? committed;
    const draft = draftOf(base);
    try {
      write(draft);
    } catch (error) {
      dropCandidate();
      throw error;
    }
    const next = stateOf(draft, committed.revisions);
    // The tokens follow what the candidate actually reads differently, so a
    // render sees a coherent snapshot and an unchanged table stays still.
    pendingAxes = observableAxes(committed, next);
    candidate = { ...next, revisions: bump(committed.revisions, pendingAxes) };
  }

  function applyConfigurePatch(
    draft: Draft<TRow>,
    patch: TableEngineConfigPatch<TRow>
  ): readonly TableRevisionAxis[] {
    const current = draft.view;
    const next: EngineView<TRow> = { ...current };
    const changed = new Set<ViewChangeKind>();
    const cleared: (keyof IncrementalViewConfig<TRow>)[] = [];

    const assign = <K extends keyof EngineView<TRow>>(
      key: K,
      value: EngineView<TRow>[K]
    ): void => {
      if (Object.is(current[key], value)) return;
      next[key] = value;
      changed.add(viewChangeKind(key));
      if (value === undefined && isIncrementalKey(key)) cleared.push(key);
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
    draft.view = next;
    if (changed.has("identity")) {
      // Row identity decides membership in every incremental bucket, so the
      // view is rebuilt rather than reconciled.
      rebuild(draft);
    } else if (changed.has("view") || changed.has("schema")) {
      syncDerived(draft, cleared);
    }
    return axesForChange(changed);
  }

  function assertLive(): void {
    if (disposed) {
      throw new Error("TableEngine is disposed");
    }
  }

  function callbackConfig(patch: TableCallbackRefresh<TRow>): {
    configPatch: Partial<IncrementalViewConfig<TRow>>;
    cleared: (keyof IncrementalViewConfig<TRow>)[];
  } {
    const configPatch: Partial<IncrementalViewConfig<TRow>> = {};
    const cleared: (keyof IncrementalViewConfig<TRow>)[] = [];
    for (const key of CALLBACK_KEYS) {
      if (!(key in patch)) continue;
      const value = patch[key];
      if (value === undefined) cleared.push(key);
      else Object.assign(configPatch, { [key]: value });
    }
    return { configPatch, cleared };
  }

  function adoptCallbacks(
    draft: Draft<TRow>,
    patch: TableCallbackRefresh<TRow>
  ): void {
    const current = draft.view;
    let nextView = current;
    const adopt = <K extends keyof EngineView<TRow>>(
      key: K,
      value: EngineView<TRow>[K]
    ): void => {
      if (Object.is(current[key], value)) return;
      if (nextView === current) nextView = { ...current };
      nextView[key] = value;
    };
    if ("getRowId" in patch && patch.getRowId !== undefined) {
      adopt("getRowId", patch.getRowId);
    }
    if ("getSearchText" in patch) adopt("getSearchText", patch.getSearchText);
    if ("filterFn" in patch) adopt("filterFn", patch.filterFn);
    if ("filterTreeFn" in patch) adopt("filterTreeFn", patch.filterTreeFn);
    if ("getSortValue" in patch) adopt("getSortValue", patch.getSortValue);
    draft.view = nextView;
    const { configPatch, cleared } = callbackConfig(patch);
    if (cleared.length === 0 && Object.keys(configPatch).length === 0) return;
    draft.derived = draft.model.reconfigure(
      draft.derived,
      configPatch,
      cleared
    );
  }

  /** A view write that re-derives, from a dispatch. */
  function viewWrite(
    next: (view: EngineView<TRow>) => EngineView<TRow>
  ): (draft: Draft<TRow>) => readonly TableRevisionAxis[] {
    return (draft) => {
      draft.view = next(draft.view);
      syncDerived(draft);
      return ["view"];
    };
  }

  const committedReader = readerOf(() => committed);
  // The candidate is whatever the last stage left behind, which is the
  // committed table itself when nothing is pending.
  const candidateReader = readerOf(() => candidate ?? committed);

  const engine: TableEngine<TRow> = {
    tableId,
    ...committedReader,
    candidate: candidateReader,
    rowKey(row) {
      assertLive();
      return committed.view.getRowId(row);
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
          writeCommitted(
            viewWrite((view) => ({
              ...view,
              sortBy: operation.key,
              sortDir: operation.key ? (operation.dir ?? "asc") : undefined,
              page: 1,
            }))
          );
          return;
        // A setter given the value the view already holds changes nothing, and
        // publishing a revision for it is not free: a subscriber repaints, a
        // memo rebuilds, and an agent action that was addressed to the view a
        // moment earlier is refused as stale for a change nobody made.
        case "setSearch": {
          const { view } = committed;
          if (view.search === operation.search && view.page === 1) return;
          writeCommitted(
            viewWrite((current) => ({
              ...current,
              search: operation.search,
              page: 1,
            }))
          );
          return;
        }
        case "setPage": {
          const page = Math.max(1, Math.round(operation.page));
          if (committed.view.page === page) return;
          writeCommitted((draft) => {
            draft.view = { ...draft.view, page };
            return ["view"];
          });
          return;
        }
        case "setLimit": {
          const limit = Math.max(1, Math.round(operation.limit));
          const { view } = committed;
          if (view.limit === limit && view.page === 1) return;
          writeCommitted((draft) => {
            draft.view = { ...draft.view, limit, page: 1 };
            return ["view"];
          });
          return;
        }
        case "setFilters":
          writeCommitted(
            viewWrite((view) => ({
              ...view,
              extra: { ...operation.filters },
              page: 1,
            }))
          );
          return;
        case "setGroupBy":
          writeCommitted(
            viewWrite((view) => ({ ...view, groupBy: operation.key, page: 1 }))
          );
          return;
        case "setSelection":
          writeCommitted((draft) => {
            draft.view = { ...draft.view, selectedIds: operation.ids ?? [] };
            return ["view"];
          });
          return;
        default:
          return;
      }
    },
    configure(patch, options) {
      assertLive();
      writeCommitted(
        (draft) => applyConfigurePatch(draft, patch),
        options?.silent
      );
    },
    stageCandidate(patch, next) {
      assertLive();
      writeCandidate((draft) => {
        if (next?.data) replaceData(draft, next.data);
        if (next?.columns) {
          draft.view = { ...draft.view, columns: next.columns };
          syncDerived(draft);
        }
        applyConfigurePatch(draft, patch);
      });
    },
    commitCandidate() {
      assertLive();
      if (!candidate) return;
      const changed = pendingAxes;
      committed = { ...candidate, owned: false };
      dropCandidate();
      if (changed.length === 0) return;
      // The revisions already moved with the candidate; publishing is what
      // makes them, and the rows they describe, visible.
      notifyListeners(changed);
    },
    discardCandidate() {
      assertLive();
      dropCandidate();
    },
    refreshCallbacks(patch) {
      assertLive();
      if (candidate) {
        // The candidate reads the refreshed callbacks; what it now reads
        // differently is published with it.
        writeCandidate((draft) => {
          adoptCallbacks(draft, patch);
        });
        return;
      }
      const before = committed.derived.sorted;
      writeCommitted((draft) => {
        adoptCallbacks(draft, patch);
        return sameItems(before, draft.derived.sorted) ? [] : ["view"];
      });
    },
    invalidate(axes, next, options) {
      assertLive();
      writeCommitted((draft) => {
        let changed = [...axes];
        if (next?.data) {
          replaceData(draft, next.data);
          if (!changed.includes("data")) changed = [...changed, "data"];
        } else if (axes.includes("data")) {
          // In-place mutation: rebuild from the array the engine already
          // holds so derived results move with the revision token.
          rebuild(draft);
        }
        if (next?.columns) {
          draft.view = { ...draft.view, columns: next.columns };
          syncDerived(draft);
          if (!changed.includes("schema")) changed = [...changed, "schema"];
        }
        return changed;
      }, options?.silent);
    },
    dispose() {
      disposed = true;
      listeners.clear();
      dropCandidate();
    },
  };

  SESSIONS.set(engine, {
    committedModel: () => committed.model,
    evaluator: () => (candidate ?? committed).evaluator,
    stageModel(nextModel: unknown, evaluator: unknown) {
      assertLive();
      writeCandidate((draft) => {
        draft.model = nextModel as RowModel<TRow>;
        draft.evaluator = evaluator;
        rebuild(draft);
      });
    },
  });
  return engine;
}
