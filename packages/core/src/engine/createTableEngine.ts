/**
 * Framework-neutral table engine. Filter, sort and page run here; React
 * hooks subscribe. Host callbacks remain the persistence boundary.
 */
import {
  type ColumnModel,
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
  readonly columns: readonly ColumnModel<TRow>[];
  readonly capabilities: TableSourceCapabilities;
  readonly page: number;
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
  readonly columns: readonly ColumnModel<TRow>[];
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
 * Framework-neutral table.
 *
 * @public
 */
export interface TableEngine<TRow = unknown> {
  readonly tableId: string;
  readonly snapshot: () => TableSnapshot<TRow>;
  readonly getColumn: (key: string) => ColumnModel<TRow> | undefined;
  readonly cellValue: (row: TRow, columnKey: string) => unknown;
  readonly rows: (scope: TableRowScope) => readonly TRow[];
  readonly rowByKey: (rowKey: string) => TRow | undefined;
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
    patch: Partial<IncrementalViewConfig<TRow>>,
    options?: { silent?: boolean }
  ) => void;
  readonly invalidate: (
    axes: readonly TableRevisionAxis[],
    next?: {
      readonly data?: readonly TRow[];
      readonly columns?: readonly ColumnModel<TRow>[];
    },
    options?: { silent?: boolean }
  ) => void;
  readonly dispose: () => void;
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
  columns: readonly ColumnModel<TRow>[];
}

const EMPTY_EXTRA: ExtraFilters = {};
let tableSeq = 0;

function bump(
  revisions: TableRevisions,
  axes: readonly TableRevisionAxis[]
): TableRevisions {
  const next = { ...revisions };
  for (const axis of axes) next[axis] += 1;
  return next;
}

function defaultSearchText<TRow>(row: TRow): string {
  return engineSearchText(row);
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
  const paginationMode = options.paginationMode ?? "paged";
  const locale = options.locale;
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
  };
  let revisions: TableRevisions = { data: 1, view: 1, schema: 1, policy: 1 };
  let disposed = false;
  const listeners = new Set<{
    axes: ReadonlySet<TableRevisionAxis> | "all";
    listener: (next: TableRevisions) => void;
  }>();

  function columnMap(): Map<string, ColumnModel<TRow>> {
    return new Map(view.columns.map((column) => [column.key, column]));
  }

  let extraConfig: Partial<IncrementalViewConfig<TRow>> = {};

  function viewConfig(): IncrementalViewConfig<TRow> {
    return {
      getRowId: options.rowKey,
      getSearchText,
      filterFn,
      extra: view.extra,
      columns: view.columns,
      sortBy: view.sortBy,
      sortDir: view.sortDir,
      search: view.search,
      groupBy: view.groupBy,
      ...extraConfig,
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

  function pagedRows(): readonly TRow[] {
    const sorted = derived.sorted;
    const lastPage = Math.max(
      1,
      Math.ceil(sorted.length / Math.max(view.limit, 1))
    );
    const page = Math.min(Math.max(view.page, 1), lastPage);
    const slice =
      paginationMode === "infinite"
        ? sorted.slice(0, page * view.limit)
        : sorted.slice((page - 1) * view.limit, page * view.limit);
    attachIncrementalView(slice, derived);
    return slice;
  }

  function notify(changed: readonly TableRevisionAxis[]): void {
    revisions = bump(revisions, changed);
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

  function assertLive(): void {
    if (disposed) {
      throw new Error("TableEngine is disposed");
    }
  }

  return {
    tableId,
    snapshot() {
      assertLive();
      const sorted = derived.sorted;
      return {
        revisions,
        columns: view.columns,
        capabilities: sourceCapabilities({
          allFilteredRows: sorted,
          total: sorted.length,
        }),
        page: view.page,
        limit: view.limit,
        search: view.search,
        sortBy: view.sortBy,
        sortDir: view.sortDir,
        extra: view.extra,
        groupBy: view.groupBy,
        selectedIds: view.selectedIds,
        total: sorted.length,
      };
    },
    getColumn(key) {
      assertLive();
      return columnMap().get(key);
    },
    cellValue(row, columnKey) {
      assertLive();
      const column = columnMap().get(columnKey);
      if (!column) return undefined;
      return cellValue(row, column, locale);
    },
    rows(scope) {
      assertLive();
      if (scope === "full") return derived.sorted;
      return pagedRows();
    },
    rowByKey(rowKey) {
      assertLive();
      return view.data.find((row) => options.rowKey(row) === rowKey);
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
      extraConfig = { ...extraConfig, ...patch };
      if (patch.extra) view = { ...view, extra: patch.extra };
      if (patch.search !== undefined) view = { ...view, search: patch.search };
      if (patch.sortBy !== undefined) view = { ...view, sortBy: patch.sortBy };
      if (patch.sortDir !== undefined)
        view = { ...view, sortDir: patch.sortDir };
      if (patch.groupBy !== undefined) {
        view = {
          ...view,
          groupBy:
            typeof patch.groupBy === "string"
              ? patch.groupBy
              : patch.groupBy[0],
        };
      }
      if (patch.columns) view = { ...view, columns: patch.columns };
      syncDerived();
      if (!options?.silent) notify(["view"]);
    },
    invalidate(axes, next, options) {
      assertLive();
      if (next?.data) replaceData(next.data);
      if (next?.columns) {
        view = { ...view, columns: next.columns };
        syncDerived();
      }
      if (!options?.silent) notify(axes);
    },
    dispose() {
      disposed = true;
      listeners.clear();
    },
  };
}
