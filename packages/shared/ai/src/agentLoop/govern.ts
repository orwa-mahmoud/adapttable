/**
 * Approve, then apply: the one governed path. Built-ins and custom
 * definitions both run here, so a custom `kind: "write"` cannot execute
 * without the same policy, commit-mode, approval and revalidation checks a
 * built-in gets.
 */
import { ApplyError } from "../commands/command";
import {
  BulkFailure,
  isWriteResult,
  writePayload,
} from "../commands/writeResult";
import type {
  AgentCapabilityContext,
  AgentCapabilityDefinition,
  AgentObservation,
  ApprovalOutcome,
  ApprovalSubject,
  CapabilityPlan,
} from "../types";
import {
  approvalFor,
  bindApprove,
  decideApproval,
  isDecomposable,
  isGoverned,
  narrowPlan,
} from "./approval";
import {
  type CallState,
  cancellationGuard,
  executionCallbacks,
} from "./callState";
import { type LoopState, revalidate } from "./validate";

/**
 * Keep a handler's own payload, but make the session's approval decision the
 * authority on any write result it returned.
 */
function decorateWrite(
  payload: unknown,
  plan: CapabilityPlan,
  approval: ApprovalOutcome
): unknown {
  if (!isWriteResult(payload)) return payload;
  if (payload.approval === "cancelled") return payload;
  return {
    ...payload,
    proposals:
      payload.proposals.length > 0 ? payload.proposals : plan.proposals,
    approval,
  };
}

/**
 * A write that stopped at approval, so nothing was applied. Anything else —
 * including a rejected proposal — is a completed, replayable outcome.
 */
export function unfinishedWrite(
  payload: unknown
): "pending" | "cancelled" | undefined {
  if (!isWriteResult(payload) || payload.applied) return undefined;
  if (payload.approval === "pending") return "pending";
  if (payload.approval === "cancelled") return "cancelled";
  return undefined;
}

/** What the reader is asked about: the planned rows, or the operation whole. */
function approvalSubject(
  definition: AgentCapabilityDefinition,
  key: string,
  args: unknown,
  plan: CapabilityPlan,
  decomposable: boolean,
  entry: AgentObservation
): ApprovalSubject {
  const presentation = approvalFor(definition, entry).presentation;
  if (plan.proposals.length > 0) {
    return {
      kind: "rows",
      proposals: plan.proposals,
      perItem: decomposable,
      presentation,
    };
  }
  return {
    kind: "operation",
    capability: key,
    ...(definition.presentation?.title
      ? { title: definition.presentation.title }
      : {}),
    arguments: args ?? {},
    presentation,
  };
}

/** Refuse a governed call this table's write and commit policy rule out. */
function assertWritable(
  definition: AgentCapabilityDefinition,
  key: string,
  entry: AgentObservation
): void {
  if (entry.writePolicy !== "allow") {
    throw new ApplyError(
      "write-denied",
      `writes are not permitted on this table`
    );
  }
  if (
    (entry.commit ?? "stage") === "stage" &&
    (definition.staging ?? "unsupported") !== "supported"
  ) {
    throw new ApplyError(
      "commit-incompatible",
      `${key} requires commit: immediate on this table`
    );
  }
}

export async function runCapability(
  state: LoopState,
  definition: AgentCapabilityDefinition,
  key: string,
  args: unknown,
  entry: AgentObservation,
  signal: AbortSignal | undefined,
  call: CallState
): Promise<unknown> {
  const approve = bindApprove(state.options.onApprove, signal);
  const throwIfCancelled = cancellationGuard(signal);
  const baseContext: AgentCapabilityContext = {
    observation: entry,
    apply: call.apply,
    observe: call.observe,
    onApprove: approve,
    signal,
    throwIfCancelled,
    ...executionCallbacks(call),
  };
  // The reserved execution is starting for real.
  throwIfCancelled();
  if (!isGoverned(definition)) {
    return definition.execute(baseContext, args);
  }

  assertWritable(definition, key, entry);
  const commit = entry.commit ?? "stage";
  const plan: CapabilityPlan = definition.plan
    ? await definition.plan(baseContext, args)
    : { proposals: [] };
  // Planning awaited host code, which is long enough to be cancelled in.
  throwIfCancelled();
  revalidate(state, key, entry, true);

  // One fact, read from the captured plan, used for both the offer the
  // reader is given and the answer they are allowed to give back.
  const decomposable = isDecomposable(plan, definition);
  const decision = await decideApproval(
    definition,
    entry,
    approvalSubject(definition, key, args, plan, decomposable, entry),
    approve,
    plan.proposals.length,
    decomposable
  );
  const approval = decision.outcome;
  if (approval === "pending" || approval === "rejected") {
    return writePayload(
      plan.proposals,
      false,
      approval,
      undefined,
      decision.reason
    );
  }
  throwIfCancelled();
  revalidate(state, key, entry, true);

  // What the handler sees is what the reader agreed to, never the whole
  // plan with a note attached.
  const approvedPlan = decision.approved
    ? narrowPlan(plan, decision.approved)
    : plan;
  const context: AgentCapabilityContext = {
    ...baseContext,
    plan: approvedPlan,
    commit,
    ...(decision.approved ? { approvedIndexes: decision.approved } : {}),
  };
  // The last moment before the handler can touch the host. Nothing has been
  // written yet, so a cancellation here leaves the key free to be retried.
  throwIfCancelled();
  call.invokedWrite = true;
  try {
    const payload = await definition.execute(context, args);
    return decorateWrite(payload, approvedPlan, approval);
  } catch (error) {
    if (error instanceof BulkFailure) {
      return writePayload(
        approvedPlan.proposals,
        false,
        approval,
        error.results
      );
    }
    throw error;
  }
}
