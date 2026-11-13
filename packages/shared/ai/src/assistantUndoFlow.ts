/**
 * Per-turn and per-action undo: what a turn moved, and putting it back.
 */

import { type AssistantTransportReply } from "./assistantContracts";
import { publish, viewNow } from "./assistantSnapshot";
import { type AssistantStoreState } from "./assistantState";
import {
  type AssistantUndo,
  planUndo,
  runUndo,
  UNDO_FIELDS_FOR,
} from "./assistantUndo";
import { type AgentContextView } from "./contextSnapshot";
import type { AgentSession, ExecuteResult } from "./types";

/**
 * Work out whether this turn can be put back, and remember how.
 *
 * Compared against the view captured before the turn's calls ran. The
 * revision the plan is pinned to is the one the turn's own calls settled
 * at — the last result's — so anything that moves the table afterwards
 * retires the offer rather than being undone by it.
 */
export function recordUndo(
  s: AssistantStoreState,
  before: AgentContextView | null,
  reply: AssistantTransportReply,
  message: string
): boolean {
  const session = s.live.session;
  const after = viewNow(s);
  const settledAt = reply.results?.at(-1)?.revision;
  if (!session || !before || !after || settledAt === undefined) return false;
  const planned = planUndo(before, after, session, settledAt);
  if ("code" in planned) {
    // Nothing moved, or something moved that no permitted capability can put
    // back. Either way this turn keeps whatever offer was already standing:
    // a turn that changed nothing does not retire the one before it.
    return false;
  }
  s.undoPlan = { message, undo: planned };
  // And one per action, where restoring a field to what it was before the
  // turn is exactly that action and nothing more. It is when one action in
  // the turn owns that field: the turn's opening view is then the view that
  // action ran against.
  //
  // Kept even when only one action moved anything, because the control
  // belongs ON that action. A turn drawing two cards and one loose button
  // above them says nothing about which card the button answers for — and
  // in a turn that re-applied a sort already in place, that is exactly the
  // shape it takes.
  s.actionPlans = new Map();
  const results = reply.results ?? [];
  const changed = (index: number, result: ExecuteResult) => {
    const key = reply.keys?.[index];
    if (!key || !result.ok) return undefined;
    return UNDO_FIELDS_FOR[key];
  };
  // Two actions moving the same field is the case a single before-state
  // cannot answer for. Sort ascending, then descending: the second ran
  // against a view the store never saw, so restoring the turn's opening
  // sort from that card would take the first action back with it. Those
  // cards carry no Undo of their own — the turn's own Undo is the offer
  // that tells the truth about them.
  const owners = new Map<string, number>();
  for (const [index, result] of results.entries()) {
    for (const field of changed(index, result) ?? []) {
      owners.set(field, (owners.get(field) ?? 0) + 1);
    }
  }
  for (const [index, result] of results.entries()) {
    const fields = changed(index, result);
    if (!fields) continue;
    if (fields.some((field) => (owners.get(field) ?? 0) > 1)) continue;
    // A single action owns every change, including query-driven page resets.
    const one =
      results.length === 1
        ? planned
        : planUndo(before, after, session, settledAt, fields);
    if ("code" in one) continue;
    s.actionPlans.set(result.idempotencyKey, one);
  }
  return true;
}

/** Run one plan and report what went wrong, wherever it came from. */
export async function runOneUndo(
  s: AssistantStoreState,
  session: AgentSession,
  undo: AssistantUndo,
  idempotencyKey: string
): Promise<void> {
  try {
    const results = await runUndo(
      session,
      undo,
      idempotencyKey,
      undefined,
      viewNow(s) ?? undefined
    );
    const failed = results.find((result) => !result.ok);
    if (failed) s.error = failed.error?.message ?? "the undo did not finish";
  } catch (cause) {
    s.error = cause instanceof Error ? cause.message : String(cause);
    s.errorCode = undefined;
  }
  publish(s);
}
