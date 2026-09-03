import type { TableSourceCapabilities } from "@adapttable/core";

import type {
  ApprovalPolicy,
  CapabilityKey,
  CommitPolicy,
  RowAddressScope,
  WritePolicy,
} from "./keys";

/** JSON Schema (draft 2020-12 subset) returned by `describe`. */
export interface JsonSchema {
  readonly $schema?: string;
  readonly type?: string | readonly string[];
  readonly properties?: Readonly<Record<string, JsonSchema>>;
  readonly required?: readonly string[];
  readonly additionalProperties?: boolean | JsonSchema;
  readonly items?: JsonSchema;
  readonly enum?: readonly unknown[];
  readonly const?: unknown;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly minLength?: number;
  readonly description?: string;
}

/** One column the agent may mention. Never includes cell values. */
export interface AgentColumn {
  readonly id: string;
  readonly label: string;
  readonly type: string;
  readonly readable: boolean;
  readonly writable: boolean;
  readonly sortable: boolean;
}

/** Snapshot published to a runtime. Never includes row payloads. */
export interface AgentManifest {
  readonly schemaVersion: string;
  readonly tableId: string;
  readonly viewRevision: number;
  readonly capabilities: readonly CapabilityKey[];
  readonly columns: readonly AgentColumn[];
  readonly rowAddressing: {
    readonly scope: RowAddressScope;
    readonly key: string;
  };
  readonly limits: {
    readonly pageMax: number;
    readonly readMax: number;
  };
  readonly policy: {
    readonly write: WritePolicy;
    readonly approval: ApprovalPolicy;
    readonly commit: CommitPolicy;
  };
  /** Data-layer facts from item 5-A — never re-inferred here. */
  readonly source: TableSourceCapabilities;
}

/** Catalog row — key plus a short English summary. */
export interface CatalogEntry {
  readonly key: CapabilityKey;
  readonly summary: string;
}

/** Lazy capability contract. */
export interface CapabilityGuide {
  readonly key: CapabilityKey;
  readonly schemaVersion: string;
  readonly guide: string;
  readonly input: JsonSchema;
  readonly output: JsonSchema;
}

/** Result of one `execute` call. */
export interface ExecuteResult {
  readonly ok: boolean;
  readonly revision: number;
  readonly idempotencyKey: string;
  readonly result?: unknown;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}

/** Address a row by stable key or by 1-based position in a named view. */
export type RowRef =
  | { readonly rowKey: string }
  | {
      readonly position: number;
      readonly scope: RowAddressScope;
      readonly expectedRevision: number;
    };

/** A row the session resolved before a write. */
export interface ResolvedRow {
  readonly rowKey: string;
  readonly scope: RowAddressScope;
  readonly position?: number;
}

/** One cell of a bounded, redacted row window. */
export interface RowWindowRow {
  readonly rowKey: string;
  readonly cells: Readonly<Record<string, unknown>>;
}

/** Bounded window returned by `rows.read`. */
export interface RowWindow {
  readonly rows: readonly RowWindowRow[];
  readonly offset: number;
  readonly limit: number;
  readonly redacted: readonly string[];
}

/** Query for `rows.read`. */
export interface RowReadQuery {
  readonly offset: number;
  readonly limit: number;
  readonly columns?: readonly string[];
  readonly scope?: RowAddressScope;
}

/** One proposed cell or row mutation, returned before a write lands. */
export interface WriteProposal {
  readonly rowKey: string;
  readonly column?: string;
  readonly before?: unknown;
  readonly after?: unknown;
}

/** Approval state recorded on a mutating execute. */
export type ApprovalOutcome =
  "pending" | "approved" | "rejected" | "not-required";

/** Per-row outcome of a bulk write. Failures are never dropped. */
export interface WriteRowResult {
  readonly rowKey: string;
  readonly column?: string;
  readonly ok: boolean;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}

/** `execute` payload for mutating keys. */
export interface WriteExecuteResult {
  readonly proposals: readonly WriteProposal[];
  readonly applied: boolean;
  readonly approval: ApprovalOutcome;
  readonly results?: readonly WriteRowResult[];
}

/**
 * What is actually wired on this table right now.
 *
 * The session never guesses from package availability.
 */
export interface AgentObservation {
  readonly tableId: string;
  readonly viewRevision: number;
  readonly featureIds: readonly string[];
  readonly columns: readonly AgentColumn[];
  readonly source: TableSourceCapabilities;
  readonly writePolicy: WritePolicy;
  readonly approval?: ApprovalPolicy;
  readonly commit?: CommitPolicy;
  readonly hasPagination: boolean;
  readonly hasSearch: boolean;
  readonly hasSort: boolean;
  readonly hasFilters: boolean;
  readonly hasExport: boolean;
  readonly hasEdit: boolean;
  readonly hasReorder: boolean;
  readonly hasSelection?: boolean;
  readonly hasSavedViews?: boolean;
  readonly hasAdd?: boolean;
  readonly hasDelete?: boolean;
  readonly page: number;
  readonly limit: number;
  readonly search: string;
  readonly sortBy?: string;
  readonly sortDir?: "asc" | "desc";
  readonly groupBy?: string;
  readonly filters?: unknown;
  readonly rowAddressScope: RowAddressScope;
  readonly pageMax: number;
  readonly readMax?: number;
}

/** Host- or feature-applied mutation. */
export interface AgentApply {
  setPage?(page: number): void;
  setLimit?(limit: number): void;
  setSearch?(search: string): void;
  setSort?(key: string | undefined, dir?: "asc" | "desc"): void;
  setFilters?(filters: unknown): void;
  setGroupBy?(key: string | undefined): void;
  setSelection?(ids: readonly string[] | undefined): void;
  applyView?(viewId: string): void;
  runExport?(format: string): unknown;
  readRows?(query: RowReadQuery): Promise<RowWindow> | RowWindow;
  resolveRow?(ref: RowRef): Promise<ResolvedRow> | ResolvedRow;
  /**
   * Immediate cell writes through the host edit path.
   *
   * The session always resolves row refs to `rowKey` before calling this.
   * The host may return a proposal or persist receipt, sync or async.
   */
  editCells?(
    edits: readonly { rowKey: string; column: string; value: unknown }[]
  ): unknown;
  /**
   * Stage cell writes on the existing batch/dirty path.
   *
   * Absent when batch editing is not composed — the session then returns
   * proposals with `applied: false`.
   */
  stageCells?(
    edits: readonly { rowKey: string; column: string; value: unknown }[]
  ): unknown;
  addRows?(rows: readonly Record<string, unknown>[]): unknown;
  deleteRows?(keys: readonly string[]): unknown;
  reorderRows?(fromKey: string, toKey: string): unknown;
}

/** Session the three-stage contract speaks. */
export interface AgentSession {
  catalog(): readonly CatalogEntry[];
  describe(key: string): CapabilityGuide;
  execute(
    key: string,
    args: unknown,
    expectedRevision: number,
    idempotencyKey: string
  ): Promise<ExecuteResult>;
  manifest(): AgentManifest;
}

/** How a host receives live updates. */
export interface TableAgentBridge {
  publish?(manifest: AgentManifest): void;
  attach?(session: AgentSession): void;
}
