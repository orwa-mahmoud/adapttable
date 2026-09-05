import { errorMessage } from "./errorMessage";
import { guideOf, summaryOf } from "./guides";
import {
  type ApprovalPolicy,
  CAPABILITY_KEYS,
  type CapabilityKey,
  type CommitPolicy,
  DESTRUCTIVE_KEYS,
  type RowAddressScope,
  WRITE_KEYS,
  type WriteKey,
} from "./keys";
import { buildManifest, enabledKeys } from "./manifest";
import type {
  AgentApply,
  AgentColumn,
  AgentObservation,
  AgentSession,
  ApprovalOutcome,
  CapabilityGuide,
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
}

function isCapabilityKey(key: string): key is CapabilityKey {
  return (CAPABILITY_KEYS as readonly string[]).includes(key);
}

function isWriteKey(key: CapabilityKey): key is WriteKey {
  return (WRITE_KEYS as readonly string[]).includes(key);
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

function needsApproval(key: CapabilityKey, policy: ApprovalPolicy): boolean {
  if (policy === "never") return false;
  if (policy === "destructive") {
    return (DESTRUCTIVE_KEYS as readonly string[]).includes(key);
  }
  return isWriteKey(key);
}

class ApplyError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

interface ReplayRecord {
  readonly capabilityKey: CapabilityKey;
  readonly fingerprint: string;
  readonly result: ExecuteResult;
}

function executeFingerprint(key: string, args: unknown): string {
  return JSON.stringify({ key, args: args ?? {} });
}

function storeReplay(
  replay: Map<string, ReplayRecord>,
  idempotencyKey: string,
  key: string,
  args: unknown,
  result: ExecuteResult
): void {
  if (!isCapabilityKey(key)) return;
  replay.set(idempotencyKey, {
    capabilityKey: key,
    fingerprint: executeFingerprint(key, args),
    result,
  });
}

function filterRowWindow(
  window: RowWindow,
  observation: AgentObservation,
  wanted?: readonly string[]
): RowWindow {
  const hidden = new Set(redactedIds(observation.columns));
  const rows = window.rows.map((row) => {
    const cells: Record<string, unknown> = {};
    for (const [id, value] of Object.entries(row.cells)) {
      if (hidden.has(id)) continue;
      if (wanted && !wanted.includes(id)) continue;
      cells[id] = value;
    }
    return { rowKey: row.rowKey, cells };
  });
  return {
    rows,
    offset: window.offset,
    limit: window.limit,
    redacted: [...hidden],
  };
}

function refreshReplayResult(
  record: ReplayRecord,
  key: string,
  observe: () => AgentObservation
): ExecuteResult {
  const observation = observe();
  if (record.capabilityKey === "rows.read" && record.result.ok) {
    const body = record.result.result as RowWindow;
    return {
      ...record.result,
      revision: observation.viewRevision,
      result: filterRowWindow(body, observation),
    };
  }
  if (record.capabilityKey === "columns.describe" && record.result.ok) {
    return {
      ...record.result,
      revision: observation.viewRevision,
      result: { columns: observation.columns },
    };
  }
  if (key === "rows.read" || key === "columns.describe") {
    return {
      ...record.result,
      revision: observation.viewRevision,
    };
  }
  return record.result;
}

function assertImmediateCommit(
  key: CapabilityKey,
  observation: AgentObservation
): void {
  if (commitOf(observation) === "stage") {
    throw new ApplyError(
      "commit-incompatible",
      `${key} requires commit: immediate on this table`
    );
  }
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
  const replay = new Map<string, ReplayRecord>();
  const inflight = new Map<string, Promise<ExecuteResult>>();

  const catalog = (): CatalogEntry[] => {
    const observation = options.observe();
    return enabledKeys(observation).map((key) => ({
      key,
      summary: summaryOf(key),
    }));
  };

  const describe = (key: string): CapabilityGuide => {
    if (!isCapabilityKey(key)) {
      throw new Error(`unknown capability "${key}"`);
    }
    const enabled = enabledKeys(options.observe());
    if (!enabled.includes(key)) {
      throw new Error(`capability "${key}" is not wired on this table`);
    }
    return guideOf(key);
  };

  const runExecute = async (
    key: string,
    args: unknown,
    expectedRevision: number,
    idempotencyKey: string,
    signal?: AbortSignal
  ): Promise<ExecuteResult> => {
    const fail = (code: string, message: string): ExecuteResult => {
      const result: ExecuteResult = {
        ok: false,
        revision: options.observe().viewRevision,
        idempotencyKey,
        error: { code, message },
      };
      if (code !== "cancelled" && code !== "revision-mismatch") {
        storeReplay(replay, idempotencyKey, key, args, result);
      }
      return result;
    };

    if (!isCapabilityKey(key)) {
      return fail("unknown-capability", `unknown capability "${key}"`);
    }

    const observation = options.observe();
    if (!enabledKeys(observation).includes(key)) {
      return fail(
        "not-wired",
        `capability "${key}" is not wired on this table`
      );
    }
    if (expectedRevision !== observation.viewRevision) {
      return fail(
        "revision-mismatch",
        `expected revision ${expectedRevision}, table is at ${observation.viewRevision}`
      );
    }

    const guide = guideOf(key);
    const invalid = validateSchema(guide.input, args ?? {});
    if (invalid) return fail("invalid-arguments", invalid);

    try {
      const payload = await dispatch(
        key,
        args ?? {},
        observation,
        options.apply,
        options.observe,
        bindApprove(options.onApprove, signal)
      );
      if (
        isWriteResult(payload) &&
        (payload.approval === "pending" || payload.approval === "cancelled") &&
        !payload.applied
      ) {
        return {
          ok: payload.approval === "pending",
          revision: options.observe().viewRevision,
          idempotencyKey,
          result: payload.approval === "pending" ? payload : undefined,
          error:
            payload.approval === "cancelled"
              ? { code: "cancelled", message: "approval cancelled" }
              : undefined,
        };
      }
      const next = options.observe();
      const result: ExecuteResult = {
        ok: true,
        revision: next.viewRevision,
        idempotencyKey,
        result: payload,
      };
      storeReplay(replay, idempotencyKey, key, args, result);
      return result;
    } catch (error) {
      if (error instanceof ApplyError) {
        if (error.code === "cancelled") {
          return {
            ok: false,
            revision: options.observe().viewRevision,
            idempotencyKey,
            error: { code: "cancelled", message: error.message },
          };
        }
        return fail(error.code, error.message);
      }
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
    const cached = replay.get(idempotencyKey);
    if (cached) {
      const fingerprint = executeFingerprint(key, args);
      if (cached.fingerprint !== fingerprint) {
        return Promise.resolve({
          ok: false,
          revision: options.observe().viewRevision,
          idempotencyKey,
          error: {
            code: "idempotency-mismatch",
            message:
              "idempotency key was already used for a different capability or payload",
          },
        });
      }
      return Promise.resolve(refreshReplayResult(cached, key, options.observe));
    }
    const running = inflight.get(idempotencyKey);
    if (running) return running;

    const pending = runExecute(
      key,
      args,
      expectedRevision,
      idempotencyKey,
      signal
    );
    inflight.set(idempotencyKey, pending);
    return pending.finally(() => {
      inflight.delete(idempotencyKey);
    });
  };

  return {
    catalog,
    describe,
    execute,
    manifest: () => buildManifest(options.observe()),
  };
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

function assertApply<K extends keyof AgentApply>(
  apply: AgentApply,
  name: K
): asserts apply is AgentApply & Required<Pick<AgentApply, K>> {
  if (apply[name] === undefined) {
    throw new ApplyError("not-wired", `${String(name)} is not wired`);
  }
}

async function dispatch(
  key: CapabilityKey,
  args: unknown,
  observation: AgentObservation,
  apply: AgentApply,
  observe: () => AgentObservation,
  onApprove?: (proposal: unknown, signal?: AbortSignal) => Promise<boolean>
): Promise<unknown> {
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
      return readRows(body, observation, apply);
    case "rows.resolve":
      return resolveRowArg(body, observation, apply);
    case "export.run":
      assertApply(apply, "runExport");
      return apply.runExport(String(body.format));
    case "edit.cells":
      return mutateCells(body, observation, apply, observe, onApprove);
    case "rows.add":
      return mutateAdd(body, observation, apply, observe, onApprove);
    case "rows.delete":
      return mutateDelete(body, observation, apply, observe, onApprove);
    case "rows.reorder":
      return mutateReorder(body, observation, apply, observe, onApprove);
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

async function readRows(
  body: Record<string, unknown>,
  observation: AgentObservation,
  apply: AgentApply
): Promise<RowWindow> {
  const scope = assertScope(
    body.scope as RowAddressScope | undefined,
    observation
  );
  const offset = body.offset as number;
  const requested = body.limit as number;
  const limit = Math.min(requested, readMaxOf(observation));
  const wanted = body.columns as readonly string[] | undefined;
  const hidden = new Set(redactedIds(observation.columns));
  const query: RowReadQuery = { offset, limit, columns: wanted, scope };
  const window = apply.readRows
    ? await Promise.resolve(apply.readRows(query))
    : { rows: [], offset, limit, redacted: [...hidden] };
  const rows = window.rows.map((row) => {
    const cells: Record<string, unknown> = {};
    for (const [id, value] of Object.entries(row.cells)) {
      if (hidden.has(id)) continue;
      if (wanted && !wanted.includes(id)) continue;
      cells[id] = value;
    }
    return { rowKey: row.rowKey, cells };
  });
  return {
    rows,
    offset: window.offset,
    limit: window.limit,
    redacted: [...hidden],
  };
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
  key: CapabilityKey,
  observation: AgentObservation,
  proposal: unknown,
  onApprove?: (proposal: unknown, signal?: AbortSignal) => Promise<boolean>
): Promise<ApprovalOutcome> {
  if (!needsApproval(key, approvalOf(observation))) return "not-required";
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

async function mutateCells(
  body: Record<string, unknown>,
  observation: AgentObservation,
  apply: AgentApply,
  observe: () => AgentObservation,
  onApprove?: (proposal: unknown) => Promise<boolean>
): Promise<WriteExecuteResult> {
  const edits = body.edits as Record<string, unknown>[];
  if (!Array.isArray(edits) || edits.length === 0) {
    throw new ApplyError("invalid-arguments", "at least one edit is required");
  }
  const resolved: { rowKey: string; column: string; value: unknown }[] = [];
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
  return finishWrite(
    "edit.cells",
    observation,
    proposals,
    observe,
    onApprove,
    async () => {
      const commit = commitOf(observation);
      if (commit === "stage") {
        if (!apply.stageCells) {
          return {
            applied: false,
            results: resolved.map((edit) => ({
              rowKey: edit.rowKey,
              column: edit.column,
              ok: true,
            })),
          };
        }
        await Promise.resolve(apply.stageCells(resolved));
        return { applied: true };
      }
      if (!apply.editCells) {
        throw new ApplyError("not-wired", "editCells is not wired");
      }
      return applyEach(resolved, async (edit) => {
        await Promise.resolve(apply.editCells?.([edit]));
      });
    }
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

async function mutateAdd(
  body: Record<string, unknown>,
  observation: AgentObservation,
  apply: AgentApply,
  observe: () => AgentObservation,
  onApprove?: (proposal: unknown) => Promise<boolean>
): Promise<WriteExecuteResult> {
  assertImmediateCommit("rows.add", observation);
  const rows = body.rows as Record<string, unknown>[];
  const proposals: WriteProposal[] = rows.map((row, index) => ({
    rowKey:
      typeof row.rowKey === "string" ? row.rowKey : `new:${String(index + 1)}`,
    after: row,
  }));
  return finishWrite(
    "rows.add",
    observation,
    proposals,
    observe,
    onApprove,
    async () => {
      assertApply(apply, "addRows");
      await Promise.resolve(apply.addRows(rows));
      return { applied: true };
    }
  );
}

async function mutateDelete(
  body: Record<string, unknown>,
  observation: AgentObservation,
  apply: AgentApply,
  observe: () => AgentObservation,
  onApprove?: (proposal: unknown) => Promise<boolean>
): Promise<WriteExecuteResult> {
  assertImmediateCommit("rows.delete", observation);
  const keys = body.keys as string[];
  const proposals: WriteProposal[] = keys.map((rowKey) => ({ rowKey }));
  return finishWrite(
    "rows.delete",
    observation,
    proposals,
    observe,
    onApprove,
    async () => {
      assertApply(apply, "deleteRows");
      return applyEach(
        keys.map((rowKey) => ({ rowKey })),
        async (entry) => {
          await Promise.resolve(apply.deleteRows?.([entry.rowKey]));
        }
      );
    }
  );
}

async function mutateReorder(
  body: Record<string, unknown>,
  observation: AgentObservation,
  apply: AgentApply,
  observe: () => AgentObservation,
  onApprove?: (proposal: unknown) => Promise<boolean>
): Promise<WriteExecuteResult> {
  assertImmediateCommit("rows.reorder", observation);
  const fromKey = String(body.fromKey);
  const toKey = String(body.toKey);
  const proposals: WriteProposal[] = [
    { rowKey: fromKey, after: toKey },
    { rowKey: toKey, before: fromKey },
  ];
  return finishWrite(
    "rows.reorder",
    observation,
    proposals,
    observe,
    onApprove,
    async () => {
      assertApply(apply, "reorderRows");
      await Promise.resolve(apply.reorderRows(fromKey, toKey));
      return { applied: true };
    }
  );
}

async function finishWrite(
  key: CapabilityKey,
  observation: AgentObservation,
  proposals: readonly WriteProposal[],
  observe: () => AgentObservation,
  onApprove: ((proposal: unknown) => Promise<boolean>) | undefined,
  applyWrite: () => Promise<{
    applied: boolean;
    results?: readonly WriteRowResult[];
  }>
): Promise<WriteExecuteResult> {
  const approval = await decideApproval(key, observation, proposals, onApprove);
  if (approval === "pending" || approval === "rejected") {
    return writePayload(proposals, false, approval);
  }
  const latest = observe();
  if (latest.viewRevision !== observation.viewRevision) {
    throw new ApplyError(
      "revision-mismatch",
      `expected revision ${observation.viewRevision}, table is at ${latest.viewRevision}`
    );
  }
  try {
    const outcome = await applyWrite();
    return writePayload(proposals, outcome.applied, approval, outcome.results);
  } catch (error) {
    if (error instanceof BulkFailure) {
      return writePayload(proposals, false, approval, error.results);
    }
    throw error;
  }
}

class BulkFailure extends Error {
  readonly results: readonly WriteRowResult[];
  constructor(results: readonly WriteRowResult[]) {
    super("bulk write reported per-row failures");
    this.results = results;
  }
}

async function applyEach<T extends { rowKey: string; column?: string }>(
  items: readonly T[],
  write: (item: T) => Promise<void>
): Promise<{ applied: boolean; results: WriteRowResult[] }> {
  const results: WriteRowResult[] = [];
  for (const item of items) {
    try {
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
