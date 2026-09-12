/**
 * One approval, what the reader has decided about it, and how it settles.
 *
 * This was React's, and none of it is about React. Whether a click lands on
 * the approval it was drawn for, which rows an "Approve" covers, and what a
 * row nobody answered defaults to are decisions any binding has to make the
 * same way — a second framework re-implementing them would be a second set of
 * answers to the same question, and only one of them would get fixed.
 *
 * The shape stays a value with pure reducers rather than a mutable object, for
 * the reason the React version already gives: an approval and its decisions
 * are born together and die together. Holding them separately left a frame
 * where a new write's proposals sat beside the previous write's decisions, and
 * a click in that frame decided the wrong rows. `id` is what makes a control
 * trustworthy: every handler closes over the id it was made for and does
 * nothing once the open transaction has moved on.
 *
 * Nothing here renders, and nothing here decides whether a human is asked —
 * that is the session's, and {@link approvalMemory} only ever answers for a
 * capability the policy was already going to ask about.
 */
import type {
  AgentApprovalDecision,
  AgentApprovalOperation,
  AgentApprovalProposal,
  ApprovalPresentation,
} from "@adapttable/core";

import type { ApprovalResult } from "./types";

/** The write waiting on a reader, and the call it will settle. */
export interface PendingApproval {
  /** Proposed writes, in plan order. Empty for a whole-table operation. */
  readonly proposals: readonly AgentApprovalProposal[];
  /** The write, when it is one operation rather than a set of rows. */
  readonly operation?: AgentApprovalOperation;
  /** Whether the reader may decide the rows one at a time. */
  readonly perItem: boolean;
  /**
   * Capability key this write runs, when the subject names one.
   *
   * A row-enumerating write does not: the session has already resolved the
   * policy for it, and approval memory only ever answers about a whole
   * operation the reader agreed to stop being asked about.
   */
  readonly capability?: string;
  /** Settles the waiting `execute`. Later calls are ignored. */
  readonly resolve: (result: ApprovalResult) => void;
}

/** An open approval and everything decided about it so far. */
export interface ApprovalTransaction {
  /** Identity a control closes over, so it cannot answer a later approval. */
  readonly id: number;
  readonly pending: PendingApproval;
  readonly decisions: readonly AgentApprovalDecision[];
  /** Where this write is reviewed, frozen with the transaction. */
  readonly presentation: ApprovalPresentation;
}

/** Open a transaction with every row still undecided. */
export function openTransaction(
  id: number,
  pending: PendingApproval,
  presentation: ApprovalPresentation
): ApprovalTransaction {
  return {
    id,
    pending,
    presentation,
    decisions: pending.proposals.map(() => "pending" as const),
  };
}

/**
 * Record one decision, or refuse to.
 *
 * Pure, so a replayed render cannot turn one click into two answers. Three
 * things make it a no-op: the open transaction is not the one this control was
 * made for, the position is not a row of that plan, or the decision is already
 * what it would set.
 */
export function recordDecision(
  current: ApprovalTransaction | null,
  id: number,
  index: number,
  approved: boolean
): ApprovalTransaction | null {
  if (current?.id !== id) return current ?? null;
  if (!Number.isInteger(index)) return current;
  if (index < 0 || index >= current.decisions.length) return current;
  const next: AgentApprovalDecision = approved ? "approved" : "rejected";
  if (current.decisions[index] === next) return current;
  const decisions = [...current.decisions];
  decisions[index] = next;
  return { ...current, decisions };
}

/** Clear the open transaction, but only if it is still this one. */
export function closeTransaction(
  entry: PendingApproval
): (current: ApprovalTransaction | null) => ApprovalTransaction | null {
  return (current) => (current?.pending === entry ? null : current);
}

/**
 * Settle an approval from what the reader decided.
 *
 * Undecided rows take the fallback, so "Approve" means the ones nobody has
 * answered yet and a row already refused stays refused. The result is always
 * the position list: whether that reads as approved, partial or rejected is
 * the session's judgement, made in one place rather than two.
 */
export function settleDecisions(
  decisions: readonly AgentApprovalDecision[],
  fallback: AgentApprovalDecision
): { readonly approved: readonly number[] } {
  const approved: number[] = [];
  decisions.forEach((decision, index) => {
    const settled = decision === "pending" ? fallback : decision;
    if (settled === "approved") approved.push(index);
  });
  return { approved };
}

/**
 * Capabilities the reader has said not to ask about again this session.
 *
 * Deliberately small and deliberately forgetful. It is consulted only after
 * the policy has already decided a human would be asked, so it can never turn
 * `approval: "never"` into a write nobody saw. It never answers for a
 * destructive capability, and it never answers for an action whose own
 * override demands a human — an always-ask action stays always-ask however
 * many times it has been approved. And it clears whenever the contract
 * version moves, because "allow this" was said about a table that no longer
 * exists in that shape.
 */
export function createApprovalMemory(): {
  /** Whether this capability may skip the human, under this contract. */
  readonly allows: (capability: string, contractVersion: string) => boolean;
  /** Remember the reader's "don't ask again" for this capability. */
  readonly remember: (capability: string, contractVersion: string) => void;
  /** Forget everything. */
  readonly clear: () => void;
} {
  let version: string | undefined;
  let allowed = new Set<string>();

  const sync = (contractVersion: string): void => {
    if (version === contractVersion) return;
    version = contractVersion;
    allowed = new Set<string>();
  };

  return {
    allows: (capability, contractVersion) => {
      sync(contractVersion);
      return allowed.has(capability);
    },
    remember: (capability, contractVersion) => {
      sync(contractVersion);
      allowed.add(capability);
    },
    clear: () => {
      allowed = new Set<string>();
      version = undefined;
    },
  };
}
