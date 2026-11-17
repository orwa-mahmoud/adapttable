/**
 * Approve: who confirms a governed write, and what their answer allows.
 */
import {
  resolveApproval,
  type ResolvedApproval,
  sharedApproval,
} from "../approvalConfig";
import { ApplyError, isGovernedKind } from "../commands/command";
import type { ApprovalPolicy } from "../keys";
import type {
  AgentCapabilityDefinition,
  AgentObservation,
  ApprovalOutcome,
  ApprovalResult,
  ApprovalSubject,
  CapabilityPlan,
} from "../types";
import type { CreateAgentSessionOptions } from "./options";

function approvalOf(observation: AgentObservation): ApprovalPolicy {
  return observation.approval ?? "writes";
}

/**
 * The policy for one capability: the table's, unless the capability itself
 * overrides it. Presentation is resolved the same way but is the surface's
 * business, not the session's — the session only decides whether to ask.
 */
export function approvalFor(
  definition: AgentCapabilityDefinition,
  observation: AgentObservation
): ResolvedApproval {
  return resolveApproval(
    sharedApproval({
      policy: approvalOf(observation),
      presentation: observation.presentation ?? "widget",
      ...(observation.alwaysAllow
        ? { alwaysAllow: observation.alwaysAllow }
        : {}),
    }),
    definition.ai
  );
}

export function isGoverned(definition: AgentCapabilityDefinition): boolean {
  return isGovernedKind(definition.kind ?? "view");
}

function needsApproval(
  definition: AgentCapabilityDefinition,
  policy: ApprovalPolicy
): boolean {
  if (policy === "never") return false;
  if (policy === "destructive") return definition.kind === "destructive";
  return isGoverned(definition);
}

/**
 * Whether this exact plan may be decided row by row.
 *
 * Computed ONCE, from the captured plan, before the reader is asked — so the
 * offer they are given and the answer they are allowed to give are the same
 * fact. Every condition has to hold:
 *
 * - the plan says its proposals stand alone;
 * - the capability declares that `execute` applies `plan.payload` rather than
 *   its own arguments, because narrowing the plan cannot narrow the arguments;
 * - the payload is an array lined up with the proposals index for index, which
 *   is what lets a refused row be dropped from it.
 *
 * Anything short of all three means the write is offered whole. It is never
 * offered per item and then silently widened back.
 */
export function isDecomposable(
  plan: CapabilityPlan,
  definition: AgentCapabilityDefinition
): boolean {
  if (plan.perItem !== true) return false;
  if ((definition.partial ?? "unsupported") !== "supported") return false;
  if (!Array.isArray(plan.payload)) return false;
  return (plan.payload as readonly unknown[]).length === plan.proposals.length;
}

/** A decision, and which rows it covered when it did not cover all of them. */
export interface ApprovalDecision {
  readonly outcome: ApprovalOutcome;
  /** Approved positions in the plan, when the reader decided row by row. */
  readonly approved?: readonly number[];
  /** Why the reader refused, when they said. */
  readonly reason?: string;
}

/**
 * Read a row-by-row answer, or refuse it.
 *
 * Fails closed on every count. A malformed list is an error, not a filtered
 * list: dropping a bad index and running the rest would apply a set nobody
 * chose. Duplicates are malformed too — a reader decides a row once, and a
 * repeated position means the caller lost track of which rows it was
 * answering about. The surviving positions keep plan order.
 */
function readPositions(
  decision: unknown,
  total: number,
  decomposable: boolean
): readonly number[] {
  if (!decomposable) {
    throw new ApplyError(
      "approval-not-decomposable",
      "this write cannot be approved row by row; answer it whole"
    );
  }
  // The value crossed the host boundary, so its declared type is a claim
  // rather than a fact. Everything below re-establishes it.
  const approved =
    typeof decision === "object" && decision !== null && "approved" in decision
      ? (decision as { readonly approved: unknown }).approved
      : undefined;
  if (!Array.isArray(approved)) {
    throw new ApplyError(
      "approval-invalid",
      "an approval must be a boolean or a list of approved positions"
    );
  }
  const positions: readonly unknown[] = approved;
  const seen = new Set<number>();
  for (const position of positions) {
    if (
      typeof position !== "number" ||
      !Number.isInteger(position) ||
      position < 0 ||
      position >= total
    ) {
      throw new ApplyError(
        "approval-invalid",
        `approved position ${String(position)} is not a row of this plan`
      );
    }
    if (seen.has(position)) {
      throw new ApplyError(
        "approval-invalid",
        `approved position ${String(position)} appears more than once`
      );
    }
    seen.add(position);
  }
  return [...seen].sort((left, right) => left - right);
}

export async function decideApproval(
  definition: AgentCapabilityDefinition,
  observation: AgentObservation,
  subject: ApprovalSubject,
  onApprove:
    ((subject: ApprovalSubject) => Promise<ApprovalResult>) | undefined,
  total: number,
  decomposable: boolean
): Promise<ApprovalDecision> {
  if (!needsApproval(definition, approvalFor(definition, observation).policy)) {
    return { outcome: "not-required" };
  }
  if (!onApprove) return { outcome: "pending" };
  const decision = await onApprove(subject);
  if (typeof decision === "boolean") {
    return { outcome: decision ? "approved" : "rejected" };
  }
  // A stated reason survives whatever the positions turn out to mean, so a
  // partial run can still say why the rest was left out.
  const reason = decision.reason ? { reason: decision.reason } : {};
  const approved = readPositions(decision, total, decomposable);
  if (approved.length === 0) return { outcome: "rejected", ...reason };
  if (approved.length === total) return { outcome: "approved", ...reason };
  return { outcome: "partial", approved, ...reason };
}

/**
 * Narrow a plan to the rows a reader approved.
 *
 * Only ever called for a plan {@link isDecomposable} already accepted, so the
 * payload is known to be an aligned array and both halves can be reduced
 * together. There is no branch here that keeps a payload wider than the
 * proposals: that is the shape which let a receipt say `partial` while the
 * handler received work nobody agreed to.
 */
export function narrowPlan(
  plan: CapabilityPlan,
  approved: readonly number[]
): CapabilityPlan {
  const payload = plan.payload as readonly unknown[];
  return {
    ...plan,
    proposals: approved.map((index) => plan.proposals[index]!),
    payload: approved.map((index) => payload[index]),
  };
}

/** The host's confirmation, refused the moment the call is cancelled. */
export function bindApprove(
  onApprove: CreateAgentSessionOptions["onApprove"] | undefined,
  signal?: AbortSignal
): CreateAgentSessionOptions["onApprove"] | undefined {
  if (!onApprove) return undefined;
  return async (proposal) => {
    if (signal?.aborted) {
      throw new ApplyError("cancelled", "approval cancelled");
    }
    if (!signal) return onApprove(proposal, signal);
    return new Promise<ApprovalResult>((resolve, reject) => {
      const onAbort = () => {
        reject(new ApplyError("cancelled", "approval cancelled"));
      };
      signal.addEventListener("abort", onAbort, { once: true });
      onApprove(proposal, signal).then(
        (allowed) => {
          signal.removeEventListener("abort", onAbort);
          resolve(allowed);
        },
        (error: unknown) => {
          signal.removeEventListener("abort", onAbort);
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      );
    });
  };
}
