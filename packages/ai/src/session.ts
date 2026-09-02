import { guideOf, summaryOf } from "./guides";
import {
  AGENT_SCHEMA_VERSION,
  CAPABILITY_KEYS,
  type CapabilityKey,
} from "./keys";
import { buildManifest, enabledKeys } from "./manifest";
import type {
  AgentApply,
  AgentObservation,
  AgentSession,
  CapabilityGuide,
  CatalogEntry,
  ExecuteResult,
} from "./types";
import { validateSchema } from "./validate";

export interface CreateAgentSessionOptions {
  /** Latest wired state. Called on every catalog/describe/execute. */
  observe: () => AgentObservation;
  /** Apply a validated mutation to the live table. */
  apply: AgentApply;
}

function isCapabilityKey(key: string): key is CapabilityKey {
  return (CAPABILITY_KEYS as readonly string[]).includes(key);
}

/**
 * Provider-neutral three-stage session.
 *
 * Runtimes that support typed tools can wrap each `describe` result; the
 * generic catalog/describe/execute calls stay the portable fallback.
 */
export function createAgentSession(
  options: CreateAgentSessionOptions
): AgentSession {
  const replay = new Map<string, ExecuteResult>();

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

  const execute = async (
    key: string,
    args: unknown,
    expectedRevision: number,
    idempotencyKey: string
  ): Promise<ExecuteResult> => {
    const cached = replay.get(idempotencyKey);
    if (cached) return cached;

    const fail = (code: string, message: string): ExecuteResult => {
      const result: ExecuteResult = {
        ok: false,
        revision: options.observe().viewRevision,
        idempotencyKey,
        error: { code, message },
      };
      replay.set(idempotencyKey, result);
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
      const payload = await Promise.resolve(
        dispatch(key, args ?? {}, observation, options.apply)
      );
      const next = options.observe();
      const result: ExecuteResult = {
        ok: true,
        revision: next.viewRevision,
        idempotencyKey,
        result: payload,
      };
      replay.set(idempotencyKey, result);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return fail("apply-failed", message);
    }
  };

  return {
    catalog,
    describe,
    execute,
    manifest: () => buildManifest(options.observe()),
  };
}

function dispatch(
  key: CapabilityKey,
  args: unknown,
  observation: AgentObservation,
  apply: AgentApply
): unknown {
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
        throw new Error(`page ${page} exceeds pageMax ${observation.pageMax}`);
      }
      apply.setPage?.(page);
      if (typeof body.limit === "number") apply.setLimit?.(body.limit);
      return { ok: true, revision: observation.viewRevision + 1 };
    }
    case "view.setSort": {
      const sortKey = body.key as string | null | undefined;
      apply.setSort?.(
        sortKey ?? undefined,
        body.dir as "asc" | "desc" | undefined
      );
      return { ok: true, revision: observation.viewRevision + 1 };
    }
    case "view.setSearch":
      apply.setSearch?.(typeof body.query === "string" ? body.query : "");
      return { ok: true, revision: observation.viewRevision + 1 };
    case "view.setFilters":
      apply.setFilters?.(body.filters);
      return { ok: true, revision: observation.viewRevision + 1 };
    case "view.setGroupBy": {
      const groupKey = body.key as string | null | undefined;
      apply.setGroupBy?.(groupKey ?? undefined);
      return { ok: true, revision: observation.viewRevision + 1 };
    }
    case "export.run":
      return apply.runExport?.(String(body.format));
    case "edit.cells":
      return apply.editCells?.(
        body.edits as { rowKey: string; column: string; value: unknown }[]
      );
    case "rows.reorder":
      return apply.reorderRows?.(String(body.fromKey), String(body.toKey));
  }
}

export { AGENT_SCHEMA_VERSION };
