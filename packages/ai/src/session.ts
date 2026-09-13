import { isPinnedSummaryRowId } from "@adapttable/core";

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
import { errorMessage } from "./errorMessage";
import { extrasFromAgentFilters, formatFilterCatalog } from "./filterCatalog";
import { summaryOf } from "./guides";
import {
  type ApprovalPolicy,
  type CapabilityKey,
  type CommitPolicy,
  type RowAddressScope,
} from "./keys";
import { buildManifest } from "./manifest";
import { normalizeCapabilityArgs } from "./normalizeArgs";
import {
  type AgentPagination,
  agentPagination,
  pageRefusal,
  pageSizeRefusal,
} from "./pagination";
import type {
  AgentAggregationColumn,
  AgentAggregationsPatch,
  AgentApply,
  AgentCapabilityContext,
  AgentCapabilityDefinition,
  AgentColumn,
  AgentObservation,
  AgentSession,
  ApprovalOutcome,
  ApprovalResult,
  ApprovalSubject,
  CapabilityGuide,
  CapabilityPlan,
  CatalogEntry,
  ExecuteResult,
  ResolvedRow,
  RowProvenanceEnvelope,
  RowReadQuery,
  RowRef,
  RowWindow,
  WriteExecuteResult,
  WriteProposal,
  WriteRowResult,
} from "./types";
import { validateSchema } from "./validate";

/** Replay records kept per session before the oldest non-mutation is dropped. */
const DEFAULT_REPLAY_CACHE_SIZE = 200;

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
   * How many replay results this session keeps. Defaults to 200. Accepted
   * mutations keep their deduplication guarantee for the whole session even
   * after their result is evicted — a replayed key then reports
   * `replay-expired` rather than running the write twice.
   */
  replayCacheSize?: number;
}

function approvalOf(observation: AgentObservation): ApprovalPolicy {
  return observation.approval ?? "writes";
}

/**
 * The policy for one capability: the table's, unless the capability itself
 * overrides it. Presentation is resolved the same way but is the surface's
 * business, not the session's — the session only decides whether to ask.
 */
