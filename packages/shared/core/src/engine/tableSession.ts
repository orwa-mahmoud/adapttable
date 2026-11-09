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
  before: CommittedState<TRow>,
  after: CommittedState<TRow>
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
    !sameItems(a.selectedIds, b.selectedIds) ||
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
  derivedKey?: NonNullable<IncrementalViewConfig<TRow>["derivedKey"]>;
  groupAggregateOps?: NonNullable<
    IncrementalViewConfig<TRow>["groupAggregateOps"]
  >;
}

/**
 * One session slice, committed or candidate.
 *
 * `model` is the derivation readers walk. `modelHandle` is the cache owner
 * a discard restores. A candidate writes a fork, so abandoning it leaves
 * this handle and its rows intact.
 */
interface SessionRecord<TRow> {
  view: EngineView<TRow>;
  viewConfig: IncrementalViewConfig<TRow>;
  model: IncrementalView<TRow>;
  modelHandle: IncrementalView<TRow>;
  revisions: TableRevisions;
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
   * The committed session, held apart while a candidate is pending.
   * `view`, `derived` and `revisions` are the candidate being built.
   * Discard restores `modelHandle`; it does not rebuild the derivation.
   */
  let committed: SessionRecord<TRow> | undefined;
  /** Axes the pending candidate moved, published together at commit. */
  let pendingAxes: TableRevisionAxis[] = [];
  let disposed = false;
  const listeners = new Set<{
    axes: ReadonlySet<TableRevisionAxis> | "all";
    listener: (next: TableRevisions) => void;
  }>();

  /** The state a public read answers from: committed, never a candidate. */
  function readable(): CommittedState<TRow> {
    if (!committed) return { view, derived, revisions };
    return {
      view: committed.view,
      derived: committed.model,
      revisions: committed.revisions,
    };
  }

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

  function viewConfig(): IncrementalViewConfig<TRow> {
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

  let derived: IncrementalView<TRow> = model.create(view.data, viewConfig());

  /**
   * Bring the incremental view in line with the engine's view. The fields the
   * last patch cleared are named, because a configure merge ignores an
   * `undefined` entry and would keep the old sort or grouping.
   */
  function syncDerived(
    cleared: readonly (keyof IncrementalViewConfig<TRow>)[] = []
  ): void {
    derived = model.reconfigure(derived, viewConfig(), cleared);
    attachIncrementalView(derived.sorted, derived);
  }

  function replaceData(next: readonly TRow[]): void {
    const log = rowPatchLog(next);
    // A binding can coalesce several host patches into one update. The last
    // log describes only its own base, not every change since our snapshot.
    if (log && rowPatchLogStartsAt(log, derived.rows)) {
      derived = model.applyPatch(derived, log);
    } else {
      derived = model.create(next, viewConfig());
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
    if (committed) return;
    committed = {
      view,
      viewConfig: viewConfig(),
      model: derived,
      modelHandle: derived,
      revisions,
    };
    // The candidate writes this copy. The committed handle stays put.
    derived = model.fork(derived);
  }

  /**
   * A write that is not staged owns the table again: an event handler, a
   * host invalidation or a dispatch replaces whatever a render was still
   * holding, rather than landing on top of it.
   */
  function dropCandidate(): void {
    if (!committed) return;
    view = committed.view;
    derived = committed.modelHandle;
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
    const cleared: (keyof IncrementalViewConfig<TRow>)[] = [];

    const assign = <K extends keyof EngineView<TRow>>(
      key: K,
      value: EngineView<TRow>[K]
    ): void => {
      if (Object.is(view[key], value)) return;
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
    view = next;
    if (changed.has("identity")) {
      // Row identity decides membership in every incremental bucket, so the
      // view is rebuilt rather than reconciled.
      derived = model.create(view.data, viewConfig());
    } else if (changed.has("view") || changed.has("schema")) {
      syncDerived(cleared);
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

  function adoptCallbackView(patch: TableCallbackRefresh<TRow>): void {
    let nextView = view;
    const adopt = <K extends keyof EngineView<TRow>>(
      key: K,
      value: EngineView<TRow>[K]
    ): void => {
      if (Object.is(view[key], value)) return;
      if (nextView === view) nextView = { ...view };
      nextView[key] = value;
    };
    if ("getRowId" in patch && patch.getRowId !== undefined) {
      adopt("getRowId", patch.getRowId);
    }
    if ("getSearchText" in patch) adopt("getSearchText", patch.getSearchText);
    if ("filterFn" in patch) adopt("filterFn", patch.filterFn);
    if ("filterTreeFn" in patch) adopt("filterTreeFn", patch.filterTreeFn);
    if ("getSortValue" in patch) adopt("getSortValue", patch.getSortValue);
    if (nextView !== view) view = nextView;
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
        // A setter given the value the view already holds changes nothing, and
        // publishing a revision for it is not free: a subscriber repaints, a
        // memo rebuilds, and an agent action that was addressed to the view a
        // moment earlier is refused as stale for a change nobody made.
        case "setSearch": {
          if (view.search === operation.search && view.page === 1) return;
          view = { ...view, search: operation.search, page: 1 };
          syncDerived();
          notify(["view"]);
          return;
        }
        case "setPage": {
          const page = Math.max(1, Math.round(operation.page));
          if (view.page === page) return;
          view = { ...view, page };
          notify(["view"]);
          return;
        }
        case "setLimit": {
          const limit = Math.max(1, Math.round(operation.limit));
          if (view.limit === limit && view.page === 1) return;
          view = { ...view, limit, page: 1 };
          notify(["view"]);
          return;
        }
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
      const base: CommittedState<TRow> = committed
        ? {
            view: committed.view,
            derived: committed.model,
            revisions: committed.revisions,
          }
        : { view, derived, revisions };
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
    refreshCallbacks(patch) {
      assertLive();
      adoptCallbackView(patch);
      const { configPatch, cleared } = callbackConfig(patch);
      if (cleared.length === 0 && Object.keys(configPatch).length === 0) {
        return;
      }
      const beforeSorted = derived.sorted;
      derived = model.reconfigure(derived, configPatch, cleared);
      attachIncrementalView(derived.sorted, derived);
      if (!committed && !sameItems(beforeSorted, derived.sorted)) {
        publish(["view"]);
      }
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
        derived = model.create(view.data, viewConfig());
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
