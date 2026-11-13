import { type ActionAiOptions, type AgentProgress } from "@adapttable/core";

import {
  resolveApproval,
  type ResolvedApproval,
  sharedApproval,
} from "./approvalConfig";
import {
  type CapabilityRegistry,
  createCapabilityRegistry,
  shortForm,
} from "./capabilities/registry";
import {
  ApplyError,
  isGovernedKind,
  isThenable,
  type SessionGuard,
} from "./commands/command";
import {
  BulkFailure,
  isWriteResult,
  writePayload,
} from "./commands/writeResult";
import {
  type ApplyCallLedger,
  ControlledApplyError,
  type LiveApplyCoordinator,
} from "./controlledApply";
import { errorMessage } from "./errorMessage";
import { type ApprovalPolicy } from "./keys";
import { buildManifest } from "./manifest";
import { normalizeCapabilityArgs } from "./normalizeArgs";
import {
  type AgentApply,
  type AgentCapabilityContext,
  type AgentCapabilityDefinition,
  type AgentObservation,
  type AgentSession,
  type ApprovalOutcome,
  type ApprovalResult,
  type ApprovalSubject,
  type CapabilityGuide,
  type CapabilityPlan,
  type CapabilityProgress,
  type CatalogEntry,
  type ExecuteResult,
} from "./types";
import { validateSchema } from "./validate";

/**
 * Inputs for {@link createAgentSession}.
 *
 * @public
 */
export interface CreateAgentSessionOptions {
  /** Latest wired state. Called on every catalog/describe/execute. */
  observe: () => AgentObservation;
  /** Apply a validated mutation to the live table. */
  apply: AgentApply;
  /**
   * Host confirmation. When set, chrome is skipped.
   * When omitted and approval is required, execute returns `approval: "pending"`.
   */
  onApprove?: (
    subject: ApprovalSubject,
    signal?: AbortSignal
  ) => Promise<ApprovalResult>;
  /** Custom governed capabilities registered on this table session. */
  capabilities?: readonly AgentCapabilityDefinition[];
  /**
   * Capability keys the agent may not use on this table.
   *
   * One list, for built-ins and custom definitions alike. It only ever denies:
   * a key the table does not wire stays unavailable whatever this says, and no
   * entry here can enable a forbidden operation. The table's own UI is
   * untouched — denying `edit.cells` to the agent leaves a person editing
   * cells exactly as before.
   */
  excludeCapabilities?: readonly string[];
  /**
   * This table's approval policy for individual capabilities, by key.
   *
   * The same shape a row or bulk action carries. An entry **replaces** the
   * shared policy for that one capability rather than narrowing it: `required`
   * asks on a table that asks for nothing, and `automatic` skips the human on a
   * table that asks for writes. Both directions are deliberate — this is the
   * developer's own answer to "who confirms this", written where the table is
   * configured.
   *
   * It is not the reader's answer. A reader choosing "don't ask again" is
   * `alwaysAllow` plus the approval memory: opt-in per capability, revocable,
   * and reset by a contract change. The two are different permissions and
   * neither stands in for the other — a capability carrying `required` here
   * keeps asking however often the reader waves it through.
   *
   * What it cannot do is make something permitted. Approval decides who
   * confirms an operation, never whether the table offers it: a key the table
   * does not wire, or excludes, stays unavailable whatever this says.
   */
  capabilityApproval?: Readonly<Record<string, ActionAiOptions>>;
  /**
   * Where a capability's progress goes, and `null` when it stops.
   *
   * The `null` closes it: a call that reported progress and then settled has
   * nothing more to say, and a surface left holding the last count would go on
   * showing it beside a finished turn. Without this option the context's
   * `reportProgress` is absent, and a handler that would have called it simply
   * does not — no buffer, no queue, nothing kept for a listener that may never
   * arrive.
   */
  onProgress?: (report: AgentProgress | null) => void;
  /**
   * How many replay results this session keeps. Defaults to 200. Accepted
   * mutations keep their deduplication guarantee for the whole session even
   * after their result is evicted — a replayed key then reports
   * `replay-expired` rather than running the write twice.
   */
  replayCacheSize?: number;
}

/**
 * Receive: what the session remembers about idempotency keys it has seen.
 */

/** Replay records kept per session before the oldest non-mutation is dropped. */
export const DEFAULT_REPLAY_CACHE_SIZE = 200;

