/**
 * The phase reducer and the pending plan behind one user send.
 *
 * A backend that asks a question and proposes work in the same breath is
 * ordinary: "describe edit.cells, and meanwhile I intend to set this filter."
 * Collecting the proposals of every round and running the union at the end
 * turned a model that repeated itself into two writes, because each round's
 * copy arrived with a new replay key and the session had nothing to recognise.
 *
 * So a round does not add to a plan, it *is* the plan: a reply while the phase
 * is still discovering replaces what was proposed before it, and only the
 * reply that stops asking finalizes anything. Finalizing is also where replay
 * identity is minted, from the table, the turn, the phase and the call's
 * position — never from the model's own string, and never from the arguments,
 * which would both make two deliberately identical actions collide and put
 * private values in a key that travels. Two identical actions in one plan sit
 * at different positions and stay two writes; the same plan delivered twice
 * mints the same keys and stays one.
 *
 * Nothing here talks to a model, parses prose or performs I/O. It decides what
 * the turn is asking for, what it will run, and under which identity.
 */
import type { AgentHttpQuestion, AgentHttpToolCall } from "./httpTypes";

/**
 * Where one phase of a turn has got to.
 *
 * `discovering` is asking; `awaiting-user` is asking a person; `ready` has a
 * finalized plan; `executing` is running it; `settled`, `cancelled` and
 * `failed` are terminal.
 */
export type PhaseState =
  | "discovering"
  | "awaiting-user"
  | "ready"
  | "executing"
  | "settled"
  | "cancelled"
  | "failed";

/** The two tool names that are questions rather than table commands. */
export const DESCRIBE_TOOL = "describe";
export const READ_TOOL = "read";

/** Whether this call asks the frontend something rather than commanding it. */
export function isQuestionTool(name: string): boolean {
  return name === DESCRIBE_TOOL || name === READ_TOOL;
}

/** One planned table command, with the identity it will execute under. */
export interface FinalizedCall {
  /** Wire correlation handle the backend used for this call. */
  readonly id: string;
  /** Catalog key. */
  readonly key: string;
  /** Arguments for that key. */
  readonly args?: unknown;
  /** Host-derived replay identity. */
  readonly idempotencyKey: string;
  /** Revision the backend named for itself, when it named one. */
  readonly expectedRevision?: number;
}

/** What the reducer wants the caller to do next. */
export type PhaseOutcome =
  | {
      /** Answer these, then send the results back. */
      readonly kind: "questions";
      readonly questions: readonly AgentHttpToolCall[];
    }
  | {
      /** Put this to the reader, then send the answer back. */
      readonly kind: "ask-user";
      readonly question: AgentHttpQuestion;
    }
  | {
      /** Nothing outstanding: run this. */
      readonly kind: "ready";
      readonly plan: readonly FinalizedCall[];
    };

/** A reply the reducer can read, narrowed to what it decides on. */
export interface PhaseReply {
  readonly toolCalls?: readonly AgentHttpToolCall[];
  readonly askUser?: AgentHttpQuestion;
}

/** Structured refusal from the reducer, with a stable machine code. @public */
export class AgentTurnError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "AgentTurnError";
    this.code = code;
  }
}

/**
 * A replay identity that cannot be confused with another call's.
 *
 * The parts are structured rather than joined with a separator, so a table id
 * containing the separator cannot spell another table's key. The arguments are
 * deliberately absent: a key travels, and the position already distinguishes
 * two deliberately identical commands.
 */
function callIdentity(
  tableId: string,
  turnId: string,
  phaseId: number,
  index: number
): string {
  return `http-call:${JSON.stringify({ tableId, turnId, phaseId, index })}`;
}

/** The finalized plan's shape, for recognising the same plan delivered twice. */
function planFingerprint(plan: readonly FinalizedCall[]): string {
  return JSON.stringify(
    plan.map((call) => [call.key, call.args ?? {}, call.expectedRevision])
  );
}

