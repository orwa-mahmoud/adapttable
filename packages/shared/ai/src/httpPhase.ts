/** What one phase of an HTTP turn ran, and whether the turn moves on. */
import type { AssistantReceiptSubject } from "./assistantReceipts";
import { subjectFor } from "./assistantSubjects";
import {
  type createTurnExecution,
  type HttpPhaseContext,
} from "./httpExecution";
import { MAX_CONTINUATIONS, MAX_REPAIRS } from "./httpLimits";
import { type FinalizedCall } from "./httpTurn";
import type { AgentHttpToolResult } from "./httpTypes";
import { type AgentHttpUnresolved } from "./httpWire";
import type { AgentManifest, ExecuteResult } from "./types";

export interface HiddenReceipts {
  readonly results: readonly ExecuteResult[];
  readonly keys: readonly string[];
  readonly subjects: readonly (AssistantReceiptSubject | undefined)[];
}

/**
 * What to do when this phase asked for the same calls as the one before.
 *
 * A repair that comes back unchanged is not a second apply. Hand the
 * refusal back until the two retries are spent, then show it.
 */
export function samePlanAfter(
  signature: string | undefined,
  lastPlan: string | undefined,
  hidden: HiddenReceipts | undefined,
  repairs: number
): "retry" | "show" | "repeat" | undefined {
  if (signature === undefined || signature !== lastPlan) return undefined;
  if (hidden && repairs < MAX_REPAIRS) return "retry";
  return hidden ? "show" : "repeat";
}

/** Landed receipts for the reader, and refusals still going back to the model. */
export function receiptsForPhase(
  ran: readonly ExecuteResult[],
  plan: readonly FinalizedCall[],
  repaired: boolean,
  columns: AgentManifest["columns"]
): { readonly shown: HiddenReceipts; readonly hidden?: HiddenReceipts } {
  const tagged = ran.map((entry, index) => ({ entry, index }));
  const visible = repaired ? tagged.filter(({ entry }) => entry.ok) : tagged;
  const held = repaired ? tagged.filter(({ entry }) => !entry.ok) : [];
  const toReceipts = (
    items: readonly { entry: ExecuteResult; index: number }[]
  ): HiddenReceipts => ({
    results: items.map(({ entry }) => entry),
    keys: items.map(({ index }) => plan[index]?.key ?? ""),
    subjects: items.map(({ entry, index }) => {
      const call = plan[index];
      return call ? subjectFor(call.key, call.args, entry, columns) : undefined;
    }),
  });
  return {
    shown: toReceipts(visible),
    ...(held.length > 0 ? { hidden: toReceipts(held) } : {}),
  };
}

/** Later answers win, and a result is only ever carried once per call id. */
export function mergeToolResults(
  current: readonly AgentHttpToolResult[] | undefined,
  incoming: readonly AgentHttpToolResult[]
): readonly AgentHttpToolResult[] {
  const next = [...(current ?? [])];
  const indexById = new Map(next.map((entry, index) => [entry.id, index]));
  for (const entry of incoming) {
    const existing = indexById.get(entry.id);
    if (existing === undefined) {
      indexById.set(entry.id, next.length);
      next.push(entry);
    } else {
      next[existing] = entry;
    }
  }
  return next;
}

/** One executed call, shaped as the tool result its caller is waiting for. */
/**
 * Whether this phase was refused over how a call was written.
 *
 * A sibling that already landed stays applied. The refusal still names what
 * the capability takes, so the next plan can send that instead of showing
 * the guess to the reader.
 */
function refusedOverArguments(ran: readonly ExecuteResult[]): boolean {
  if (ran.length === 0) return false;
  return ran.some((entry) => entry.error?.code === "invalid-arguments");
}

/**
 * What the next phase of this turn carries, or nothing when it ends here.
 *
 * The receipts it hands forward are the ones the calls actually produced, so
 * a dependent phase reasons over what happened rather than over a claim that
 * it did.
 */