export interface ReplayRecord {
  readonly capabilityKey: string;
  readonly fingerprint: string;
  readonly args: unknown;
  /** A governed write reached its handler — never run this key again. */
  readonly mutation: boolean;
  readonly result: ExecuteResult;
}

export function executeFingerprint(key: string, args: unknown): string {
  return JSON.stringify({ key, args: args ?? {} });
}

/**
 * Bounded replay store. Results are evicted oldest-first; the identity of an
 * accepted mutation is retained for the session so its key can never execute
 * a second time.
 */
export class ReplayStore {
  readonly #capacity: number;
  readonly #records = new Map<string, ReplayRecord>();
  readonly #mutations = new Map<string, string>();
  readonly #attempted = new Set<string>();

  constructor(capacity: number) {
    this.#capacity = Math.max(1, Math.floor(capacity));
  }

  get(key: string): ReplayRecord | undefined {
    const record = this.#records.get(key);
    if (!record) return undefined;
    this.#records.delete(key);
    this.#records.set(key, record);
    return record;
  }

  /** Fingerprint of an accepted mutation whose result is no longer cached. */
  retiredMutation(key: string): string | undefined {
    if (this.#records.has(key)) return undefined;
    return this.#mutations.get(key);
  }

  reserve(key: string, fingerprint: string): void {
    this.#mutations.set(key, fingerprint);
    this.#attempted.add(key);
  }

  wasAttempted(key: string): boolean {
    return this.#attempted.has(key);
  }

  set(key: string, record: ReplayRecord): void {
    if (record.mutation) this.#mutations.set(key, record.fingerprint);
    this.#records.delete(key);
    this.#records.set(key, record);
    for (const oldest of this.#records.keys()) {
      if (this.#records.size <= this.#capacity) break;
      this.#records.delete(oldest);
    }
  }
}

/**
 * Re-derive a cached result against the current declaration. A replay never
 * discloses a column, a row count or a scope the table no longer permits; a
 * command without a `replay` step returns its cached result unchanged.
 */
export function refreshReplayResult(
  record: ReplayRecord,
  idempotencyKey: string,
  guard: SessionGuard,
  registry: CapabilityRegistry
): ExecuteResult {
  const key = record.capabilityKey;
  const replay = registry.builtIn(key)?.replay;
  if (!replay) return record.result;
  const observation = guard.observe();

  const denied = (code: string, message: string): ExecuteResult => ({
    ok: false,
    revision: observation.viewRevision,
    idempotencyKey,
    error: { code, message },
  });

  if (!guard.isEnabled(key, observation)) {
    return denied(
      "not-wired",
      `capability "${key}" is not wired on this table`
    );
  }
  if (!record.result.ok) {
    return { ...record.result, revision: observation.viewRevision };
  }
  try {
    return replay(record.result, record.args, observation);
  } catch (error) {
    const code = error instanceof ApplyError ? error.code : "apply-failed";
    return denied(code, errorMessage(error));
  }
}

/**
 * Approve: who confirms a governed write, and what their answer allows.
 */

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

/**
 * What one `execute` call carries through the loop: the channel it reaches
 * the table through, where it says how far it has got, and the ledger a live
 * binding settles its view requests on.
 */

/**
 * The three things a call has that the session itself does not: the channel it
 * reaches the table through, where it may say how far it has got, and whether
 * it has invoked a host write yet — which decides whether a replayed identity
 * is a repeated mutation or a harmless re-read.
 */
export interface CallState {
  whenApplied?: () => Promise<void>;
  readonly observe: () => AgentObservation;
  /** Whether a host write callback has been invoked for this call. */
  invokedWrite: boolean;
  /** `apply`, reporting where each changing call leaves the table. */
  readonly apply: AgentApply;
  /** Where this call says how far it has got, when anything is listening. */
  readonly progress: ((progress: CapabilityProgress) => void) | undefined;
}

/**
 * Apply members that read the table rather than change it.
 *
 * A call to one of these says nothing about where the table has got to, so
 * tracing it would let a change made by somebody else stand in for progress
 * this action never made.
 */
const READING_APPLY: ReadonlySet<PropertyKey> = new Set([
  "readRows",
  "resolveRow",
]);

/**
 * `apply`, reporting where each changing call leaves the table.
 *
 * Every route a capability has to the table runs through this object, so the
 * revision read as one of its calls settles is the revision that call
 * produced. Wrapping it here rather than at each call site covers a host's
 * own capability handler, which the session never sees inside.
 *
 * A proxy rather than a copy: a host may hand over a class instance, whose
 * methods a spread would drop.
 */
export function traceApply(
  apply: AgentApply,
  settled: () => void,
  currentLedger: () => ApplyCallLedger | undefined
): AgentApply {
  return new Proxy(apply, {
    get(target, property) {
      currentLedger()?.assertActive();
      const member: unknown = Reflect.get(target, property);
      if (typeof member !== "function") return member;
      if (READING_APPLY.has(property)) {
        if (!currentLedger()) return member;
        return (...args: readonly unknown[]) => {
          currentLedger()?.assertActive();
          return Reflect.apply(
            member as (...args: readonly unknown[]) => unknown,
            target,
            args
          );
        };
      }
      const call = member as (...args: readonly unknown[]) => unknown;
      return (...args: readonly unknown[]): unknown => {
        const ledger = currentLedger();
        const ticket = ledger?.submit(property, args);
        if (ticket) return ticket.completion;
        if (ledger)
          return ledger.trackLegacy(
            () => Reflect.apply(call, target, args),
            settled
          );
        const outcome = Reflect.apply(call, target, args);
        if (!isThenable(outcome)) {
          settled();
          return outcome;
        }
        return Promise.resolve(outcome).then((value) => {
          settled();
          return value;
        });
      };
    },
  });
}

/**
 * Where one call says how far it has got, and how that is closed.
 *
 * A call that reported something closes with `null` when it settles, so a
 * surface is never left holding the last count beside a finished call. A call
 * that reported nothing says nothing, and a table with nowhere to send it is
 * handed no reporter at all.
 */
export function callProgress(
  report: ((given: AgentProgress | null) => void) | undefined,
  capability: string,
  idempotencyKey: string
): {
  readonly progress: ((given: CapabilityProgress) => void) | undefined;
  readonly close: () => void;
} {
  if (!report) return { progress: undefined, close: () => undefined };
  let reported = false;
  let closed = false;
  return {
    progress: (given) => {
      if (closed) return;
      reported = true;
      report({ ...given, capability, idempotencyKey });
    },
    close: () => {
      closed = true;
      if (!reported) return;
      reported = false;
      report(null);
    },
  };
}

/**
 * The check every governed step makes before the next side effect.
 *
 * Cancellation is not an approval question: a table with no `onApprove` is
 * still cancellable, and a write that has not started must not start.
 */
export function cancellationGuard(signal: AbortSignal | undefined): () => void {
  return () => {
    if (signal?.aborted !== true) return;
    throw new ApplyError("cancelled", "request cancelled");
  };
}

export function executionCallbacks(
  call: CallState
): Pick<AgentCapabilityContext, "whenApplied" | "reportProgress"> {
  return {
    ...(call.whenApplied ? { whenApplied: call.whenApplied } : {}),
    ...(call.progress ? { reportProgress: call.progress } : {}),
  };
}

export function attachCallLedger(
  call: CallState,
  ledger: ApplyCallLedger | undefined
): void {
  if (ledger) call.whenApplied = () => ledger.whenApplied();
}

export async function settleCapabilityRun(
  running: Promise<unknown>,
  ledger: ApplyCallLedger | undefined
): Promise<unknown> {
  if (!ledger) return running;
  const payload = await ledger.race(running);
  ledger.seal();
  const waiting = ledger.drain();
  if (waiting) await waiting;
  return payload;
}

export function controlledError(
  error: unknown,
  ledger: ApplyCallLedger | undefined
): ControlledApplyError | undefined {
  if (error instanceof ControlledApplyError) return error;
  if (!ledger?.used && !ledger?.invoked) return undefined;
  return new ControlledApplyError(
    error instanceof ApplyError ? error.code : "apply-failed",
    errorMessage(error),
    ledger.revision
  );
}

/**
 * A built-in result that describes the controlled view request itself carries
 * the revision that request settled at.
 */
export function controlledPayload(
  key: string,
  payload: unknown,
  revision: number,
  ledger: ApplyCallLedger | undefined,
  registry: CapabilityRegistry
): unknown {
  if (!ledger?.used || registry.builtIn(key)?.settlesView !== true)
    return payload;
  if (!payload || typeof payload !== "object") return payload;
  return { ...payload, revision };
}

/**
 * Validate: whether a call may start, and whether it may go on after each
 * awaited boundary.
 */

/** What every stage of the loop reads: the session and what it holds. */
export interface LoopState {
  readonly options: CreateAgentSessionOptions;
  readonly registry: CapabilityRegistry;
  readonly guard: SessionGuard;
  readonly replay: ReplayStore;
  readonly coordinator: LiveApplyCoordinator | undefined;
}

/** The refusal a call that cannot start reports. */
export interface Refusal {
  readonly code: string;
  readonly message: string;
}

/** A call admitted against one observation. */
export interface Admitted {
  readonly definition: AgentCapabilityDefinition;
  readonly observation: AgentObservation;
}

/**
 * Re-check the table after an awaited boundary. A revision move, a
 * capability that stopped being wired, or a withdrawn write permission all
 * deny the call rather than letting it proceed on the entry snapshot.
 */
export function revalidate(
  state: LoopState,
  key: string,
  entry: AgentObservation,
  governed: boolean
): AgentObservation {
  const latest = state.options.observe();
  if (latest.viewRevision !== entry.viewRevision) {
    throw new ApplyError(
      "revision-mismatch",
      `expected revision ${entry.viewRevision}, table is at ${latest.viewRevision}`
    );
  }
  if (!state.guard.isEnabled(key, latest)) {
    throw new ApplyError(
      "not-wired",
      `capability "${key}" is not wired on this table`
    );
  }
  if (governed && latest.writePolicy !== "allow") {
    throw new ApplyError(
      "write-denied",
      `writes are not permitted on this table`
    );
  }
  return latest;
}

/** Resolve the capability, or the reason the call cannot start. */
export function preflight(
  state: LoopState,
  key: string,
  args: unknown,
  expectedRevision: number
): Admitted | Refusal {
  const definition = state.registry.get(key);
  if (!definition) {
    return {
      code: "unknown-capability",
      message: `unknown capability "${key}"`,
    };
  }
  const observation = state.options.observe();
  if (!state.registry.enabledKeys(observation).includes(key)) {
    return {
      code: "not-wired",
      message: `capability "${key}" is not wired on this table`,
    };
  }
  if (expectedRevision !== observation.viewRevision) {
    return {
      code: "revision-mismatch",
      message: `expected revision ${expectedRevision}, table is at ${observation.viewRevision}`,
    };
  }
  const invalid = validateSchema(definition.guide.input, args ?? {});
  if (invalid) return { code: "invalid-arguments", message: invalid };
  return { definition, observation };
}

/**
 * Approve, then apply: the one governed path. Built-ins and custom
 * definitions both run here, so a custom `kind: "write"` cannot execute
 * without the same policy, commit-mode, approval and revalidation checks a
 * built-in gets.
 */

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

/**
 * One pass of the loop for one call: validate, approve, apply, report.
 */

/** Where a controlled call's own guard reports a refusal. */
function controlledGuard(
  state: LoopState,
  key: string,
  admitted: Admitted
): (revision: number) => void {
  return (revision) => {
    try {
      revalidate(
        state,
        key,
        { ...admitted.observation, viewRevision: revision },
        isGoverned(admitted.definition)
      );
    } catch (error) {
      if (error instanceof ApplyError)
        throw new ControlledApplyError(error.code, error.message, revision);
      throw error;
    }
  };
}

export async function runExecute(
  state: LoopState,
  key: string,
  rawArgs: unknown,
  expectedRevision: number,
  idempotencyKey: string,
  signal?: AbortSignal
): Promise<ExecuteResult> {
  const { options, replay } = state;
  const args = normalizeCapabilityArgs(
    key,
    rawArgs,
    state.registry.get(key)?.guide.input
  );
  // Where this action itself left the table. `apply` is the one channel a
  // capability changes the table through — a built-in dispatches to it, a
  // host handler is handed it — so the revision read as one of those calls
  // settles is this action's own progress.
  let own: number | undefined;
  let ledger: ApplyCallLedger | undefined;
  const tracked = traceApply(
    options.apply,
    () => {
      own = options.observe().viewRevision;
      ledger?.observeLegacy(own);
    },
    () => ledger
  );

  // Named where the call’s own identity is, so a surface watching two
  // capabilities at once can tell which one moved.
  const { progress, close: closeProgress } = callProgress(
    options.onProgress,
    key,
    idempotencyKey
  );

  const call: CallState = {
    invokedWrite: false,
    apply: tracked,
    progress,
    observe: () => {
      ledger?.assertActive();
      return options.observe();
    },
  };

  const record = (result: ExecuteResult): ExecuteResult => {
    replay.set(idempotencyKey, {
      capabilityKey: key,
      fingerprint: executeFingerprint(
        key,
        ledger?.invoked || ledger?.used ? rawArgs : args
      ),
      args,
      mutation: call.invokedWrite || ledger?.invoked === true,
      result,
    });
    return result;
  };
  const fail = (code: string, message: string): ExecuteResult => {
    const result: ExecuteResult = {
      ok: false,
      revision: options.observe().viewRevision,
      idempotencyKey,
      error: { code, message },
    };
    if (code === "cancelled" || code === "revision-mismatch") return result;
    return record(result);
  };

  const resolved = preflight(state, key, args, expectedRevision);
  if ("code" in resolved) return fail(resolved.code, resolved.message);

  const controlledFailure = (error: ControlledApplyError): ExecuteResult => {
    const result: ExecuteResult = {
      ok: false,
      revision: ledger?.revision ?? resolved.observation.viewRevision,
      idempotencyKey,
      error: { code: error.code, message: error.message },
    };
    return ledger?.invoked || call.invokedWrite ? record(result) : result;
  };
  try {
    ledger = state.coordinator?.beginCall({
      admitted: resolved.observation,
      signal,
      guard: controlledGuard(state, key, resolved),
      reserveEffect: () =>
        replay.reserve(idempotencyKey, executeFingerprint(key, rawArgs)),
      accept: (receipt) => {
        own = receipt.producedRevision;
      },
    });
    attachCallLedger(call, ledger);
    const running = runCapability(
      state,
      resolved.definition,
      key,
      args,
      resolved.observation,
      signal,
      call
    );
    const initialPayload = ledger
      ? await settleCapabilityRun(running, ledger)
      : await running;
    // What this action reached, never where the table happens to be. An
    // action that applied nothing reports the revision it was admitted at,
    // and one that applied reports what its own last call settled at, so a
    // change that landed alongside it is left for whoever made it to account
    // for. The next command then meets that change as a mismatch it has to
    // re-read, which is the answer the session gives at every other awaited
    // boundary.
    //
    // A host write and a foreign write inside the same `apply` call are the
    // one pair this cannot separate: both move the same counter while that
    // call is in flight, and only the host knows which revision its own
    // write produced.
    const produced = own ?? resolved.observation.viewRevision;
    const payload = controlledPayload(
      key,
      initialPayload,
      produced,
      ledger,
      state.registry
    );
    const unfinished = unfinishedWrite(payload);
    if (unfinished) {
      return {
        ok: unfinished === "pending",
        revision: produced,
        idempotencyKey,
        result: unfinished === "pending" ? payload : undefined,
        error:
          unfinished === "cancelled"
            ? { code: "cancelled", message: "approval cancelled" }
            : undefined,
      };
    }
    return record({
      ok: true,
      revision: produced,
      idempotencyKey,
      result: payload,
    });
  } catch (error) {
    const controlled = controlledError(error, ledger);
    if (controlled) return controlledFailure(controlled);
    if (error instanceof ApplyError) return fail(error.code, error.message);
    return fail("apply-failed", errorMessage(error));
  } finally {
    ledger?.close();
    closeProgress();
  }
}

/**
 * The agent session: a loop over the command registry.
 *
 * Every call is received (idempotency, replay, joining an identical call in
 * flight), validated (registered, wired, at the expected revision, arguments
 * against the command's schema), approved (governed writes only), applied
 * (the command changes the table through `apply`) and reported (one
 * `ExecuteResult`, recorded for replay). Transports translate to and from
 * this loop and nothing else.
 */

/**
 * Provider-neutral three-stage session.
 *
 * Runtimes that support typed tools can wrap each `describe` result; the
 * generic catalog/describe/execute calls stay the portable fallback.
 *
 * @public
 */
export function createAgentSession(
  options: CreateAgentSessionOptions
): AgentSession {
  return createAgentSessionInternal(options);
}

/** Receive: a cached, in-flight or retired identity answers without running. */
function received(
  state: LoopState,
  inflight: ReadonlyMap<string, InFlight>,
  key: string,
  args: unknown,
  idempotencyKey: string
): Promise<ExecuteResult> | undefined {
  const { options, replay } = state;
  const fingerprint = executeFingerprint(key, args);
  const mismatch = (): Promise<ExecuteResult> =>
    Promise.resolve({
      ok: false,
      revision: options.observe().viewRevision,
      idempotencyKey,
      error: {
        code: "idempotency-mismatch",
        message:
          "idempotency key was already used for a different capability or payload",
      },
    });

  const cached = replay.get(idempotencyKey);
  if (cached) {
    if (cached.fingerprint !== fingerprint) return mismatch();
    return Promise.resolve(
      refreshReplayResult(cached, idempotencyKey, state.guard, state.registry)
    );
  }

  const running = inflight.get(idempotencyKey);
  if (running) {
    if (running.fingerprint !== fingerprint) return mismatch();
    return running.promise;
  }

  // An accepted mutation keeps its identity after its result is evicted.
  const retired = replay.retiredMutation(idempotencyKey);
  if (retired === undefined) return undefined;
  if (retired !== fingerprint) return mismatch();
  return Promise.resolve({
    ok: false,
    revision: options.observe().viewRevision,
    idempotencyKey,
    error: {
      code: "replay-expired",
      message: replay.wasAttempted(idempotencyKey)
        ? "this mutation was already attempted; its result is no longer cached and it will not run again"
        : "this write was already accepted; its result is no longer cached and it will not run again",
    },
  });
}

interface InFlight {
  readonly fingerprint: string;
  readonly promise: Promise<ExecuteResult>;
}

function catalogOf(registry: CapabilityRegistry, state: LoopState) {
  return (): CatalogEntry[] => {
    const observation = state.options.observe();
    return registry.enabled(observation).map((definition) => ({
      key: definition.key,
      summary: definition.summary,
      summaryShort: shortForm(definition.summary),
      ...(definition.kind ? { kind: definition.kind } : {}),
      ...(definition.idempotent === undefined
        ? {}
        : { idempotent: definition.idempotent }),
    }));
  };
}

function describeOf(registry: CapabilityRegistry, state: LoopState) {
  return (key: string): CapabilityGuide => {
    if (!registry.has(key)) {
      throw new Error(`unknown capability "${key}"`);
    }
    const observation = state.options.observe();
    if (!registry.permits(key, observation)) {
      // Excluded and unwired are both "you cannot use this", and saying which
      // would tell a model something about the host's configuration that it
      // has no business learning from a refusal.
      throw new Error(`capability "${key}" is not wired on this table`);
    }
    const guide = registry.describe(key);
    return registry.builtIn(key)?.describe?.(guide, observation) ?? guide;
  };
}

/** Package-internal live-binding extension; the public constructor stays unchanged. */
export function createAgentSessionInternal(
  options: CreateAgentSessionOptions,
  coordinator?: LiveApplyCoordinator
): AgentSession {
  const guard: SessionGuard = {
    observe: () => options.observe(),
    // One predicate, asked here as everywhere else — including the
    // revalidation after an awaited boundary, which is the check an excluded
    // capability must not be able to walk past.
    isEnabled: (key, observation) => registry.permits(key, observation),
  };
  const registry: CapabilityRegistry = createCapabilityRegistry(
    options.capabilities ?? [],
    guard,
    options.excludeCapabilities ?? [],
    options.capabilityApproval ?? {}
  );
  const state: LoopState = {
    options,
    registry,
    guard,
    replay: new ReplayStore(
      options.replayCacheSize ?? DEFAULT_REPLAY_CACHE_SIZE
    ),
    coordinator,
  };
  const inflight = new Map<string, InFlight>();

  const execute = (
    key: string,
    args: unknown,
    expectedRevision: number,
    idempotencyKey: string,
    signal?: AbortSignal
  ): Promise<ExecuteResult> => {
    if (signal?.aborted) {
      return Promise.resolve({
        ok: false,
        revision: options.observe().viewRevision,
        idempotencyKey,
        error: { code: "cancelled", message: "execute cancelled" },
      });
    }
    const answered = received(state, inflight, key, args, idempotencyKey);
    if (answered) return answered;
    // Reserve the key before any handler can run, so a synchronous re-entry
    // joins this execution instead of starting a second one.
    const entry: InFlight = {
      fingerprint: executeFingerprint(key, args),
      promise: Promise.resolve().then(() =>
        runExecute(state, key, args, expectedRevision, idempotencyKey, signal)
      ),
    };
    inflight.set(idempotencyKey, entry);
    return entry.promise.finally(() => {
      inflight.delete(idempotencyKey);
    });
  };

  return {
    catalog: catalogOf(registry, state),
    describe: describeOf(registry, state),
    execute,
    manifest: () => {
      const observation = options.observe();
      return buildManifest(observation, registry.enabledKeys(observation));
    },
  };
}

export { AGENT_SCHEMA_VERSION } from "./keys";
