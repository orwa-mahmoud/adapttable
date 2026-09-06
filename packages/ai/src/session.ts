import {
  type CapabilityRegistry,
  createCapabilityRegistry,
} from "./capabilities/registry";
import { errorMessage } from "./errorMessage";
import { summaryOf } from "./guides";
import {
  type ApprovalPolicy,
  type CapabilityKey,
  type CommitPolicy,
  type RowAddressScope,
} from "./keys";
import { buildManifest } from "./manifest";
import type {
  AgentApply,
  AgentCapabilityContext,
  AgentCapabilityDefinition,
  AgentColumn,
  AgentObservation,
  AgentSession,
  ApprovalOutcome,
  CapabilityGuide,
  CapabilityPlan,
  CatalogEntry,
  ExecuteResult,
  ResolvedRow,
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
  onApprove?: (proposal: unknown, signal?: AbortSignal) => Promise<boolean>;
  /** Custom governed capabilities registered on this table session. */
  capabilities?: readonly AgentCapabilityDefinition[];
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
    }
  );
  const guard: SessionGuard = {
    observe: () => options.observe(),
    isEnabled: (key, observation) =>
      registry.enabledKeys(observation).includes(key),
  };

  const catalog = (): CatalogEntry[] => {
    const observation = options.observe();
    return registry.enabledKeys(observation).map((key) => ({
      key,
      summary: registry.get(key)?.summary ?? summaryOf(key as CapabilityKey),
    }));
  };

  const describe = (key: string): CapabilityGuide => {
    if (!registry.has(key)) {
      throw new Error(`unknown capability "${key}"`);
    }
    const enabled = registry.enabledKeys(options.observe());
    if (!enabled.includes(key)) {
      throw new Error(`capability "${key}" is not wired on this table`);
    }
    return registry.describe(key);
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

    const subject =
      plan.proposals.length > 0
        ? plan.proposals
        : { capability: key, arguments: args ?? {} };
    const approval = await decideApproval(definition, entry, subject, approve);
    if (approval === "pending" || approval === "rejected") {
      return writePayload(plan.proposals, false, approval);
    }
    throwIfCancelled();
    revalidate(key, entry, true);

    const context: AgentCapabilityContext = {
      ...baseContext,
      plan,
      commit,
    };
    // The last moment before the handler can touch the host. Nothing has been
    // written yet, so a cancellation here leaves the key free to be retried.
    throwIfCancelled();
    state.invokedWrite = true;
    try {
      const payload = await definition.execute(context, args);
      return decorateWrite(payload, plan, approval);
    } catch (error) {
      if (error instanceof BulkFailure) {
        return writePayload(plan.proposals, false, approval, error.results);
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
    args: unknown,
    expectedRevision: number,
    idempotencyKey: string,
    signal?: AbortSignal
  ): Promise<ExecuteResult> => {
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
  const window = record.result.result as RowWindow;
  const wanted = body.columns as readonly string[] | undefined;
  const allow = readableAllowlist(observation.columns, wanted);
  const limit = Math.min(window.limit, readMaxOf(observation));
  return {
    ...record.result,
    revision: observation.viewRevision,
    result: projectWindow(
      window,
      allow,
      observation.columns,
      window.offset,
      limit
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
        revision: observation.viewRevision,
      };
    case "view.setPage": {
      const page = body.page as number;
      if (page > observation.pageMax) {
        throw new ApplyError(
          "apply-failed",
          `page ${page} exceeds pageMax ${observation.pageMax}`
        );
      }
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
      apply.setFilters(body.filters);
      return { ok: true, revision: observation.viewRevision + 1 };
    case "view.setGroupBy": {
      const groupKey = body.key as string | null | undefined;
      assertApply(apply, "setGroupBy");
      apply.setGroupBy(groupKey ?? undefined);
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
): Promise<RowWindow> {
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
  return projectWindow(
    window,
    readableAllowlist(latest.columns, wanted),
    latest.columns,
    offset,
    permitted
  );
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

async function decideApproval(
  definition: AgentCapabilityDefinition,
  observation: AgentObservation,
  proposal: unknown,
  onApprove: ((proposal: unknown) => Promise<boolean>) | undefined
): Promise<ApprovalOutcome> {
  if (!needsApproval(definition, approvalOf(observation))) {
    return "not-required";
  }
  if (!onApprove) return "pending";
  const allowed = await onApprove(proposal);
  return allowed ? "approved" : "rejected";
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
    return new Promise<boolean>((resolve, reject) => {
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
  results?: readonly WriteRowResult[]
): WriteExecuteResult {
  return { proposals, applied, approval, results };
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
  return { proposals, payload: resolved };
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

async function peekCell(
  apply: AgentApply,
  observation: AgentObservation,
  rowKey: string,
  column: string
): Promise<unknown> {
  if (!apply.readRows) return undefined;
  const readMax = readMaxOf(observation);
  let offset = 0;
  for (let page = 0; page < 256; page++) {
    const window = await Promise.resolve(
      apply.readRows({
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
  return { proposals, payload: rows };
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
  return { proposals, payload: keys };
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
  throwIfCancelled: () => void = () => undefined
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
