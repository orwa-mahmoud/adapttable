/** What a governed write reports, and how a bulk write runs row by row. */
import { errorMessage } from "../errorMessage";
import type {
  ApprovalOutcome,
  WriteExecuteResult,
  WriteProposal,
  WriteRowResult,
} from "../types";
import { ApplyError } from "./command";

export function writePayload(
  proposals: readonly WriteProposal[],
  applied: boolean,
  approval: ApprovalOutcome,
  results?: readonly WriteRowResult[],
  approvalReason?: string
): WriteExecuteResult {
  return {
    proposals,
    applied,
    approval,
    results,
    ...(approvalReason ? { approvalReason } : {}),
  };
}

export function isWriteResult(value: unknown): value is WriteExecuteResult {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    Array.isArray(record.proposals) &&
    typeof record.applied === "boolean" &&
    typeof record.approval === "string"
  );
}

/** A bulk write in which some rows failed; the session reports each row. */
export class BulkFailure extends Error {
  readonly results: readonly WriteRowResult[];
  constructor(results: readonly WriteRowResult[]) {
    super("bulk write reported per-row failures");
    this.results = results;
  }
}

/**
 * Write each item, in order, and stop where a cancellation lands.
 *
 * Rows already written stay written and stay in the results — the host was
 * called and that cannot be taken back. The rows after them are never
 * attempted, and the partial outcome is what the caller is told about, so a
 * retry of the same idempotency key replays it rather than writing twice.
 */
export async function applyEach<T extends { rowKey: string; column?: string }>(
  items: readonly T[],
  write: (item: T) => Promise<void>,
  throwIfCancelled: () => void
): Promise<{ applied: boolean; results: WriteRowResult[] }> {
  const results: WriteRowResult[] = [];
  for (const item of items) {
    try {
      throwIfCancelled();
      await write(item);
      results.push({ rowKey: item.rowKey, column: item.column, ok: true });
    } catch (error) {
      const message = errorMessage(error);
      const code = error instanceof ApplyError ? error.code : "apply-failed";
      results.push({
        rowKey: item.rowKey,
        column: item.column,
        ok: false,
        error: { code, message },
      });
    }
  }
  const applied = results.every((entry) => entry.ok);
  if (!applied) throw new BulkFailure(results);
  return { applied, results };
}
