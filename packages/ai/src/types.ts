import type {
  ActionAiOptions,
  ApprovalPresentation,
  TableSourceCapabilities,
} from "@adapttable/core";
import type { AgentApprovalPending } from "@adapttable/react/adapter";

import type { CapabilityPresentation } from "./assistantContracts";

// `AgentCapabilityDefinition` names these, and every subpath re-exports this
// module, so they travel with it rather than being reachable only from the
// root entry.
export type {
  AssistantSuggestion,
  CapabilityPresentation,
} from "./assistantContracts";
import type {
  ApprovalPolicy,
  CommitPolicy,
  RowAddressScope,
  WritePolicy,
} from "./keys";

/**
 * JSON Schema (draft 2020-12 subset) returned by `describe`.
 *
 * @public
 */
export interface JsonSchema {
  /** Draft identifier, when the schema names one. */
  readonly $schema?: string;
  /** Accepted JSON types. */
  readonly type?: string | readonly string[];
  /** Named child schemas for an object. */
  readonly properties?: Readonly<Record<string, JsonSchema>>;
  /** Property names that must be present. */
  readonly required?: readonly string[];
  /** Extra-property rule, or a schema for additional keys. */
  readonly additionalProperties?: boolean | JsonSchema;
  /** Item schema for an array. */
  readonly items?: JsonSchema;
  /** Closed set of allowed values. */
  readonly enum?: readonly unknown[];
  /** Exact required value. */
  readonly const?: unknown;
  /** Inclusive numeric lower bound. */
  readonly minimum?: number;
  /** Inclusive numeric upper bound. */
  readonly maximum?: number;
  /** Minimum string length. */
  readonly minLength?: number;
  /** Human-readable field note. */
  readonly description?: string;
}

/**
 * One column the agent may mention. Never includes cell values.
 *
 * @public
 */
export interface AgentColumn {
  /** Stable column id. */
  readonly id: string;
  /** Display label. */
  readonly label: string;
  /** Declared value type. */
  readonly type: string;
  /** Whether `rows.read` may return this column. */
  readonly readable: boolean;
  /** Whether `edit.cells` may write this column. */
  readonly writable: boolean;
  /** Whether the column accepts sort. */
  readonly sortable: boolean;
  /** Whether `view.pinColumn` may pin this column to an edge. */
  readonly pinnable?: boolean;
}

/**
 * How the session addresses a row without shipping the dataset.
 *
 * @public
 */
export interface AgentRowAddressing {
  /** Named view the position refers to. */
  readonly scope: RowAddressScope;
  /** Field name used as the stable key (`rowKey`). */
  readonly key: string;
}

/**
 * Bounded-read ceilings advertised on the manifest.
 *
 * @public
 */
export interface AgentLimits {
  /** Largest page the session will accept. */
  readonly pageMax: number;
  /** Largest `rows.read` window. */
  readonly readMax: number;
}

/**
 * Write, approval, and commit rules for this table.
 *
 * @public
 */
export interface AgentPolicy {
  /** Whether host callbacks already authorize writes. */
  readonly write: WritePolicy;
  /** When a write must be confirmed. */
  readonly approval: ApprovalPolicy;
  /** Whether an approved write stages or persists. */
  readonly commit: CommitPolicy;
}

/**
 * Snapshot published to a runtime. Never includes row payloads.
 *
 * @public
 */
export interface AgentManifest {
  /** Schema family (`adapttable.agent.v1`). */
  readonly schemaVersion: string;
  /** Host-supplied table identity. */
  readonly tableId: string;
  /** Monotonic view revision the next execute must match. */
  readonly viewRevision: number;
  /** Capability keys actually wired right now. */
  readonly capabilities: readonly string[];
  /** Columns the agent may mention. */
  readonly columns: readonly AgentColumn[];
  /** How row keys and positions resolve. */
  readonly rowAddressing: AgentRowAddressing;
  /** Read and page ceilings. */
  readonly limits: AgentLimits;
  /** Write, approval, and commit rules. */
  readonly policy: AgentPolicy;
  /** Data-layer facts from the table source — never re-inferred here. */
  readonly source: TableSourceCapabilities;
}

/**
 * Side-effect-free description of what a governed write would do.
 *
 * The session resolves a plan first, shows it to approval, revalidates the
 * table, and only then runs the capability's `execute`.
 *
 * @public
 */
