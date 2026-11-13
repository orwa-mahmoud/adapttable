/** The live table a session observes and changes, and the session itself. */
import type {
  ApprovalPresentation,
  TableSourceCapabilities,
} from "@adapttable/core";

import type {
  ApprovalPolicy,
  CommitPolicy,
  RowAddressScope,
  WritePolicy,
} from "./keys";
import type { AgentPagination } from "./pagination";
import { type CapabilityGuide, type CatalogEntry } from "./typesCapability";
import {
  type AgentCellEdit,
  type ExecuteResult,
  type ResolvedRow,
  type RowReadQuery,
  type RowRef,
  type RowWindow,
} from "./typesExecute";
import {
  type AgentAggregations,
  type AgentAggregationsPatch,
  type AgentColumn,
  type AgentFilter,
  type AgentManifest,
} from "./typesManifest";

/**
 * What is actually wired on this table right now.
 *
 * The session never guesses from package availability.
 *
 * @public
 */
export interface AgentObservation {
  /** Host-supplied table identity. */
  readonly tableId: string;
  /** Current view revision. */
  readonly viewRevision: number;
  /** Feature ids composed on the live table. */
  readonly featureIds: readonly string[];
  /** Columns the agent may mention. */
  readonly columns: readonly AgentColumn[];
  /** Data-layer facts from the table source. */
  readonly source: TableSourceCapabilities;
  /** Whether host callbacks already authorize writes. */
  readonly writePolicy: WritePolicy;
  /** When a write must be confirmed. */
  readonly approval?: ApprovalPolicy;
  /**
   * Where the table reviews an approval, before an action overrides it.
   * Defaults to `"widget"`.
   */
  readonly presentation?: ApprovalPresentation;
  /**
   * Capability keys a reader may wave through for the session.
   *
   * Off unless the table names them. It only ever narrows: a destructive
   * capability, a write that enumerates rows, and an action whose own
   * configuration demands a human all refuse regardless.
   */
  readonly alwaysAllow?: readonly string[];
  /** Whether an approved write stages or persists. */
  readonly commit?: CommitPolicy;
  /** Whether page navigation is wired. */
  readonly hasPagination: boolean;
  /** Whether search is wired. */
  readonly hasSearch: boolean;
  /** Whether sort is wired. */
  readonly hasSort: boolean;
  /** Whether filters are wired. */
  readonly hasFilters: boolean;
  /** Whether export is wired. */
  readonly hasExport: boolean;
  /** Whether cell editing is wired. */
  readonly hasEdit: boolean;
  /** Whether row reorder is wired. */
  readonly hasReorder: boolean;
  /** Whether selection is wired. */
  readonly hasSelection?: boolean;
  /** Whether saved views are wired. */
  readonly hasSavedViews?: boolean;
  /** Whether column pinning is wired. */
  readonly hasColumnPinning?: boolean;
  /** Whether row pinning is wired. */
  readonly hasRowPinning?: boolean;
  /** Whether hiding a column is wired. */
  readonly hasColumnHide?: boolean;
  /** Whether reordering columns is wired. */
  readonly hasColumnOrder?: boolean;
  /** Column ids the reader has hidden, in layout order. */
  readonly hiddenColumns?: readonly string[];
  /** Full column order, including hidden columns. */
  readonly columnOrder?: readonly string[];
  /**
   * Columns currently pinned, by logical edge.
   *
   * Logical because `start` is the right edge under `dir="rtl"`: the same
   * request reads correctly in both writing directions.
   */
  readonly pinnedColumns?: Readonly<Record<string, "start" | "end">>;
  /** Row keys currently pinned above and below the scrolled body. */
  readonly pinnedRows?: {
    readonly top: readonly string[];
    readonly bottom: readonly string[];
  };
  /** Whether add-row is wired. */
  readonly hasAdd?: boolean;
  /** Whether delete-row is wired. */
  readonly hasDelete?: boolean;
  /** Current 1-based page. */
  readonly page: number;
  /** Current page size. */
  readonly limit: number;
  /** Current search string. */
  readonly search: string;
  /** Current sort column, when set. */
  readonly sortBy?: string;
  /** Current sort direction, when set. */
  readonly sortDir?: "asc" | "desc";
  /** Current group-by column, when set. */
  readonly groupBy?: string;
  /**
   * Live aggregation offer, when grouping can actually execute aggregates.
   * Absent when the table cannot honour an aggregation request.
   */
  readonly aggregations?: AgentAggregations;
  /**
   * Filters the assistant may mention, when the table published declarative
   * defs. Absent when filters are host-owned and untyped. An empty array
   * means every def was hidden.
   */
  readonly availableFilters?: readonly AgentFilter[];
  /** Current extra filter bag. */
  readonly filters?: unknown;
  /** Named view used for position addressing. */
  readonly rowAddressScope: RowAddressScope;
  /**
   * What this table's pages actually are, for the current query.
   *
   * The authority when present: it carries the counted total where a source
   * has one, says outright when a total or a further page is unknowable, and
   * states whether a page number may be named at all. Bindings build it with
   * `agentPagination` rather than deriving a bound of their own.
   */
  readonly pagination?: AgentPagination;
  /**
   * Largest page the session will accept.
   *
   * Superseded by {@link AgentObservation.pagination}, which distinguishes a
   * counted total from an unknown one and says how a source may be navigated.
   * Read only when no pagination is supplied, and then as a page count — a
   * row count here is the defect this field is most often given.
   */
  readonly pageMax: number;
  /** Largest `rows.read` window. */
  readonly readMax?: number;
}

