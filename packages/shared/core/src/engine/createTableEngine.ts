/**
 * Framework-neutral table engine. Filter, sort and page run here; React
 * hooks subscribe. Host callbacks remain the persistence boundary.
 *
 * This module injects the full row model. A table that only filters, sorts,
 * and searches uses {@link createBasicTableEngine}.
 */
import type {
  ColumnMetadata,
  ExtraFilters,
  SortDirection,
} from "../contracts/columns";
import type {
  TableOperation,
  TableRevisionAxis,
  TableRevisions,
  TableRowScope,
} from "../contracts/lifecycle";
import type { TableSourceCapabilities } from "../contracts/source";
import type { IncrementalViewConfig } from "../rows/incremental";
import { createFullRowModel } from "./fullRowModel";
import { createTableSession } from "./tableSession";
export type {
  TableOperation,
  TableRevisionAxis,
  TableRevisions,
  TableRowScope,
} from "../contracts/lifecycle";

/**
 * Readable snapshot of engine state.
 *
 * @public
 */
export interface TableSnapshot<TRow = unknown> {
  /** A token per axis; one that changed means that part of the state changed. */
  readonly revisions: TableRevisions;
  /** The columns the engine derives from. */
  readonly columns: readonly ColumnMetadata<TRow>[];
  /**
   * What the data reaches: the full set, grouping, selection across pages,
   * export scope and row count.
   */
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
  /** Rows per page. */
  readonly limit: number;
  /** The search term, or `""`. */
  readonly search: string;
  /** The sorted column, when one is. */
  readonly sortBy: string | undefined;
  /** The sort direction, when a column is sorted. */
  readonly sortDir: SortDirection | undefined;
  /** The filter values, by key. */
  readonly extra: ExtraFilters;
  /** The grouping column, when rows are grouped. */
  readonly groupBy: string | undefined;
  /** The selected row keys. */
  readonly selectedIds: readonly string[];
  /** Rows matching the search and filters. */
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
 * Callbacks a source may refresh without handing the engine a new query.
 *
 * Each key that is present is written. `undefined` clears that callback
 * where the model allows it; a key that is absent is left as it is.
 * Column arrays are adopted onto the model the derivation reads. The
 * column list `getColumn` walks changes only when a stage or configure
 * replaces it, so an in-place edit of a column object stays visible.
 *
 * @public
 */
export interface TableCallbackRefresh<TRow> {
  /** Stable row identity. */
  readonly getRowId?: (row: TRow) => string;
  /** Searchable text for one row. */
  readonly getSearchText?: (row: TRow) => string;
  /** Client filter over the extra bag. */
  readonly filterFn?: NonNullable<IncrementalViewConfig<TRow>["filterFn"]>;
  /** Predicate for a filter tree. */
  readonly filterTreeFn?: NonNullable<
    IncrementalViewConfig<TRow>["filterTreeFn"]
  >;
  /** Columns the derivation reads. */
  readonly columns?: NonNullable<IncrementalViewConfig<TRow>["columns"]>;
  /** Sort value for one cell. */
  readonly getSortValue?: NonNullable<
    IncrementalViewConfig<TRow>["getSortValue"]
  >;
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
  /** Stable id for this table. */
  readonly tableId: string;
  /** Stable row identity. */
  readonly rowKey: (row: TRow) => string;
  /**
   * What the render in progress staged, or the committed state when nothing
   * is pending. Read this to render the state about to be published; read the
   * engine itself for the state everyone else can see.
   */
  readonly candidate: TableEngineReader<TRow>;
  /** Listen for changes on some axes, or all; returns the unsubscribe. */
  readonly subscribe: (
    axes: readonly TableRevisionAxis[] | "all",
    listener: (revisions: TableRevisions) => void
  ) => () => void;
  /** Apply one operation — a page, sort, search, filter or selection change. */
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
   * Stages before a commit build one candidate: each patch applies on top of
   * the candidate so far, the way a render stages its data and then its view.
   * A dropped candidate — discarded, or replaced by a `configure`, `dispatch`
   * or `invalidate` — leaves the committed state exactly as it was.
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
  /**
   * Adopt callback identities onto the model that is being written.
   *
   * While a candidate is pending, the committed model is left untouched.
   * A new closure with the same presence does not re-derive or notify.
   * Clearing a callback, or adding one that was absent, re-derives the
   * affected rows and notifies when that write is the committed model.
   */
  readonly refreshCallbacks: (patch: TableCallbackRefresh<TRow>) => void;
  /** Stop every subscription and release the engine. */
  readonly dispose: () => void;
}

/**
 * Create a table engine over in-memory rows.
 *
 * The full evaluator filters, sorts, searches, groups, and aggregates.
 *
 * @public
 */
export function createTableEngine<TRow>(
  options: CreateTableEngineOptions<TRow>
): TableEngine<TRow> {
  return createTableSession(options, createFullRowModel());
}
