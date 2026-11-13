/**
 * What a call returns: results, row references and windows, write proposals,
 * approvals and per-row outcomes.
 */
import type { ApprovalPresentation } from "@adapttable/core";

import type { RowAddressScope } from "./keys";

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
export type ApprovalResult =
  | boolean
  | {
      readonly approved: readonly number[];
      /**
       * Why the reader refused, when they said.
       *
       * Reaches the receipt and the model-visible result, so an assistant can
       * answer "because it was the wrong quarter" instead of "rejected" and
       * the reader is not asked to explain themselves twice.
       */
      readonly reason?: string;
    };

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
  /** Why the reader refused, when they said. */
  readonly approvalReason?: string;
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