function assertUniqueIds(calls: readonly AgentHttpToolCall[]): void {
  const seen = new Set<string>();
  for (const call of calls) {
    if (seen.has(call.id)) {
      throw new AgentTurnError(
        "duplicate-call-id",
        `two tool calls share the id "${call.id}" in one reply`
      );
    }
    seen.add(call.id);
  }
}

/**
 * The pending plan and state of one phase.
 *
 * One instance per phase; a dependent continuation starts a new one, which is
 * what keeps its replay identities distinct from the phase it depends on.
 */
export function createPhasePlan(context: {
  readonly tableId: string;
  readonly turnId: string;
  readonly phaseId: number;
}): {
  readonly state: () => PhaseState;
  /** The commands proposed so far, before anything is finalized. */
  readonly pending: () => readonly AgentHttpToolCall[];
  readonly absorb: (reply: PhaseReply) => PhaseOutcome;
  readonly finalized: () => readonly FinalizedCall[];
  readonly begin: () => void;
  readonly settle: (state: "settled" | "cancelled" | "failed") => void;
} {
  let state: PhaseState = "discovering";
  let pending: readonly AgentHttpToolCall[] = [];
  let plan: readonly FinalizedCall[] = [];
  let fingerprint: string | undefined;

  const finalize = (
    calls: readonly AgentHttpToolCall[]
  ): readonly FinalizedCall[] => {
    const next = calls.map((call, index) => ({
      id: call.id,
      key: call.name,
      args: call.args,
      idempotencyKey: callIdentity(
        context.tableId,
        context.turnId,
        context.phaseId,
        index
      ),
      ...(call.expectedRevision === undefined
        ? {}
        : { expectedRevision: call.expectedRevision }),
    }));
    const nextFingerprint = planFingerprint(next);
    if (fingerprint !== undefined && fingerprint !== nextFingerprint) {
      // Same phase, same identities, different work. Running it would write
      // under keys the first delivery already claimed.
      throw new AgentTurnError(
        "plan-conflict",
        `phase ${String(context.phaseId)} was already finalized with different calls`
      );
    }
    fingerprint = nextFingerprint;
    plan = next;
    // A redelivery must not rewind a phase that is already running or done.
    if (state !== "executing" && state !== "settled") state = "ready";
    return plan;
  };

  return {
    state: () => state,
    pending: () => pending,
    finalized: () => plan,
    // The machine only ever moves forward. A caller that runs an empty plan
    // from a phase which already failed must not rewind it to executing, and
    // nothing reopens a terminal phase.
    begin: () => {
      if (state === "ready") state = "executing";
    },
    settle: (next) => {
      if (state !== "settled" && state !== "cancelled" && state !== "failed") {
        state = next;
      }
    },
    absorb: (reply) => {
      const calls = reply.toolCalls ?? [];
      assertUniqueIds(calls);
      const questions = calls.filter((call) => isQuestionTool(call.name));
      const commands = calls.filter((call) => !isQuestionTool(call.name));

      if (state === "ready" || state === "executing" || state === "settled") {
        // A finalized phase is closed to new work. An identical redelivery is
        // the retry it looks like, and answering it with the same plan is what
        // makes the retry safe; anything else is a conflict.
        // Checked before anything is kept, so a refused redelivery leaves the
        // phase exactly as the accepted one left it.
        if (commands.length > 0)
          return { kind: "ready", plan: finalize(commands) };
        return { kind: "ready", plan };
      }

      // A reply while the phase is still discovering REPLACES the proposal.
      // Appending is what turned a model repeating itself into two writes.
      if (commands.length > 0 || questions.length === 0) {
        pending = commands;
      }

      if (reply.askUser) {
        state = "awaiting-user";
        return { kind: "ask-user", question: reply.askUser };
      }
      if (questions.length > 0) {
        state = "discovering";
        return { kind: "questions", questions };
      }
      return { kind: "ready", plan: finalize(pending) };
    },
  };
}