export interface CapabilityPlan {
  /** Per-row before/after the approver sees. */
  readonly proposals: readonly WriteProposal[];
  /** Opaque handback — the session returns it on {@link AgentCapabilityContext.plan}. */
  readonly payload?: unknown;
  /**
   * Whether a reader may decide each proposal on its own.
   *
   * True only when the proposals stand alone AND `payload` is an array
   * aligned with them index for index, because that is what lets the session
   * drop a refused row from the payload before the handler sees it. A row
   * move is the counter-example: two proposals describe one indivisible
   * change, so it stays all-or-nothing. Defaults to false — a plan that has
   * not thought about it is never split.
   */
  readonly perItem?: boolean;
}

/**
 * Whether a capability can honour `commit: "stage"`.
 *
 * `"unsupported"` is the default for custom writes: a stage-mode table
 * rejects the call before the handler runs rather than committing it.
 *
 * @public
 */
export type CapabilityStaging = "supported" | "unsupported";

/**
 * Whether a capability's handler applies exactly the plan it is given.
 *
 * Partial approval narrows `plan.proposals` and `plan.payload` to the rows a
 * reader agreed to — but `execute` still receives the ORIGINAL arguments,
 * because they are what the model asked for and rewriting them would be a
 * lie about the request. A handler that works from those arguments rather
 * than from the narrowed plan would therefore apply rows nobody approved.
 *
 * The session cannot inspect arbitrary host code to find out which kind of
 * handler it has, so a capability says so. `"unsupported"` is the default:
 * an undeclared capability is offered to the reader whole, and a row-by-row
 * answer for it is refused rather than quietly widened to "approve all".
 *
 * @public
 */
export type CapabilityPartial = "supported" | "unsupported";

/**
 * Governed capability extension registered on one table session.
 *
 * @public
 */
export interface AgentCapabilityDefinition {
  /** Stable capability key. Use a namespace prefix for custom keys. */
  readonly key: string;
  /** One-line English summary for catalog(). */
  readonly summary: string;
  /** Describe guide without schemaVersion — the session adds it. */
  readonly guide: Omit<CapabilityGuide, "schemaVersion" | "key"> & {
    readonly guide: string;
    readonly input: JsonSchema;
    readonly output: JsonSchema;
  };
  /** Effect class used for approval defaults on custom writes. */
  readonly kind?: "read" | "view" | "write" | "destructive";
  /**
   * Optional labels and suggestions for a reader-facing assistant.
   *
   * Purely additive: the key, the guide and the schemas are unchanged by it,
   * and a host that ships none behaves exactly as before.
   */
  readonly presentation?: CapabilityPresentation;
  /**
   * Whether `commit: "stage"` is honoured. Defaults to `"unsupported"` for
   * `write` and `destructive` kinds — the session rejects a staged call with
   * `commit-incompatible` before `execute` runs.
   */
  readonly staging?: CapabilityStaging;
  /**
   * Whether `execute` applies `plan.payload` rather than its own arguments,
   * and may therefore be offered for row-by-row approval. Defaults to
   * `"unsupported"`. See {@link CapabilityPartial}.
   */
  readonly partial?: CapabilityPartial;
  /**
   * Agent-invocation overrides for this capability, inheriting field by
   * field from the table's shared assistant configuration. The same shape an
   * ordinary row or bulk action carries. See `ActionAiOptions`.
   */
  readonly ai?: ActionAiOptions;
  /** Whether this capability is wired for the current observation. */
  isEnabled(observation: AgentObservation): boolean;
  /**
   * Resolve the proposal for a `write` or `destructive` capability without
   * touching host data. Omit and the session proposes the validated
   * arguments themselves.
   */
  plan?(
    context: AgentCapabilityContext,
    args: unknown
  ): Promise<CapabilityPlan> | CapabilityPlan;
  /**
   * Apply the capability. For a governed write this runs only after the
   * session has enforced write policy, commit mode and approval, and has
   * revalidated the revision.
   *
   * **`args` is what the model asked for, not what the reader agreed to.**
   * The session never rewrites it — the request is a record of the request.
   * When a reader approves part of a bulk write, the narrowing appears in
   * `context.plan`: both its `proposals` and its `payload` describe exactly
   * the approved rows, in plan order. A handler that reads `args` instead
   * would apply rows that were refused, which is why declaring
   * {@link AgentCapabilityDefinition.partial} `"supported"` is the promise
   * that this one reads `plan.payload`. Undeclared capabilities are never
   * offered for a row-by-row decision, so their `args` and `plan` always
   * agree.
   */
  execute(context: AgentCapabilityContext, args: unknown): unknown;
}

/**
 * Execution context passed to built-in and custom capability handlers.
 *
 * @public
 */
