/**
 * The shape every built-in table command takes.
 *
 * A command is one object: its key, what it is called and how it is
 * described, its input schema, how near-miss arguments are read, how its
 * guide follows the live table, whether it is wired, what it proposes, what it
 * applies, and how a replayed result is re-derived. Approval follows from its
 * `kind`. The session runs every command through the same loop, and nothing
 * else in the package keeps a second copy of any of these answers.
 */
import type { CapabilityKey } from "../keys";
import type {
  AgentApply,
  AgentCapabilityContext,
  AgentCapabilityKind,
  AgentObservation,
  CapabilityGuide,
  CapabilityPartial,
  CapabilityPlan,
  CapabilityStaging,
  ExecuteResult,
  JsonSchema,
} from "../types";

/** A refusal with the machine code the session reports it under. */
export class ApplyError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Session-owned re-checks a command runs after every awaited boundary.
 * Never handed to custom capability code.
 */
export interface SessionGuard {
  readonly observe: () => AgentObservation;
  readonly isEnabled: (key: string, observation: AgentObservation) => boolean;
}

/** One call of one command: what it runs against and what it was asked. */
export interface CommandCall {
  /** The context the session built for this call. */
  readonly context: AgentCapabilityContext;
  /** The validated arguments. */
  readonly body: Record<string, unknown>;
  /** Re-checks for the moment after an awaited host callback. */
  readonly guard: SessionGuard;
}

/**
 * One built-in command.
 *
 * `apply` changes the table only through `context.apply` — the one dispatch
 * surface a table hands the agent — so the agent, the toolbar and the URL
 * change it the same way.
 */
export interface TableCommand<K extends CapabilityKey = CapabilityKey> {
  readonly key: K;
  /** One line for the catalog. */
  readonly summary: string;
  /** What `describe` tells a caller before it calls. */
  readonly guide: string;
  readonly input: JsonSchema;
  readonly output: JsonSchema;
  /** Effect class. `write` and `destructive` are governed and may need approval. */
  readonly kind: AgentCapabilityKind;
  /** Whether `commit: "stage"` is honoured. */
  readonly staging: CapabilityStaging;
  /** Whether `apply` writes `plan.payload` row by row. */
  readonly partial: CapabilityPartial;
  /** Whether running it twice lands where running it once did. */
  readonly idempotent: boolean;
  /** Whether this observation wires the command. */
  readonly isEnabled: (observation: AgentObservation) => boolean;
  /** Rewrite the argument names callers reach for into the schema's. */
  readonly normalize?: (
    args: Record<string, unknown>
  ) => Record<string, unknown>;
  /** The guide specialised to the live table. */
  readonly describe?: (
    guide: CapabilityGuide,
    observation: AgentObservation
  ) => CapabilityGuide;
  /** The side-effect-free proposal a governed write asks approval for. */
  readonly preview?: (call: CommandCall) => Promise<CapabilityPlan>;
  /** Change the table, or read it. */
  readonly apply: (call: CommandCall) => unknown;
  /**
   * Re-derive a cached successful result against the current declaration, so
   * a replay never discloses what the table no longer permits.
   */
  readonly replay?: (
    result: ExecuteResult,
    args: unknown,
    observation: AgentObservation
  ) => ExecuteResult;
  /**
   * Whether the result describes the controlled view request itself, and so
   * carries the revision that request settled at.
   */
  readonly settlesView?: boolean;
}

/** Whether a command changes data rather than the view. */
export function isGovernedKind(kind: AgentCapabilityKind | undefined): boolean {
  return kind === "write" || kind === "destructive";
}

/** Refuse a call whose dispatch member the table does not wire. */
export function assertApply<K extends keyof AgentApply>(
  apply: AgentApply,
  name: K
): asserts apply is AgentApply & Required<Pick<AgentApply, K>> {
  if (apply[name] === undefined) {
    throw new ApplyError("not-wired", `${String(name)} is not wired`);
  }
}

/** Refuse a table that moved while a command awaited host code. */
export function assertUnmoved(
  entry: AgentObservation,
  latest: AgentObservation
): void {
  if (latest.viewRevision === entry.viewRevision) return;
  throw new ApplyError(
    "revision-mismatch",
    `expected revision ${entry.viewRevision}, table is at ${latest.viewRevision}`
  );
}

/**
 * Re-read the table after an awaited boundary and refuse it if it moved or
 * stopped wiring the command. `notWired` is the refusal's own wording.
 */
export function recheck(
  call: CommandCall,
  key: CapabilityKey,
  notWired = `capability "${key}" is not wired on this table`
): AgentObservation {
  const latest = call.guard.observe();
  assertUnmoved(call.context.observation, latest);
  if (!call.guard.isEnabled(key, latest)) {
    throw new ApplyError("not-wired", notWired);
  }
  return latest;
}

/** The answer a view command gives once the table has taken the change. */
export function viewMoved(observation: AgentObservation): {
  ok: true;
  revision: number;
} {
  return { ok: true, revision: observation.viewRevision + 1 };
}

/** Whether the table composed a feature by id. */
export function hasFeature(observation: AgentObservation, id: string): boolean {
  return observation.featureIds.includes(id);
}

/** Whether a value has to be waited on. */
export function isThenable(value: unknown): value is PromiseLike<unknown> {
  if (typeof value !== "object" || value === null) return false;
  return typeof (value as { then?: unknown }).then === "function";
}

/**
 * Run a command as one asynchronous step. A synchronous result settles the
 * step at once; a refusal thrown before the first await rejects it.
 */
export async function runCommand(
  command: TableCommand,
  call: CommandCall
): Promise<unknown> {
  const result = command.apply(call);
  return isThenable(result) ? await result : result;
}