export function advanceTurn(input: {
  readonly allowed: boolean;
  readonly asked: boolean;
  readonly halted: AgentHttpUnresolved | undefined;
  readonly ran: readonly ExecuteResult[];
  readonly plan: readonly FinalizedCall[];
  readonly phaseId: number;
  readonly repairsLeft: number;
}): {
  readonly stop: boolean;
  readonly phaseId: number;
  readonly repaired: boolean;
  readonly toolResults: readonly AgentHttpToolResult[];
  readonly unresolved?: AgentHttpUnresolved;
} {
  const phaseId = input.phaseId + 1;
  const toolResults = input.plan.map((call, index) =>
    receiptResult(call, input.ran[index])
  );
  const stopped = { stop: true, phaseId, repaired: false, toolResults };
  if (input.halted) return { ...stopped, unresolved: input.halted };
  const reason = nextPhaseReason({
    allowed: input.allowed,
    asked: input.asked,
    ran: input.ran,
    planned: input.plan.length,
    repairsLeft: input.repairsLeft,
  });
  if (!reason) return stopped;
  if (phaseId > MAX_CONTINUATIONS) {
    return {
      ...stopped,
      unresolved: {
        code: "continuation-exhausted",
        message: `the backend asked to continue more than ${String(MAX_CONTINUATIONS)} times`,
        pending: [],
      },
    };
  }
  return { stop: false, phaseId, repaired: reason === "repair", toolResults };
}

/**
 * What a phase asked the table to do, as one comparable value.
 *
 * `undefined` for an empty plan: a phase that ran nothing is not a repeat of
 * the phase before it, whatever that one did.
 */
export function planSignature(
  plan: readonly FinalizedCall[]
): string | undefined {
  if (plan.length === 0) return undefined;
  return JSON.stringify(plan.map((call) => [call.key, call.args]));
}

/**
 * Run one phase's plan inside its own bound, and say how it settled.
 *
 * The phase opens before the first call and closes after the last, so a
 * capability that reaches the table outside it is refused rather than
 * silently attributed to this turn.
 */
export async function runPhasePlan(
  execution: ReturnType<typeof createTurnExecution>,
  pass: {
    readonly phase: {
      begin: () => void;
      settle: (how: "cancelled" | "settled") => void;
    };
    readonly context: HttpPhaseContext;
    readonly plan: readonly FinalizedCall[];
  },
  signal: AbortSignal | undefined
): Promise<readonly ExecuteResult[]> {
  pass.phase.begin();
  const ran = await execution.execute(
    { context: pass.context, actions: pass.plan },
    signal
  );
  pass.phase.settle(
    ran.some((entry) => entry.error?.code === "cancelled")
      ? "cancelled"
      : "settled"
  );
  return ran;
}

/**
 * Why this turn runs another phase, or nothing when it stops here.
 *
 * `continue` is the backend asking to be told what its calls produced.
 * `repair` is this client's own: a call refused over its arguments is
 * handed back so the model can send what the table takes, even when a
 * sibling already landed. A backend that never asks to continue still gets it.
 */
function nextPhaseReason(input: {
  readonly allowed: boolean;
  readonly asked: boolean;
  readonly ran: readonly ExecuteResult[];
  readonly planned: number;
  readonly repairsLeft: number;
}): "continue" | "repair" | undefined {
  if (!input.allowed) return undefined;
  if (input.asked && input.planned > 0) return "continue";
  if (input.repairsLeft > 0 && refusedOverArguments(input.ran)) return "repair";
  return undefined;
}

function receiptResult(
  call: FinalizedCall,
  result: ExecuteResult | undefined
): AgentHttpToolResult {
  if (!result) {
    return {
      id: call.id,
      error: { code: "not-run", message: "the call was never reached" },
    };
  }
  if (!result.ok) {
    return {
      id: call.id,
      error: {
        code: result.error?.code ?? "failed",
        message: result.error?.message ?? "the call failed",
      },
    };
  }
  return {
    id: call.id,
    result: { ok: true, revision: result.revision, result: result.result },
  };
}
