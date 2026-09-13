/**
 * What a reader is shown when an agent write waits on them.
 *
 * These are presentation contracts, not behaviour: what a proposal looks like,
 * what a decision can be, and the callbacks a surface calls. They live in core
 * because both sides need them and neither should own the other — an adapter
 * drawing the review strip must not import an AI runtime to name its props,
 * and the AI package must not import React to name what it publishes.
 *
 * The transaction that produces these values, and everything that decides
 * whether a human is asked at all, is `@adapttable/ai`'s.
 */
import type { ApprovalPresentation } from "../types";

/**
 * Live pending-approval state published by the optional agent feature.
 *
 * Adapters read this and fill {@link AGENT_APPROVAL}. The optional AI
 * package stays out of the adapter graph.
 *
 * @public
 */
export interface AgentApprovalPending {
  /**
   * Proposed writes waiting for a human decision.
   *
   * Empty when the write names no rows — see {@link operation}.
   */
  readonly proposals: readonly AgentApprovalProposal[];
  /**
   * The write, when it is one operation rather than a set of rows.
   *
   * A backend that updates every matching row server-side proposes nothing
   * per row: there is one thing to agree to, and per-row controls would be
   * asking about rows nobody enumerated.
   */
  readonly operation?: AgentApprovalOperation;
  /** What the reader has decided so far, one entry per proposal. */
  readonly decisions: readonly AgentApprovalDecision[];
  /**
   * Where this approval is meant to be reviewed, resolved from the table's
   * shared configuration and the action's own override.
   *
   * Exactly one surface draws the decision controls. The others may say an
   * approval is waiting and where, but must not offer a second set of
   * buttons for one decision.
   */
  readonly presentation: ApprovalPresentation;
  /** Confirm everything still undecided and continue the host write path. */
  readonly approve: () => void;
  /**
   * Refuse everything still undecided, optionally saying why.
   *
   * The reason reaches the receipt and the model-visible result, so the
   * assistant can answer with it rather than reporting a bare refusal and
   * making the reader explain themselves a second time.
   */
  readonly reject: (reason?: string) => void;
  /**
   * Approve this, and stop asking about this capability for the session.
   *
   * Absent when the write is not one the reader may settle that way — a
   * destructive capability, an action whose own configuration demands a
   * human every time, or a write that enumerates rows rather than naming one
   * operation. A surface offers the control only when this is present, rather
   * than drawing a button that refuses when pressed.
   */
  readonly alwaysAllow?: () => void;
  /**
   * Decide one proposal by its position.
   *
   * Absent when the write cannot be split — a row move is two lines
   * describing one indivisible change. Surfaces that offer per-row controls
   * must hide them when this is missing rather than draw dead buttons.
   */
  readonly decideAt?: (index: number, approved: boolean) => void;
}

/** What a reader has decided about one proposal. @public */
export type AgentApprovalDecision = "pending" | "approved" | "rejected";

/**
 * A write that acts on the table as a whole rather than on named rows.
 *
 * @public
 */
export interface AgentApprovalOperation {
  /** Capability key the write runs. */
  readonly capability: string;
  /** Reader-facing name, when the capability declared one. */
  readonly title?: string;
  /** Arguments the capability was called with. */
  readonly arguments: unknown;
}

/**
 * One proposed change the reader is asked to confirm.
 *
 * @public
 */
export interface AgentApprovalProposal {
  /** Stable row identity. */
  readonly rowKey: string;
  /** Column being written, when the proposal is a cell edit. */
  readonly column?: string;
  /**
   * Value before the write, as the reader's own view can show it.
   *
   * Resolved from the table on screen rather than from anything the model
   * was given, so a row the current filter hides still reads correctly for
   * the person approving it. Absent when the table cannot show one — see
   * {@link beforeUnavailable}, which is how a value nobody could look up is
   * told apart from a cell that is genuinely empty.
   */
  readonly before?: unknown;
  /**
   * True when no before-value could be resolved at all.
   *
   * A blank cell and a cell nobody can read are different facts, and a
   * reader deciding whether to approve a write deserves to know which one
   * they are looking at. Never guess a value to fill this in.
   */
  readonly beforeUnavailable?: boolean;
  /**
   * The before-value as the column itself writes it.
   *
   * Present only when the column says how its values read. A surface prefers
   * it over {@link before}: a table showing `$170k` everywhere else must not
   * ask the reader to agree to `170`.
   */
  readonly beforeText?: string;
  /** Value after the write. */
  readonly after?: unknown;
  /** The after-value as the column itself writes it. See {@link beforeText}. */
  readonly afterText?: string;
  /** Reader-facing name for the row, when the table can supply one. */
  readonly rowLabel?: string;
  /**
   * Reader-facing name for the column, when the table can supply one.
   *
   * A column id is a developer key. Printing it in a sentence the reader is
   * asked to agree to leaks the wrong vocabulary — and never translates.
   */
  readonly columnLabel?: string;
}