export interface AgentCapabilityContext {
  readonly observation: AgentObservation;
  readonly apply: AgentApply;
  readonly observe: () => AgentObservation;
  readonly onApprove?: (
    subject: ApprovalSubject,
    signal?: AbortSignal
  ) => Promise<ApprovalResult>;
  /**
   * The approved plan, on the `execute` call of a governed write. Absent
   * during `plan` itself and for read/view capabilities.
   *
   * Its `proposals` and array `payload` are already narrowed to what the
   * reader approved, so a handler that reads them applies the right rows
   * without knowing an approval happened.
   */
  readonly plan?: CapabilityPlan;
  /**
   * Positions in the ORIGINAL plan the reader approved, when they decided a
   * bulk write row by row. Absent when the whole write was approved.
   *
   * Informational. `plan` is already narrowed, and the session only offers a
   * row-by-row decision to a capability that declared
   * `partial: "supported"` — which is a promise that `execute` applies
   * `plan.payload`. This is here for a handler that wants to report which
   * positions ran, not as the thing standing between a refused row and the
   * host.
   */
  readonly approvedIndexes?: readonly number[];
  /** Commit mode the session resolved for this call. */
  readonly commit?: CommitPolicy;
  /**
   * The caller's cancellation, when one was passed to `execute`. Pass it to
   * anything that accepts a signal — a fetch, a nested request — so work that
   * has started can stop.
   */
  readonly signal?: AbortSignal;
  /**
   * Throws `cancelled` when the request has been aborted.
   *
   * The session calls this at every seam it owns: before the handler runs,
   * after planning, after approval, and before each row of a bulk write. Call
   * it yourself between the steps of a multi-step handler, immediately BEFORE
   * each side effect — a callback the host has already been given cannot be
   * taken back, and this makes no claim to undo one.
   */
  readonly throwIfCancelled: () => void;
}

/**
 * Catalog row — key plus a short English summary.
 *
 * @public
 */
export interface CatalogEntry {
  /** Capability key. */
  readonly key: string;
  /** One-line English summary. */
  readonly summary: string;
}

/**
 * Lazy capability contract.
 *
 * @public
 */
export interface CapabilityGuide {
  /** Capability this guide describes. */
  readonly key: string;
  /** Schema family the guide belongs to. */
  readonly schemaVersion: string;
  /** English instructions for a model or host. */
  readonly guide: string;
  /** JSON Schema for `execute` arguments. */
  readonly input: JsonSchema;
  /** JSON Schema for a successful result. */
  readonly output: JsonSchema;
}

/**
 * Structured failure returned from `execute`.
 *
 * @public
 */
export interface ExecuteError {
  /** Stable machine code. */
  readonly code: string;
  /** Human-readable reason. */
  readonly message: string;
}

/**
 * Result of one `execute` call.
 *
 * @public
 */
export interface ExecuteResult {
  /** Whether the capability ran. */
  readonly ok: boolean;
  /** View revision after the call. */
  readonly revision: number;
  /** Caller-supplied replay key. */
  readonly idempotencyKey: string;
  /** Successful payload, when `ok` is true. */
  readonly result?: unknown;
  /** Failure, when `ok` is false. */
  readonly error?: ExecuteError;
}

/**
 * Address a row by stable key.
 *
 * @public
 */
export interface RowKeyRef {
  /** Stable row identity. */
  readonly rowKey: string;
}

/**
 * Address a row by 1-based position in a named view.
 *
 * @public
 */
export interface RowPositionRef {
  /** 1-based index in `scope`. */
  readonly position: number;
  /** Named view the position refers to. */
  readonly scope: RowAddressScope;
  /** View revision the position was read against. */
  readonly expectedRevision: number;
}

/**
 * Address a row by stable key or by 1-based position in a named view.
 *
 * @public
 */
export type RowRef = RowKeyRef | RowPositionRef;

/**
 * A row the session resolved before a write.
 *
 * @public
 */
export interface ResolvedRow {
  /** Stable row identity. */
  readonly rowKey: string;
  /** Scope used to resolve the row. */
  readonly scope: RowAddressScope;
  /** 1-based position, when the caller addressed by position. */
  readonly position?: number;
}

/**
 * One cell of a bounded, redacted row window.
 *
 * @public
 */
export interface RowWindowRow {
  /** Stable row identity. */
  readonly rowKey: string;
  /** Readable cell values keyed by column id. */
  readonly cells: Readonly<Record<string, unknown>>;
}

/**
 * Bounded window returned by `rows.read`.
 *
 * @public
 */
export interface RowWindow {
  /** Rows in this window. */
  readonly rows: readonly RowWindowRow[];
  /** Starting offset. */
  readonly offset: number;
  /** Requested window size. */
  readonly limit: number;
  /** Column ids omitted because they are unreadable. */
  readonly redacted: readonly string[];
}

/**
 * Query for `rows.read`.
 *
 * @public
 */