/**
 * Host- or feature-applied mutation.
 *
 * @public
 */
export interface AgentApply {
  /** Move to a 1-based page. */
  setPage?(page: number): void;
  /** Change the page size. */
  setLimit?(limit: number): void;
  /** Set the toolbar search string. */
  setSearch?(search: string): void;
  /** Sort by a column id, or clear sort. */
  setSort?(key: string | undefined, dir?: "asc" | "desc"): void;
  /** Replace the active filter model. */
  setFilters?(filters: unknown): void;
  /** Group by a column id, or clear grouping. */
  setGroupBy?(key: string | undefined): void;
  /**
   * Add, change or remove specific aggregations, or restore defaults.
   * The session validates the whole patch before calling this.
   */
  setAggregations?(patch: AgentAggregationsPatch): void;
  /** Pin a column to a logical edge, or unpin it with `undefined`. */
  pinColumn?(key: string, side: "start" | "end" | undefined): void;
  /** Hide or show a column. */
  hideColumn?(key: string, hidden: boolean): void;
  /** Replace the full column order, hidden columns included. */
  setColumnOrder?(order: readonly string[]): void;
  /** Move one column to a 0-based index in the full order. */
  moveColumn?(key: string, toIndex: number): void;
  /** Pin a row above or below the scrolled body, or unpin it. */
  pinRow?(rowKey: string, side: "top" | "bottom" | undefined): void;
  /** Replace or clear the current selection. */
  setSelection?(ids: readonly string[] | undefined): void;
  /** Apply a saved view by id. */
  applyView?(viewId: string): void;
  /** Start an export through the host export path. */
  runExport?(format: string): unknown;
  /** Read a bounded, redacted row window. */
  readRows?(query: RowReadQuery): Promise<RowWindow> | RowWindow;
  /** Resolve a row key or 1-based position. */
  resolveRow?(ref: RowRef): Promise<ResolvedRow> | ResolvedRow;
  /**
   * Immediate cell writes through the host edit path.
   *
   * The session always resolves row refs to `rowKey` before calling this.
   * The host may return a proposal or persist receipt, sync or async.
   */
  editCells?(edits: readonly AgentCellEdit[]): unknown;
  /**
   * Stage cell writes on the existing batch/dirty path.
   *
   * Absent when batch editing is not composed — the session then returns
   * proposals with `applied: false`.
   */
  stageCells?(edits: readonly AgentCellEdit[]): unknown;
  /** Add rows through the host add callback. */
  addRows?(rows: readonly Record<string, unknown>[]): unknown;
  /** Delete rows through the host delete callback. */
  deleteRows?(keys: readonly string[]): unknown;
  /** Move a row through the host reorder callback. */
  reorderRows?(fromKey: string, toKey: string): unknown;
}

/**
 * Session the three-stage contract speaks.
 *
 * @public
 */
export interface AgentSession {
  /** Enabled keys plus one-line summaries, in catalog order. */
  catalog(): readonly CatalogEntry[];
  /** Guide and schemas for one enabled key. */
  describe(key: string): CapabilityGuide;
  /** Run one capability against the current observation. */
  execute(
    key: string,
    args: unknown,
    expectedRevision: number,
    idempotencyKey: string,
    signal?: AbortSignal
  ): Promise<ExecuteResult>;
  /** Deterministic snapshot for the current observation. */
  manifest(): AgentManifest;
}