function approvalFor(
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

function commitOf(observation: AgentObservation): CommitPolicy {
  return observation.commit ?? "stage";
}

function readMaxOf(observation: AgentObservation): number {
  return observation.readMax ?? 50;
}

function kindOf(
  definition: AgentCapabilityDefinition
): NonNullable<AgentCapabilityDefinition["kind"]> {
  return definition.kind ?? "view";
}

function isGoverned(definition: AgentCapabilityDefinition): boolean {
  const kind = kindOf(definition);
  return kind === "write" || kind === "destructive";
}

function needsApproval(
  definition: AgentCapabilityDefinition,
  policy: ApprovalPolicy
): boolean {
  if (policy === "never") return false;
  if (policy === "destructive") return kindOf(definition) === "destructive";
  return isGoverned(definition);
}

class ApplyError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Session-owned re-checks a handler runs after every awaited boundary.
 * Never handed to custom capability code.
 */
interface SessionGuard {
  readonly observe: () => AgentObservation;
  readonly isEnabled: (key: string, observation: AgentObservation) => boolean;
}

interface ReplayRecord {
  readonly capabilityKey: string;
  readonly fingerprint: string;
  readonly args: unknown;
  /** A governed write reached its handler — never run this key again. */
  readonly mutation: boolean;
  readonly result: ExecuteResult;
}

function executeFingerprint(key: string, args: unknown): string {
  return JSON.stringify({ key, args: args ?? {} });
}

/**
 * Bounded replay store. Results are evicted oldest-first; the identity of an
 * accepted mutation is retained for the session so its key can never execute
 * a second time.
 */
class ReplayStore {
  readonly #capacity: number;
  readonly #records = new Map<string, ReplayRecord>();
  readonly #mutations = new Map<string, string>();

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

function readableAllowlist(
  columns: readonly AgentColumn[],
  wanted: readonly string[] | undefined
): Set<string> {
  const readable = columns
    .filter((column) => column.readable)
    .map((column) => column.id);
  if (!wanted) return new Set(readable);
  const declared = new Set(readable);
  return new Set(wanted.filter((id) => declared.has(id)));
}

/**
 * Project a host window onto what the CURRENT declaration permits: allowed
 * columns only, no more rows than the permitted limit, and window metadata
 * that describes the window actually returned.
 */
function projectWindow(
  window: RowWindow,
  allow: ReadonlySet<string>,
  columns: readonly AgentColumn[],
  offset: number,
  limit: number
): RowWindow {
  const rows = window.rows.slice(0, limit).map((row) => {
    const cells: Record<string, unknown> = {};
    for (const [id, value] of Object.entries(row.cells)) {
      if (!allow.has(id)) continue;
      cells[id] = value;
    }
    return { rowKey: row.rowKey, cells };
  });
  return { rows, offset, limit, redacted: redactedIds(columns) };
}

/** A non-negative integer bound, ignoring a missing or unusable value. */
function boundedInt(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? Math.floor(value) : Number.NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, parsed);
}

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
  const replay = new ReplayStore(
    options.replayCacheSize ?? DEFAULT_REPLAY_CACHE_SIZE
  );
  const inflight = new Map<
    string,
    { fingerprint: string; promise: Promise<ExecuteResult> }
  >();
  const registry: CapabilityRegistry = createCapabilityRegistry(
    options.capabilities ?? [],
    {
      plan: (key, context, args) => planBuiltIn(key, context, args, guard),
      execute: (key, context, args) =>
        dispatchBuiltIn(key, context, args, guard),
    },
    options.excludeCapabilities ?? []
  );
  const guard: SessionGuard = {
    observe: () => options.observe(),
    // One predicate, asked here as everywhere else — including the
    // revalidation after an awaited boundary, which is the check an excluded
    // capability must not be able to walk past.
    isEnabled: (key, observation) => registry.permits(key, observation),
  };

  const catalog = (): CatalogEntry[] => {
    const observation = options.observe();
    return registry.enabledKeys(observation).map((key) => {
      const definition = registry.get(key);
      const summary = definition?.summary ?? summaryOf(key as CapabilityKey);
      return {
        key,
        summary,
        summaryShort: shortForm(summary),
        ...(definition?.kind ? { kind: definition.kind } : {}),
        ...(definition?.idempotent === undefined
          ? {}
          : { idempotent: definition.idempotent }),
      };
    });
  };

  const describe = (key: string): CapabilityGuide => {
    if (!registry.has(key)) {
      throw new Error(`unknown capability "${key}"`);
    }
    const observation = options.observe();
    if (!registry.permits(key, observation)) {
      // Excluded and unwired are both "you cannot use this", and saying which
      // would tell a model something about the host's configuration that it
      // has no business learning from a refusal.
      throw new Error(`capability "${key}" is not wired on this table`);
    }
    const guide = registry.describe(key);
    if (key === "view.setAggregations") {
      return describeAggregations(guide, options.observe());
    }
    if (key === "view.setFilters") {
      return describeFilters(guide, options.observe());
    }
    return guide;
  };

  /**
   * Re-check the table after an awaited boundary. A revision move, a
   * capability that stopped being wired, or a withdrawn write permission all
   * deny the call rather than letting it proceed on the entry snapshot.
   */
  const revalidate = (
    key: string,
    entry: AgentObservation,
    governed: boolean
  ): AgentObservation => {
    const latest = options.observe();
    if (latest.viewRevision !== entry.viewRevision) {
      throw new ApplyError(
        "revision-mismatch",
        `expected revision ${entry.viewRevision}, table is at ${latest.viewRevision}`
      );
    }
    if (!guard.isEnabled(key, latest)) {
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
  };

  /**
   * The one governed path. Built-ins and custom definitions both run here,
   * so a custom `kind: "write"` cannot execute without the same policy,
   * commit-mode, approval and revalidation checks a built-in gets.
   */
  const runCapability = async (
    definition: AgentCapabilityDefinition,
    key: string,
    args: unknown,
    entry: AgentObservation,
    signal: AbortSignal | undefined,
    state: { invokedWrite: boolean }
  ): Promise<unknown> => {
    const approve = bindApprove(options.onApprove, signal);
    const throwIfCancelled = cancellationGuard(signal);
    const baseContext: AgentCapabilityContext = {
      observation: entry,
      apply: options.apply,
      observe: options.observe,
      onApprove: approve,
      signal,
      throwIfCancelled,
    };
    // The reserved execution is starting for real.
    throwIfCancelled();
    if (!isGoverned(definition)) {
      return definition.execute(baseContext, args);
    }

    if (entry.writePolicy !== "allow") {
      throw new ApplyError(
        "write-denied",
        `writes are not permitted on this table`
      );
    }
    const commit = commitOf(entry);
    if (
      commit === "stage" &&
      (definition.staging ?? "unsupported") !== "supported"
    ) {
      throw new ApplyError(
        "commit-incompatible",
        `${key} requires commit: immediate on this table`
      );
    }

    const plan: CapabilityPlan = definition.plan
      ? await definition.plan(baseContext, args)
      : { proposals: [] };
    // Planning awaited host code, which is long enough to be cancelled in.
    throwIfCancelled();
    revalidate(key, entry, true);

    // One fact, read from the captured plan, used for both the offer the
    // reader is given and the answer they are allowed to give back.
    const decomposable = isDecomposable(plan, definition);
    const presentation = approvalFor(definition, entry).presentation;
    const subject: ApprovalSubject =
      plan.proposals.length > 0
        ? {
            kind: "rows",
            proposals: plan.proposals,
            perItem: decomposable,
            presentation,
          }
        : {
            kind: "operation",
            capability: key,
            ...(definition.presentation?.title
              ? { title: definition.presentation.title }
              : {}),
            arguments: args ?? {},
            presentation,
          };
    const decision = await decideApproval(
      definition,
      entry,
      subject,
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
    revalidate(key, entry, true);

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
    state.invokedWrite = true;
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
  };

  /** Resolve the capability, or the reason the call cannot start. */
  const preflight = (
    key: string,
    args: unknown,
    expectedRevision: number
  ):
    | {
        readonly definition: AgentCapabilityDefinition;
        readonly observation: AgentObservation;
      }
    | { readonly code: string; readonly message: string } => {
    const definition = registry.get(key);
    if (!definition) {
      return {
        code: "unknown-capability",
        message: `unknown capability "${key}"`,
      };
    }
    const observation = options.observe();
    if (!registry.enabledKeys(observation).includes(key)) {
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
  };

  const runExecute = async (
    key: string,
    rawArgs: unknown,
    expectedRevision: number,
    idempotencyKey: string,
    signal?: AbortSignal
  ): Promise<ExecuteResult> => {
    const args = normalizeCapabilityArgs(key, rawArgs);
    const state = { invokedWrite: false };
    const record = (result: ExecuteResult): ExecuteResult => {
      replay.set(idempotencyKey, {
        capabilityKey: key,
        fingerprint: executeFingerprint(key, args),
        args,
        mutation: state.invokedWrite,
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

    const resolved = preflight(key, args, expectedRevision);
    if ("code" in resolved) return fail(resolved.code, resolved.message);

    try {
      const payload = await runCapability(
        resolved.definition,
        key,
        args,
        resolved.observation,
        signal,
        state
      );
      const unfinished = unfinishedWrite(payload);
      if (unfinished) {
        return {
          ok: unfinished === "pending",
          revision: options.observe().viewRevision,
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
        revision: options.observe().viewRevision,
        idempotencyKey,
        result: payload,
      });
    } catch (error) {
      if (error instanceof ApplyError) return fail(error.code, error.message);
      return fail("apply-failed", errorMessage(error));
    }
  };

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
    const fingerprint = executeFingerprint(key, args);
    const mismatch = (): ExecuteResult => ({
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
      if (cached.fingerprint !== fingerprint)
        return Promise.resolve(mismatch());
      return Promise.resolve(
        refreshReplayResult(cached, idempotencyKey, guard)
      );
    }

    // An accepted mutation keeps its identity after its result is evicted.
    const retired = replay.retiredMutation(idempotencyKey);
    if (retired !== undefined) {
      if (retired !== fingerprint) return Promise.resolve(mismatch());
      return Promise.resolve({
        ok: false,
        revision: options.observe().viewRevision,
        idempotencyKey,
        error: {
          code: "replay-expired",
          message:
            "this write was already accepted; its result is no longer cached and it will not run again",
        },
      });
    }

    const running = inflight.get(idempotencyKey);
    if (running) {
      if (running.fingerprint !== fingerprint)
        return Promise.resolve(mismatch());
      return running.promise;
    }

    // Reserve the key before any handler can run, so a synchronous re-entry
    // joins this execution instead of starting a second one.
    const entry = {
      fingerprint,
      promise: Promise.resolve().then(() =>
        runExecute(key, args, expectedRevision, idempotencyKey, signal)
      ),
    };
    inflight.set(idempotencyKey, entry);
    return entry.promise.finally(() => {
      inflight.delete(idempotencyKey);
    });
  };

  return {
    catalog,
    describe,
    execute,
    manifest: () => {
      const observation = options.observe();
      return buildManifest(observation, registry.enabledKeys(observation));
    },
  };
}

/**
 * Re-derive a cached read against the current declaration. A replay never
 * discloses a column, a row count or a scope the table no longer permits.
 */
function refreshReplayResult(
  record: ReplayRecord,
  idempotencyKey: string,
  guard: SessionGuard
): ExecuteResult {
  const observation = guard.observe();
  const key = record.capabilityKey;
  if (key !== "rows.read" && key !== "columns.describe") return record.result;

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
  if (key === "columns.describe") {
    return {
      ...record.result,
      revision: observation.viewRevision,
      result: { columns: observation.columns },
    };
  }

  const body = (record.args ?? {}) as Record<string, unknown>;
  try {
    assertScope(body.scope as RowAddressScope | undefined, observation);
  } catch (error) {
    const code = error instanceof ApplyError ? error.code : "apply-failed";
    return denied(code, errorMessage(error));
  }
  // A replayed read is re-derived against the CURRENT declaration, so a column
  // the host has since made unreadable does not come back out of the cache.
  const window = (record.result.result as RowProvenanceEnvelope).rows;
  const wanted = body.columns as readonly string[] | undefined;
  const allow = readableAllowlist(observation.columns, wanted);
  const limit = Math.min(window.limit, readMaxOf(observation));
  return {
    ...record.result,
    revision: observation.viewRevision,
    result: rowProvenance(
      projectWindow(window, allow, observation.columns, window.offset, limit),
      observation.viewRevision
    ),
  };
}

/**
 * A write that stopped at approval, so nothing was applied. Anything else —
 * including a rejected proposal — is a completed, replayable outcome.
 */
function unfinishedWrite(
  payload: unknown
): "pending" | "cancelled" | undefined {
  if (!isWriteResult(payload) || payload.applied) return undefined;
  if (payload.approval === "pending") return "pending";
  if (payload.approval === "cancelled") return "cancelled";
  return undefined;
}

function isWriteResult(value: unknown): value is WriteExecuteResult {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    Array.isArray(record.proposals) &&
    typeof record.applied === "boolean" &&
    typeof record.approval === "string"
  );
}

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
 * The check every governed step makes before the next side effect.
 *
 * Cancellation is not an approval question: a table with no `onApprove` is
 * still cancellable, and a write that has not started must not start.
 */
function cancellationGuard(signal: AbortSignal | undefined): () => void {
  return () => {
    if (signal?.aborted !== true) return;
    throw new ApplyError("cancelled", "request cancelled");
  };
}

function describeFilters(
  guide: CapabilityGuide,
  observation: AgentObservation
): CapabilityGuide {
  return {
    ...guide,
    guide: guide.guide + formatFilterCatalog(observation.availableFilters),
  };
}

function describeAggregations(
  guide: CapabilityGuide,
  observation: AgentObservation
): CapabilityGuide {
  const columns = observation.aggregations?.columns ?? [];
  const listed =
    columns.length === 0
      ? " No eligible columns right now."
      : " Eligible now: " +
        columns
          .map(
            (column) =>
              `${column.id} [${column.operations
                .map((operation) => `${operation.id} (${operation.label})`)
                .join(", ")}]`
          )
          .join("; ") +
        ".";
  return { ...guide, guide: guide.guide + listed };
}

function eligibleAggregationColumns(
  observation: AgentObservation
): Map<string, AgentAggregationColumn> {
  return new Map(
    (observation.aggregations?.columns ?? []).map((column) => [
      column.id,
      column,
    ])
  );
}

function aggregationSetEntries(
  set: unknown,
  eligible: ReturnType<typeof eligibleAggregationColumns>
): Record<string, string> {
  if (set === null || typeof set !== "object" || Array.isArray(set)) {
    throw new ApplyError("apply-failed", "set must be an object of column ids");
  }
  const nextSet: Record<string, string> = {};
  for (const [key, operationId] of Object.entries(
    set as Record<string, unknown>
  )) {
    if (typeof operationId !== "string" || operationId === "") {
      throw new ApplyError(
        "apply-failed",
        `aggregation for "${key}" is not a named operation`
      );
    }
    const column = eligible.get(key);
    if (!column?.operations.some((operation) => operation.id === operationId)) {
      throw new ApplyError(
        "apply-failed",
        `"${key}" cannot use operation "${operationId}"`
      );
    }
    nextSet[key] = operationId;
  }
  return nextSet;
}

function aggregationRemoveKeys(
  remove: unknown,
  eligible: ReturnType<typeof eligibleAggregationColumns>
): string[] {
  if (!Array.isArray(remove)) {
    throw new ApplyError(
      "apply-failed",
      "remove must be an array of column ids"
    );
  }
  const nextRemove: string[] = [];
  for (const key of remove) {
    if (typeof key !== "string" || key === "") {
      throw new ApplyError("apply-failed", "remove entries must be column ids");
    }
    if (!eligible.has(key)) {
      throw new ApplyError("apply-failed", `"${key}" cannot be removed`);
    }
    nextRemove.push(key);
  }
  return nextRemove;
}

function validatedAggregationsPatch(
  body: Record<string, unknown>,
  observation: AgentObservation
): AgentAggregationsPatch {
  const restoreDefaults = body.restoreDefaults === true;
  const set = body.set;
  const remove = body.remove;
  if (restoreDefaults && (set !== undefined || remove !== undefined)) {
    throw new ApplyError(
      "apply-failed",
      "restoreDefaults cannot be combined with set or remove"
    );
  }
  if (restoreDefaults) return { restoreDefaults: true };
  const eligible = eligibleAggregationColumns(observation);
  const nextSet = set === undefined ? {} : aggregationSetEntries(set, eligible);
  const nextRemove =
    remove === undefined ? [] : aggregationRemoveKeys(remove, eligible);
  if (Object.keys(nextSet).length === 0 && nextRemove.length === 0) {
    throw new ApplyError(
      "apply-failed",
      "set, remove or restoreDefaults is required"
    );
  }
  return {
    ...(Object.keys(nextSet).length > 0 ? { set: nextSet } : {}),
    ...(nextRemove.length > 0 ? { remove: nextRemove } : {}),
  };
}

function applySetAggregations(
  apply: AgentApply,
  body: Record<string, unknown>,
  observation: AgentObservation,
  guard: SessionGuard
): Record<string, unknown> {
  assertApply(apply, "setAggregations");
  const latest = guard.observe();
  if (latest.viewRevision !== observation.viewRevision) {
    throw new ApplyError(
      "revision-mismatch",
      `expected revision ${observation.viewRevision}, table is at ${latest.viewRevision}`
    );
  }
  if (!guard.isEnabled("view.setAggregations", latest)) {
    throw new ApplyError(
      "not-wired",
      "view.setAggregations is not wired on this table"
    );
  }
  apply.setAggregations(validatedAggregationsPatch(body, latest));
  const pending = latest.source.grouping === "server";
  return {
    ok: true,
    revision: latest.viewRevision + 1,
    applied: !pending,
    pending,
  };
}

/**
 * The pages an observation describes.
 *
 * A host that states its own {@link AgentPagination} is the authority. One
 * that still supplies only `pageMax` is read as naming a page count, which is
 * what the field has always meant even where a binding filled it with a row
 * count — those bindings are fixed; this keeps a host that has not been.
 */
function observedPagination(observation: AgentObservation): AgentPagination {
  return (
    observation.pagination ??
    agentPagination({
      page: observation.page,
      pageSize: observation.limit,
      totalRows: observation.pageMax * observation.limit,
      canJump: true,
    })
  );
}

function assertApply<K extends keyof AgentApply>(
  apply: AgentApply,
  name: K
): asserts apply is AgentApply & Required<Pick<AgentApply, K>> {
  if (apply[name] === undefined) {
    throw new ApplyError("not-wired", `${String(name)} is not wired`);
  }
}

/** Side-effect-free proposal for a built-in write. */
async function planBuiltIn(
  key: CapabilityKey,
  context: AgentCapabilityContext,
  args: unknown,
  guard: SessionGuard
): Promise<CapabilityPlan> {
  const { observation, apply } = context;
  const body = args as Record<string, unknown>;
  switch (key) {
    case "edit.cells":
      return planCells(body, observation, apply, guard);
    case "rows.add":
      return planAdd(body);
    case "rows.delete":
      return planDelete(body);
    case "rows.reorder":
      return planReorder(body);
    default:
      return { proposals: [] };
  }
}

/**
 * Validate a column pin request against what this table actually allows.
 *
 * The column has to be one the agent was told about, and it has to be
 * pinnable — a column the host marked unpinnable is not addressable here just
 * because its key is known. The end edge belongs to the table's trailing
 * actions column, which is chrome the agent never sees, so a data column
 * asking for it is told why rather than silently pinned to the wrong side.
 */
function pinColumnArgs(
  body: Record<string, unknown>,
  observation: AgentObservation
): [string, "start" | "end" | undefined] {
  const key = String(body.key);
  const column = observation.columns.find((candidate) => candidate.id === key);
  if (!column) {
    throw new ApplyError("apply-failed", `unknown column "${key}"`);
  }
  const side = body.side as "start" | "end" | null | undefined;
  if (side === undefined || side === null) return [key, undefined];
  if (column.pinnable === false) {
    throw new ApplyError("apply-failed", `column "${key}" is not pinnable`);
  }
  if (side === "end") {
    throw new ApplyError(
      "apply-failed",
      `column "${key}" pins to the start edge only`
    );
  }
  return [key, side];
}

/** The row-ref half of a pin request, without its `side`. */
function rowRefBody(body: Record<string, unknown>): Record<string, unknown> {
  const ref: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(body)) {
    if (name !== "side") ref[name] = value;
  }
  return ref;
}

/**
 * Refuse a row that is chrome rather than data.
 *
 * Summary rows carry a reserved id, and pinning one would ask the table to
 * pin a total to the top of itself. `resolveRow` rejects anything that is not
 * a real row, so this only has to name the case the host could still hand
 * back.
 */
function assertPinnableRow(rowKey: string): void {
  if (isPinnedSummaryRowId(rowKey)) {
    throw new ApplyError(
      "apply-failed",
      `"${rowKey}" is a summary row, not a data row`
    );
  }
}

async function dispatchBuiltIn(
  key: CapabilityKey,
  context: AgentCapabilityContext,
  args: unknown,
  guard: SessionGuard
): Promise<unknown> {
  const { observation, apply } = context;
  const body = args as Record<string, unknown>;
  switch (key) {
    case "columns.describe":
      return { columns: observation.columns };
    case "view.describe":
      return {
        page: observation.page,
        limit: observation.limit,
        search: observation.search,
        sortBy: observation.sortBy ?? null,
        sortDir: observation.sortDir ?? null,
        groupBy: observation.groupBy ?? null,
        pinnedColumns: observation.pinnedColumns ?? {},
        pinnedRows: observation.pinnedRows ?? { top: [], bottom: [] },
        filters: observation.filters ?? null,
        availableFilters: observation.availableFilters,
        revision: observation.viewRevision,
      };
    case "view.setPage": {
      // Checked against what this source says its pages are, mechanically and
      // on this side of the wire: a page number is arithmetic, and arithmetic
      // is the last thing a model should be trusted with.
      const pages = observedPagination(observation);
      const refusal =
        pageRefusal(pages, body.page) ??
        (typeof body.limit === "number"
          ? pageSizeRefusal(pages, body.limit)
          : undefined);
      if (refusal) throw new ApplyError("apply-failed", refusal);
      const page = body.page as number;
      if (typeof body.limit === "number") {
        assertApply(apply, "setLimit");
      }
      assertApply(apply, "setPage");
      apply.setPage(page);
      if (typeof body.limit === "number") {
        apply.setLimit!(body.limit);
      }
      return { ok: true, revision: observation.viewRevision + 1 };
    }
    case "view.setSort": {
      const sortKey = body.key as string | null | undefined;
      // The contract publishes `sortable` per column, and a reader's own sort
      // control is disabled for a column that is not. An agent reading that
      // contract and then sorting anyway would be doing something the table
      // told it it could not — and something the person sitting in front of
      // the table cannot do either. Clearing the sort is always allowed.
      if (sortKey) {
        const column = observation.columns.find(
          (entry) => entry.id === sortKey
        );
        if (!column) {
          throw new ApplyError(
            "apply-failed",
            `unknown column "${sortKey}"; this table offers ${observation.columns.map((entry) => entry.id).join(", ")}`
          );
        }
        if (!column.sortable) {
          const sortable = observation.columns
            .filter((entry) => entry.sortable)
            .map((entry) => entry.id);
          throw new ApplyError(
            "apply-failed",
            sortable.length > 0
              ? `column "${sortKey}" is not sortable; this table sorts by ${sortable.join(", ")}`
              : `column "${sortKey}" is not sortable, and no column on this table is`
          );
        }
      }
      assertApply(apply, "setSort");
      apply.setSort(
        sortKey ?? undefined,
        body.dir as "asc" | "desc" | undefined
      );
      return { ok: true, revision: observation.viewRevision + 1 };
    }
    case "view.setSearch":
      assertApply(apply, "setSearch");
      apply.setSearch(typeof body.query === "string" ? body.query : "");
      return { ok: true, revision: observation.viewRevision + 1 };
    case "view.setFilters":
      assertApply(apply, "setFilters");
      apply.setFilters(
        extrasFromAgentFilters(body.filters, observation.availableFilters)
      );
      return { ok: true, revision: observation.viewRevision + 1 };
    case "view.setGroupBy": {
      const groupKey = body.key as string | null | undefined;
      assertApply(apply, "setGroupBy");
      apply.setGroupBy(groupKey ?? undefined);
      return { ok: true, revision: observation.viewRevision + 1 };
    }
    case "view.setAggregations":
      return applySetAggregations(apply, body, observation, guard);
    case "view.pinColumn": {
      assertApply(apply, "pinColumn");
      apply.pinColumn(...pinColumnArgs(body, observation));
      return { ok: true, revision: observation.viewRevision + 1 };
    }
    case "view.pinRow": {
      assertApply(apply, "pinRow");
      const side = body.side as "top" | "bottom" | null;
      // Resolving through the same path edits use means a position is read
      // against the revision it was seen at, and a key that names no data row
      // fails here rather than pinning nothing.
      const resolved = await resolveRowArg(
        rowRefBody(body),
        observation,
        apply
      );
      // Resolving is an awaited boundary: the row that answered has to still
      // be addressable in the view this request was authorized against.
      const latest = guard.observe();
      if (latest.viewRevision !== observation.viewRevision) {
        throw new ApplyError(
          "revision-mismatch",
          `expected revision ${observation.viewRevision}, table is at ${latest.viewRevision}`
        );
      }
      if (!guard.isEnabled("view.pinRow", latest)) {
        throw new ApplyError(
          "not-wired",
          `capability "view.pinRow" is not wired on this table`
        );
      }
      assertPinnableRow(resolved.rowKey);
      apply.pinRow(resolved.rowKey, side ?? undefined);
      return { ok: true, revision: observation.viewRevision + 1 };
    }
    case "view.setSelection": {
      const ids = body.ids as readonly string[] | undefined;
      assertApply(apply, "setSelection");
      apply.setSelection(ids);
      return { ok: true, revision: observation.viewRevision + 1 };
    }
    case "views.apply":
      assertApply(apply, "applyView");
      apply.applyView(String(body.viewId));
      return { ok: true, revision: observation.viewRevision + 1 };
    case "rows.read":
      return readRows(body, observation, apply, guard);
    case "rows.resolve":
      return resolveRowArg(body, observation, apply);
    case "export.run":
      assertApply(apply, "runExport");
      return apply.runExport(String(body.format));
    case "edit.cells":
      return applyCells(context);
    case "rows.add":
      return applyAdd(context);
    case "rows.delete":
      return applyDelete(context);
    case "rows.reorder":
      return applyReorder(context);
  }
}

function redactedIds(columns: readonly AgentColumn[]): string[] {
  return columns
    .filter((column) => !column.readable)
    .map((column) => column.id);
}

function writableColumn(
  columns: readonly AgentColumn[],
  id: string
): AgentColumn {
  const column = columns.find((entry) => entry.id === id);
  if (!column) {
    throw new ApplyError(
      "unknown-column",
      `column "${id}" is not on this table`
    );
  }
  if (!column.writable) {
    throw new ApplyError(
      "column-not-writable",
      `column "${id}" is not writable`
    );
  }
  return column;
}

function assertScope(
  scope: RowAddressScope | undefined,
  observation: AgentObservation
): RowAddressScope {
  const resolved = scope ?? observation.rowAddressScope;
  if (resolved === "full" && observation.source.fullDataset !== true) {
    throw new ApplyError(
      "scope-denied",
      "scope full requires source.fullDataset"
    );
  }
  return resolved;
}

/**
 * Read a row window. The allowlist comes from the CURRENT declaration and is
 * re-derived after the host callback returns, so an over-returning callback,
 * an undeclared column or a tightened ceiling cannot disclose data the table
 * does not permit right now.
 */
async function readRows(
  body: Record<string, unknown>,
  observation: AgentObservation,
  apply: AgentApply,
  guard: SessionGuard
): Promise<RowProvenanceEnvelope> {
  const requestedScope = body.scope as RowAddressScope | undefined;
  const scope = assertScope(requestedScope, observation);
  const readMax = readMaxOf(observation);
  const offset = boundedInt(body.offset, 0);
  const limit = Math.min(boundedInt(body.limit, readMax), readMax);
  const wanted = body.columns as readonly string[] | undefined;
  const allow = readableAllowlist(observation.columns, wanted);
  const query: RowReadQuery = {
    offset,
    limit,
    columns: [...allow],
    scope,
  };
  const window = apply.readRows
    ? await Promise.resolve(apply.readRows(query))
    : { rows: [], offset, limit, redacted: redactedIds(observation.columns) };

  // The awaited callback is a boundary: re-authorize before disclosing.
  const latest = guard.observe();
  if (latest.viewRevision !== observation.viewRevision) {
    throw new ApplyError(
      "revision-mismatch",
      `expected revision ${observation.viewRevision}, table is at ${latest.viewRevision}`
    );
  }
  if (!guard.isEnabled("rows.read", latest)) {
    throw new ApplyError(
      "not-wired",
      `capability "rows.read" is not wired on this table`
    );
  }
  assertScope(requestedScope, latest);
  const permitted = Math.min(limit, readMaxOf(latest));
  // Labelled here, once, so every path that can put rows in front of a model
  // carries it: the HTTP `read` tool, the JSON and MCP adapters, and anything
  // later that calls `rows.read`. Rows are somebody's data and are input from
  // outside the system; handing them over as bare cell text invites a value to
  // be read as an instruction.
  return rowProvenance(
    projectWindow(
      window,
      readableAllowlist(latest.columns, wanted),
      latest.columns,
      offset,
      permitted
    ),
    latest.viewRevision
  );
}

/** Rows as what they are: somebody's data, read at one revision. */
function rowProvenance(
  rows: RowWindow,
  revision: number
): RowProvenanceEnvelope {
  return { source: "table-rows", untrusted: true, revision, rows };
}

function isRowKeyRef(
  value: Record<string, unknown>
): value is { rowKey: string } {
  return typeof value.rowKey === "string" && value.rowKey.length > 0;
}

function asRowRef(
  value: Record<string, unknown>,
  fallbackRevision?: number
): RowRef {
  if (isRowKeyRef(value)) return { rowKey: value.rowKey };
  if (typeof value.position === "number") {
    const scope = (value.scope as RowAddressScope | undefined) ?? "visible";
    const expectedRevision =
      typeof value.expectedRevision === "number"
        ? value.expectedRevision
        : fallbackRevision;
    if (typeof expectedRevision !== "number") {
      throw new ApplyError(
        "invalid-arguments",
        "position refs require expectedRevision"
      );
    }
    return {
      position: value.position,
      scope,
      expectedRevision,
    };
  }
  throw new ApplyError(
    "invalid-arguments",
    "a rowKey or 1-based position is required"
  );
}

async function resolveRowArg(
  body: Record<string, unknown>,
  observation: AgentObservation,
  apply: AgentApply
): Promise<ResolvedRow> {
  const ref = asRowRef(body);
  if ("position" in ref) {
    assertScope(ref.scope, observation);
    if (ref.expectedRevision !== observation.viewRevision) {
      throw new ApplyError(
        "revision-mismatch",
        `expected revision ${ref.expectedRevision}, table is at ${observation.viewRevision}`
      );
    }
  }
  if (!apply.resolveRow) {
    throw new ApplyError("apply-failed", "resolveRow is not wired");
  }
  return apply.resolveRow(ref);
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
function isDecomposable(
  plan: CapabilityPlan,
  definition: AgentCapabilityDefinition
): boolean {
  if (plan.perItem !== true) return false;
  if ((definition.partial ?? "unsupported") !== "supported") return false;
  if (!Array.isArray(plan.payload)) return false;
  return (plan.payload as readonly unknown[]).length === plan.proposals.length;
}

/** A decision, and which rows it covered when it did not cover all of them. */
interface ApprovalDecision {
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

async function decideApproval(
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
function narrowPlan(
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

function bindApprove(
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

function writePayload(
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

interface CellEdit {
  rowKey: string;
  column: string;
  value: unknown;
}

async function planCells(
  body: Record<string, unknown>,
  observation: AgentObservation,
  apply: AgentApply,
  guard: SessionGuard
): Promise<CapabilityPlan> {
  const edits = body.edits as Record<string, unknown>[];
  if (!Array.isArray(edits) || edits.length === 0) {
    throw new ApplyError("invalid-arguments", "at least one edit is required");
  }
  const resolved: CellEdit[] = [];
  const proposals: WriteProposal[] = [];
  for (const edit of edits) {
    if (typeof edit.column !== "string") {
      throw new ApplyError("invalid-arguments", "each edit requires a column");
    }
    writableColumn(observation.columns, edit.column);
    const ref = asRowRef(edit, observation.viewRevision);
    const row = await resolveRowArg(
      "rowKey" in ref ? { rowKey: ref.rowKey } : { ...ref },
      observation,
      apply
    );
    const before = await peekCell(apply, observation, row.rowKey, edit.column);
    // resolveRow and the peek both awaited host code.
    const latest = guard.observe();
    if (latest.viewRevision !== observation.viewRevision) {
      throw new ApplyError(
        "revision-mismatch",
        `expected revision ${observation.viewRevision}, table is at ${latest.viewRevision}`
      );
    }
    writableColumn(latest.columns, edit.column);
    resolved.push({
      rowKey: row.rowKey,
      column: edit.column,
      value: edit.value,
    });
    proposals.push({
      rowKey: row.rowKey,
      column: edit.column,
      before,
      after: edit.value,
    });
  }
  return { proposals, payload: resolved, perItem: true };
}

async function applyCells(
  context: AgentCapabilityContext
): Promise<WriteExecuteResult> {
  const { observation, apply, plan } = context;
  const resolved = (plan?.payload ?? []) as CellEdit[];
  const proposals = plan?.proposals ?? [];
  const commit = context.commit ?? commitOf(observation);
  if (commit === "stage") {
    if (!apply.stageCells) {
      return writePayload(
        proposals,
        false,
        "not-required",
        resolved.map((edit) => ({
          rowKey: edit.rowKey,
          column: edit.column,
          ok: true,
        }))
      );
    }
    context.throwIfCancelled();
    await Promise.resolve(apply.stageCells(resolved));
    return writePayload(proposals, true, "not-required");
  }
  if (!apply.editCells) {
    throw new ApplyError("not-wired", "editCells is not wired");
  }
  const outcome = await applyEach(
    resolved,
    async (edit) => {
      await Promise.resolve(apply.editCells?.([edit]));
    },
    context.throwIfCancelled
  );
  return writePayload(
    proposals,
    outcome.applied,
    "not-required",
    outcome.results
  );
}

/**
 * A bound `readRows`, as a plain function rather than a method reference.
 *
 * Reading it off the apply object as a method would leave `this` implicit at
 * the call site, which the linter is right to refuse.
 */
type ReadRowWindow = (query: RowReadQuery) => Promise<RowWindow> | RowWindow;

/**
 * The value a write is about to replace, as the MODEL is allowed to see it.
 *
 * Read at the agent's own addressing scope and through the same readable
 * column allowlist as `rows.read`, because this value travels: it lands in
 * `WriteProposal.before`, which the session returns and an HTTP or MCP
 * continuation sends back to the backend. A wider read here would be a
 * disclosure with a comment on it.
 *
 * A row the current scope does not reach therefore has no before-value here,
 * and that is correct. What the human approving the write sees is resolved
 * separately, from the table they are already looking at — see
 * `@adapttable/ai-react`.
 */
async function peekCell(
  apply: AgentApply,
  observation: AgentObservation,
  rowKey: string,
  column: string
): Promise<unknown> {
  if (!apply.readRows) return undefined;
  const read: ReadRowWindow = (query) =>
    apply.readRows?.(query) ?? {
      offset: 0,
      limit: 0,
      redacted: [],
      rows: [],
    };
  const readMax = readMaxOf(observation);
  let offset = 0;
  for (let page = 0; page < 256; page++) {
    const window = await Promise.resolve(
      read({
        offset,
        limit: readMax,
        columns: [column],
        scope: observation.rowAddressScope,
      })
    );
    const row = window.rows.find((entry) => entry.rowKey === rowKey);
    if (row) return row.cells[column];
    if (window.rows.length < readMax) break;
    offset += readMax;
  }
  return undefined;
}

function planAdd(body: Record<string, unknown>): CapabilityPlan {
  const rows = body.rows as Record<string, unknown>[];
  const proposals: WriteProposal[] = rows.map((row, index) => ({
    rowKey:
      typeof row.rowKey === "string" ? row.rowKey : `new:${String(index + 1)}`,
    after: row,
  }));
  return { proposals, payload: rows, perItem: true };
}

async function applyAdd(
  context: AgentCapabilityContext
): Promise<WriteExecuteResult> {
  const { apply, plan } = context;
  const rows = (plan?.payload ?? []) as Record<string, unknown>[];
  assertApply(apply, "addRows");
  context.throwIfCancelled();
  await Promise.resolve(apply.addRows(rows));
  return writePayload(plan?.proposals ?? [], true, "not-required");
}

function planDelete(body: Record<string, unknown>): CapabilityPlan {
  const keys = body.keys as string[];
  const proposals: WriteProposal[] = keys.map((rowKey) => ({ rowKey }));
  return { proposals, payload: keys, perItem: true };
}

async function applyDelete(
  context: AgentCapabilityContext
): Promise<WriteExecuteResult> {
  const { apply, plan } = context;
  const keys = (plan?.payload ?? []) as string[];
  assertApply(apply, "deleteRows");
  const outcome = await applyEach(
    keys.map((rowKey) => ({ rowKey })),
    async (entry) => {
      await Promise.resolve(apply.deleteRows?.([entry.rowKey]));
    },
    context.throwIfCancelled
  );
  return writePayload(
    plan?.proposals ?? [],
    outcome.applied,
    "not-required",
    outcome.results
  );
}

function planReorder(body: Record<string, unknown>): CapabilityPlan {
  const fromKey = String(body.fromKey);
  const toKey = String(body.toKey);
  const proposals: WriteProposal[] = [
    { rowKey: fromKey, after: toKey },
    { rowKey: toKey, before: fromKey },
  ];
  return { proposals, payload: { fromKey, toKey } };
}

async function applyReorder(
  context: AgentCapabilityContext
): Promise<WriteExecuteResult> {
  const { apply, plan } = context;
  const { fromKey, toKey } = (plan?.payload ?? {}) as {
    fromKey: string;
    toKey: string;
  };
  assertApply(apply, "reorderRows");
  context.throwIfCancelled();
  await Promise.resolve(apply.reorderRows(fromKey, toKey));
  return writePayload(plan?.proposals ?? [], true, "not-required");
}

class BulkFailure extends Error {
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
async function applyEach<T extends { rowKey: string; column?: string }>(
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

export { AGENT_SCHEMA_VERSION } from "./keys";