export interface RowReadQuery {
  /** Starting offset. */
  readonly offset: number;
  /** Window size. */
  readonly limit: number;
  /** Optional column id allow-list. */
  readonly columns?: readonly string[];
  /** Named view to read from. */
  readonly scope?: RowAddressScope;
}

/**
 * One proposed cell or row mutation, returned before a write lands.
 *
 * @public
 */
export interface WriteProposal {
  /** Stable row identity. */
  readonly rowKey: string;
  /** Column being written, when the proposal is a cell edit. */
  readonly column?: string;
  /** Value before the write. */
  readonly before?: unknown;
  /** Value after the write. */
  readonly after?: unknown;
}

/**
 * Approval state recorded on a mutating execute.
 *
 * @public
 */
export type ApprovalOutcome =
  | "pending"
  | "approved"
  | "partial"
  | "rejected"
  | "cancelled"
  | "not-required";

/**
 * What a reader is being asked to confirm.
 *
 * Every write arrives as one of these two shapes, so an approver never has
 * to guess from the runtime type of a value what it was handed. A write that
 * enumerates rows is `rows`; a write a backend performs whole — "set every
 * matching row to Active" — is `operation`, and names no rows because none
 * were enumerated.
 *
 * @public
 */
export type ApprovalSubject =
  | {
      readonly kind: "rows";
      /** The rows, in plan order. */
      readonly proposals: readonly WriteProposal[];
      /** Whether each row may be decided on its own. */
      readonly perItem: boolean;
      /**
       * Where this write is reviewed, already resolved: the table's shared
       * setting with the action's own override applied. An approver reads it
       * rather than resolving the question a second time and disagreeing.
       */
      readonly presentation: ApprovalPresentation;
    }
  | {
      readonly kind: "operation";
      /** Capability key the write runs. */
      readonly capability: string;
      /** Reader-facing name, when the capability declared one. */
      readonly title?: string;
      /** Arguments the capability was called with. */
      readonly arguments: unknown;
      /** Where this write is reviewed, already resolved. */
      readonly presentation: ApprovalPresentation;
    };

/**
 * What a reader decided about a write they were asked to confirm.
 *
 * `true` and `false` decide the whole write. An index list decides a bulk
 * write row by row: those positions in {@link CapabilityPlan.proposals} ran
 * and the rest never did. An empty list is a refusal of everything, which is
 * why it is reported as `rejected` rather than `partial`.
 *
 * @public
 */
export type ApprovalResult = boolean | { readonly approved: readonly number[] };

/**
 * Per-row outcome of a bulk write. Failures are never dropped.
 *
 * @public
 */
export interface WriteRowResult {
  /** Stable row identity. */
  readonly rowKey: string;
  /** Column written, when the result is a cell edit. */
  readonly column?: string;
  /** Whether this row succeeded. */
  readonly ok: boolean;
  /** Failure for this row. */
  readonly error?: ExecuteError;
}

/**
 * `execute` payload for mutating keys.
 *
 * @public
 */
export interface WriteExecuteResult {
  /** Proposed mutations, including those still pending approval. */
  readonly proposals: readonly WriteProposal[];
  /** Whether the host callback ran. */
  readonly applied: boolean;
  /** Approval recorded for this execute. */
  readonly approval: ApprovalOutcome;
  /** Per-row receipts, when the host returned them. */
  readonly results?: readonly WriteRowResult[];
}

/**
 * One cell write the session resolved to a `rowKey` before calling the host.
 *
 * @public
 */
export interface AgentCellEdit {
  /** Stable row identity. */
  readonly rowKey: string;
  /** Column to write. */
  readonly column: string;
  /** Value to write. */
  readonly value: unknown;
}

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
  /** Current filter model. */
  readonly filters?: unknown;
  /** Named view used for position addressing. */
  readonly rowAddressScope: RowAddressScope;
  /** Largest page the session will accept. */
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
  /** Pin a column to a logical edge, or unpin it with `undefined`. */
  pinColumn?(key: string, side: "start" | "end" | undefined): void;
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

/**
 * How a host receives live updates.
 *
 * @public
 */
export interface TableAgentBridge {
  /** Called when the published manifest changes. */
  publish?(manifest: AgentManifest): void;
  /** Called with the live session after mount. */
  attach?(session: AgentSession): void;
  /**
   * Called when a write starts or stops waiting on a human.
   *
   * `execute` does not return while an approval is open, so a panel outside
   * the table has no other way to know the turn is parked rather than
   * thinking. It receives the approval itself, not just the fact of one, so
   * a panel mounted beside the table can review it rather than only report
   * that something is waiting elsewhere. Only the chrome-mediated path
   * reports here: with `onApprove` set the host is already the one asked.
   */
  readonly approvals?: (pending: AgentApprovalPending | null) => void;
}
