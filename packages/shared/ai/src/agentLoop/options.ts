import type { ActionAiOptions, AgentProgress } from "@adapttable/core";

import type {
  AgentApply,
  AgentCapabilityDefinition,
  AgentObservation,
  ApprovalResult,
  ApprovalSubject,
} from "../types";

/**
 * Inputs for {@link createAgentSession}.
 *
 * @public
 */
export interface CreateAgentSessionOptions {
  /** Latest wired state. Called on every catalog/describe/execute. */
  observe: () => AgentObservation;
  /** Apply a validated mutation to the live table. */
  apply: AgentApply;
  /**
   * Host confirmation. When set, chrome is skipped.
   * When omitted and approval is required, execute returns `approval: "pending"`.
   */
  onApprove?: (
    subject: ApprovalSubject,
    signal?: AbortSignal
  ) => Promise<ApprovalResult>;
  /** Custom governed capabilities registered on this table session. */
  capabilities?: readonly AgentCapabilityDefinition[];
  /**
   * Capability keys the agent may not use on this table.
   *
   * One list, for built-ins and custom definitions alike. It only ever denies:
   * a key the table does not wire stays unavailable whatever this says, and no
   * entry here can enable a forbidden operation. The table's own UI is
   * untouched — denying `edit.cells` to the agent leaves a person editing
   * cells exactly as before.
   */
  excludeCapabilities?: readonly string[];
  /**
   * This table's approval policy for individual capabilities, by key.
   *
   * The same shape a row or bulk action carries. An entry **replaces** the
   * shared policy for that one capability rather than narrowing it: `required`
   * asks on a table that asks for nothing, and `automatic` skips the human on a
   * table that asks for writes. Both directions are deliberate — this is the
   * developer's own answer to "who confirms this", written where the table is
   * configured.
   *
   * It is not the reader's answer. A reader choosing "don't ask again" is
   * `alwaysAllow` plus the approval memory: opt-in per capability, revocable,
   * and reset by a contract change. The two are different permissions and
   * neither stands in for the other — a capability carrying `required` here
   * keeps asking however often the reader waves it through.
   *
   * What it cannot do is make something permitted. Approval decides who
   * confirms an operation, never whether the table offers it: a key the table
   * does not wire, or excludes, stays unavailable whatever this says.
   */
  capabilityApproval?: Readonly<Record<string, ActionAiOptions>>;
  /**
   * Where a capability's progress goes, and `null` when it stops.
   *
   * The `null` closes it: a call that reported progress and then settled has
   * nothing more to say, and a surface left holding the last count would go on
   * showing it beside a finished turn. Without this option the context's
   * `reportProgress` is absent, and a handler that would have called it simply
   * does not — no buffer, no queue, nothing kept for a listener that may never
   * arrive.
   */
  onProgress?: (report: AgentProgress | null) => void;
  /**
   * How many replay results this session keeps. Defaults to 200. Accepted
   * mutations keep their deduplication guarantee for the whole session even
   * after their result is evicted — a replayed key then reports
   * `replay-expired` rather than running the write twice.
   */
  replayCacheSize?: number;
}
