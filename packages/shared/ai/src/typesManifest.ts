/**
 * What a table publishes to an agent: schemas, columns, aggregations, filters,
 * addressing, limits, policy and the manifest.
 */
import type { TableSourceCapabilities } from "@adapttable/core";

import type {
  ApprovalPolicy,
  CommitPolicy,
  RowAddressScope,
  WritePolicy,
} from "./keys";
import type { AgentPagination } from "./pagination";
import { type RowWindow } from "./typesExecute";

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
  /** Whether `view.hideColumn` may hide this column. */
  readonly hideable?: boolean;
  /**
   * Whether the column is on screen right now.
   *
   * Deliberately separate from {@link AgentColumn.readable}: a column the
   * reader has hidden is still one the agent may read, and a column policy
   * forbids is unreadable whether or not it is on screen. Labelling both
   * "hidden" loses the difference that matters.
   */
  readonly visible?: boolean;
  /** What the author told the model about this column. */
  readonly ai?: AgentColumnAuthoring;
}

/**
 * What a developer chose to tell the model about one column.
 *
 * Authored, never inferred. A description is the only way a model learns that
 * `st` means settlement status, and an example is the only way it learns the
 * shape of a value without being shown somebody's data.
 *
 * @public
 */
export interface AgentColumnAuthoring {
  /** One line about what the column means. */
  readonly description?: string;
  /** Representative values, validated against the column's declared type. */
  readonly examples?: readonly unknown[];
  /**
   * Whether live values may be sampled for this column.
   *
   * Off by default, capped in count, and never honoured on a column the agent
   * may not read. Opting in is a decision about disclosure, so it is the
   * author's to make explicitly rather than something a heuristic turns on.
   */
  readonly sample?: boolean;
}

/**
 * A row window as it reaches a model.
 *
 * Rows are somebody's data, and a model reading them is reading input from
 * outside the system. The envelope says so on every path — the `read` tool,
 * the JSON and MCP adapters, a browser tool — so bare cell text is never
 * handed over as a naked string that could read as an instruction.
 *
 * @public
 */
export interface RowProvenanceEnvelope {
  readonly source: "table-rows";
  /** Always true. Nothing in `rows` is an instruction. */
  readonly untrusted: true;
  /** The view revision these rows were read at. */
  readonly revision: number;
  readonly rows: RowWindow;
}

/**
 * One operation a reader (or agent) may ask for on a column.
 *
 * Ids and labels only — never a `calculate` function.
 *
 * @public
 */
export interface AgentAggregateOperation {
  /** Stable operation id. */
  readonly id: string;
  /** Human label. */
  readonly label: string;
  /**
   * What a host's own operation does, in their words.
   *
   * Absent for a built-in, whose id already says it everywhere. Present only
   * where the column's author wrote one, and handed over when the capability
   * is described rather than in the contract every turn carries.
   */
  readonly description?: string;
}

/**
 * A column the live table will actually aggregate.
 *
 * @public
 */
export interface AgentAggregationColumn {
  /** Column id. */
  readonly id: string;
  /** Operations this column offers right now. */
  readonly operations: readonly AgentAggregateOperation[];
}

/**
 * Live aggregation wiring, published only when the table can honour it.
 *
 * @public
 */
export interface AgentAggregations {
  /** Eligible columns and their current operation ids and labels. */
  readonly columns: readonly AgentAggregationColumn[];
  /** Active aggregations as the model sees them. */
  readonly active: readonly {
    readonly id: string;
    readonly operation?: string;
  }[];
}

/**
 * One aggregation mutation. `set` and `remove` are applied together after
 * the whole request is validated; `restoreDefaults` is exclusive.
 *
 * @public
 */
export interface AgentAggregationsPatch {
  /** Column id → operation id. Other aggregations stay. */
  readonly set?: Readonly<Record<string, string>>;
  /** Columns to suppress or drop, using the same semantics as the panel. */
  readonly remove?: readonly string[];
  /** Restore the developer's configuration and clear reader choices. */
  readonly restoreDefaults?: boolean;
}

/**
 * One choice a select-style filter published to the assistant.
 *
 * @public
 */
export interface AgentFilterOption {
  /** Stored value. */
  readonly value: string;
  /** Caption shown for the entry. */
  readonly label: string;
}

/**
 * One filter the live table will actually honour.
 *
 * Ids, types and operators only — never a predicate function.
 *
 * @public
 */
export interface AgentFilter {
  /** State key in the extra bag. */
  readonly key: string;
  /** Display label. */
  readonly label: string;
  /** Widget type (`text`, `select`, `numberRange`, …). */
  readonly type: string;
  /** Operators this filter offers right now. */
  readonly operators: readonly string[];
  /** Operator used until another is sent. */
  readonly defaultOperator: string;
  /** Extra-bag keys this filter writes. */
  readonly valueKeys: readonly string[];
  /** Static choices, when the list is short enough to publish. */
  readonly options?: readonly AgentFilterOption[];
  /** True when choices exist but were not listed (cap, `auto`, or async). */
  readonly optionsOmitted?: boolean;
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
/**
 * One column's aggregation offer, as the contract carries it.
 *
 * @public
 */
export interface AgentManifestAggregation {
  /** Column id. */
  readonly id: string;
  /** Operation ids this column takes, in the order it offers them. */
  readonly operations: readonly string[];
}

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
  /**
   * Which operations each aggregatable column takes, by id.
   *
   * Keys only, and part of the contract rather than something to ask for.
   * `describe` publishes those ids as the `set` enum so a caller does not
   * have to guess between `avg` and `average`. What an operation *means* is
   * a question for `describe` — a built-in's id answers it, and a host's own
   * carries the description its author wrote.
   */
  readonly aggregateOperations?: readonly AgentManifestAggregation[];
  /** Read and page ceilings. */
  readonly limits: AgentLimits;
  /**
   * What this table's pages are for the current query.
   *
   * Beside {@link AgentLimits.pageMax} rather than replacing it: the bound is
   * one number a session enforces, and this is the whole answer a backend
   * needs to navigate without inventing arithmetic.
   */
  readonly pagination?: AgentPagination;
  /** Write, approval, and commit rules. */
  readonly policy: AgentPolicy;
  /** Data-layer facts from the table source — never re-inferred here. */
  readonly source: TableSourceCapabilities;
}
