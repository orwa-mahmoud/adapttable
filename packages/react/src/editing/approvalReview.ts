/**
 * What a pending approval looks like to a reader, independent of where it
 * is drawn.
 *
 * Three surfaces render an approval — the assistant window, a strip above
 * the table, a modal — and exactly one of them is active at a time. They
 * differ in chrome, never in what they say: the same totals, the same first
 * three changes, the same labels on the summary controls. Computing that
 * once is what keeps them from drifting into three slightly different
 * accounts of the same write.
 *
 * Nothing here renders. It is the model the surfaces read.
 */
import { defaultLabels, type TableLabels } from "@adapttable/core";

import type {
  AgentApprovalDecision,
  AgentApprovalOperation,
  AgentApprovalPending,
  AgentApprovalProposal,
} from "./AgentApprovalChrome";

/** How many changes a review shows before asking to open the full list. */
export const APPROVAL_PREVIEW_LIMIT = 3;

/** One change in a review, with the decision taken about it. @public */
export interface ApprovalReviewItem {
  /** Position in the plan — what a decision is addressed to. */
  readonly index: number;
  /** Stable identity for a list key, distinct even for two edits to one row. */
  readonly id: string;
  /** The change itself. */
  readonly proposal: AgentApprovalProposal;
  /** What the reader has decided about it so far. */
  readonly decision: AgentApprovalDecision;
}

/** A pending approval, ready to draw. @public */
export interface ApprovalReview {
  /** Number of proposed changes. */
  readonly changes: number;
  /**
   * Number of DISTINCT rows those changes touch. Three edits to one row are
   * three changes and one row, and saying "3 rows" would overstate the blast
   * radius of the write.
   */
  readonly rows: number;
  /** Still undecided. */
  readonly pending: number;
  /** Decided yes so far. */
  readonly approved: number;
  /** Decided no so far. */
  readonly rejected: number;
  /** Whether any single change has been decided on its own. */
  readonly started: boolean;
  /** Every change, in plan order. */
  readonly items: readonly ApprovalReviewItem[];
  /** The first few, for a surface that has not been expanded. */
  readonly preview: readonly ApprovalReviewItem[];
  /** True when the preview is not the whole list. */
  readonly truncated: boolean;
  /** The operation, when the write named no rows at all. */
  readonly operation?: AgentApprovalOperation;
  /** Whether the reader may decide changes one at a time. */
  readonly perItem: boolean;
  /** Localized headline. */
  readonly summary: string;
  /** Localized running tally, once a decision has been taken. */
  readonly tally: string | undefined;
  /** Label for the control that approves what is left. */
  readonly approveLabel: string;
  /** Label for the control that rejects what is left. */
  readonly rejectLabel: string;
  /** Label for the control that opens the full list, when there is more. */
  readonly reviewAllLabel: string | undefined;
}

/**
 * Read a pending approval into the model every surface draws from.
 *
 * @param pending - The live approval, or nothing.
 * @param labels - Table labels; falls back to the built-in English.
 * @returns The review, or `null` when nothing is pending.
 *
 * @public
 */

/** What the control that answers the whole write is called. */
function approveWord(
  labels: TableLabels | undefined,
  count: number,
  started: boolean
): string {
  if (started) return labels?.approveRemainingProposals ?? "Approve remaining";
  if (count <= 1) return labels?.approveProposal ?? "Approve";
  return labels?.approveAllProposals ?? "Approve all";
}

/** The same, for refusing it. */
function rejectWord(
  labels: TableLabels | undefined,
  count: number,
  started: boolean
): string {
  if (started) return labels?.rejectRemainingProposals ?? "Reject remaining";
  if (count <= 1) return labels?.rejectProposal ?? "Reject";
  return labels?.rejectAllProposals ?? "Reject all";
}

export function approvalReview(
  pending: AgentApprovalPending | null | undefined,
  labels: TableLabels | undefined
): ApprovalReview | null {
  if (!pending) return null;
  const items = pending.proposals.map((proposal, index) => ({
    index,
    // Two edits to one row share a row key, so the column and the position
    // are both part of the identity.
    id: `${proposal.rowKey}:${proposal.column ?? ""}:${String(index)}`,
    proposal,
    decision: pending.decisions[index] ?? "pending",
  }));
  const rows = new Set(items.map((item) => item.proposal.rowKey)).size;
  const approved = items.filter((item) => item.decision === "approved").length;
  const rejected = items.filter((item) => item.decision === "rejected").length;
  const pendingCount = items.length - approved - rejected;
  const started = approved + rejected > 0;
  const preview = items.slice(0, APPROVAL_PREVIEW_LIMIT);
  // Falling back to the built-in labels rather than restating them: a second
  // copy of the English is a second place for it to drift.
  const text = { ...defaultLabels, ...labels };

  return {
    changes: items.length,
    rows,
    pending: pendingCount,
    approved,
    rejected,
    started,
    items,
    preview,
    truncated: items.length > preview.length,
    ...(pending.operation ? { operation: pending.operation } : {}),
    perItem: pending.decideAt !== undefined,
    // A write that names an operation enumerates no rows, and counting them
    // would head the strip "0 proposed changes" over a change that is about
    // to happen. It is one change: the operation, which the block below it
    // names.
    summary: text.proposalSummary({
      changes: pending.operation ? 1 : items.length,
      rows,
    }),
    tally: started
      ? (
          labels?.proposalTally ??
          (({ pending: left, approved: yes, rejected: no }) =>
            `${String(yes)} approved · ${String(no)} rejected · ${String(left)} left`)
        )({
          pending: pendingCount,
          approved,
          rejected,
        })
      : undefined,
    // "Approve all" is a promise the control cannot keep once a row has been
    // refused: that row stays refused. The label changes with the behaviour —
    // and "all" of one change is a word that describes nothing, so a single
    // proposal is approved or rejected, full stop.
    approveLabel: approveWord(labels, items.length, started),
    rejectLabel: rejectWord(labels, items.length, started),
    reviewAllLabel:
      items.length > preview.length
        ? (
            labels?.reviewAllProposals ??
            ((count) => `Review all ${String(count)} changes`)
          )(items.length)
        : undefined,
  };
}
