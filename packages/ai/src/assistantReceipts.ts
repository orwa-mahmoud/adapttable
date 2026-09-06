/**
 * What actually happened, told from the results rather than from a flag.
 *
 * `ok: true` is not "it was applied". A governed write can succeed at being
 * proposed, staged, or refused by a human, and every one of those is `ok`.
 * Reporting them as one success is how an assistant ends up telling a reader
 * a change landed that is still sitting unsaved — so the status is read off
 * the payload the session returned, not off the outer flag.
 */
import type { CommitPolicy } from "./keys";
import type {
  ApprovalOutcome,
  ExecuteResult,
  WriteExecuteResult,
} from "./types";

/**
 * How one action ended.
 *
 * - `executed` — the host callback ran.
 * - `staged` — approved and queued on the table's own dirty path; Save is
 *   still the reader's.
 * - `rejected` — a human refused it.
 * - `awaiting-approval` — parked, waiting on a human.
 * - `cancelled` — stopped before it reached the host.
 * - `stale` — the view moved on before it could run.
 * - `failed` — anything else that did not run.
 *
 * @public
 */
export type AssistantReceiptStatus =
  | "executed"
  | "staged"
  | "rejected"
  | "awaiting-approval"
  | "cancelled"
  | "stale"
  | "failed";

/**
 * One line a reader can trust about one action.
 *
 * @public
 */
export interface AssistantReceipt {
  /** Capability that ran, when the caller knows which. */
  readonly capabilityKey?: string;
  /** What became of it. */
  readonly status: AssistantReceiptStatus;
  /** The session's own message, when it failed. */
  readonly message?: string;
  /** Replay key, so a receipt can be matched back to its action. */
  readonly idempotencyKey: string;
}

/** How a whole turn ended. @public */
export type AssistantTurnStatus =
  "applied" | "partial" | "none" | "cancelled" | "failed";

function isWriteResult(value: unknown): value is WriteExecuteResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "applied" in value &&
    "approval" in value
  );
}

function fromApproval(approval: ApprovalOutcome): AssistantReceiptStatus {
  if (approval === "rejected") return "rejected";
  if (approval === "cancelled") return "cancelled";
  if (approval === "pending") return "awaiting-approval";
  return "staged";
}

function failureStatus(code: string | undefined): AssistantReceiptStatus {
  if (code === "revision-mismatch") return "stale";
  if (code === "cancelled") return "cancelled";
  return "failed";
}

/**
 * Read one action's receipt from its result.
 *
 * `commit` is what separates a write that reached the host from one that is
 * sitting on the table's dirty path: the session reports BOTH as applied,
 * because a staging callback is still a host callback. Without the policy,
 * a staged change reads as done, and the reader is told a number changed
 * while the table is showing "1 unsaved row".
 *
 * @param result - What `AgentSession.execute` returned.
 * @param capabilityKey - The key that was executed, when known.
 * @param commit - The table's commit policy, from its manifest.
 * @returns A status a reader can act on, and the session's own message.
 *
 * @public
 */
export function receiptFromResult(
  result: ExecuteResult,
  capabilityKey?: string,
  commit?: CommitPolicy
): AssistantReceipt {
  const base = { capabilityKey, idempotencyKey: result.idempotencyKey };
  if (!result.ok) {
    return {
      ...base,
      status: failureStatus(result.error?.code),
      message: result.error?.message,
    };
  }
  const payload = result.result;
  if (!isWriteResult(payload)) return { ...base, status: "executed" };
  // A write reports itself: applied means a host callback ran, and everything
  // else is decided by what the approval did. Under `commit: "stage"` the
  // callback that ran was the staging one, so the change is not saved yet.
  if (payload.applied) {
    return { ...base, status: commit === "stage" ? "staged" : "executed" };
  }
  return { ...base, status: fromApproval(payload.approval) };
}

/**
 * Read every receipt for one turn.
 *
 * @param results - Results in the order the actions ran.
 * @param keys - Capability keys in the same order, when known.
 * @param commit - The table's commit policy, from its manifest.
 * @returns One receipt per result.
 *
 * @public
 */
export function receiptsFromResults(
  results: readonly ExecuteResult[],
  keys: readonly string[] = [],
  commit?: CommitPolicy
): readonly AssistantReceipt[] {
  return results.map((result, index) =>
    receiptFromResult(result, keys[index], commit)
  );
}

/**
 * Summarize a turn without flattening it into success or failure.
 *
 * A turn where two actions ran and one went stale is `partial` — telling the
 * reader "done" would hide the third, and telling them "failed" would hide
 * the first two.
 *
 * @param receipts - Every receipt for the turn.
 * @returns The turn's status.
 *
 * @public
 */
export function turnStatus(
  receipts: readonly AssistantReceipt[]
): AssistantTurnStatus {
  if (receipts.length === 0) return "none";
  const landed = receipts.filter(
    (receipt) =>
      receipt.status === "executed" ||
      receipt.status === "staged" ||
      receipt.status === "awaiting-approval"
  ).length;
  if (landed === receipts.length) return "applied";
  if (landed > 0) return "partial";
  if (receipts.every((receipt) => receipt.status === "cancelled")) {
    return "cancelled";
  }
  return "failed";
}
