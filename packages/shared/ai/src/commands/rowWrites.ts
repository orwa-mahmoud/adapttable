/** `rows.add`, `rows.delete` and `rows.reorder`: writes through host callbacks. */
import type {
  AgentObservation,
  CapabilityPlan,
  WriteExecuteResult,
  WriteProposal,
} from "../types";
import {
  ApplyError,
  assertApply,
  assertUnmoved,
  type CommandCall,
  hasFeature,
  type TableCommand,
} from "./command";
import { resolveRowArg } from "./rowAddress";
import { ID, objectSchema, ROW_REF_PROPERTIES, WRITE_RESULT } from "./schema";
import { applyEach, writePayload } from "./writeResult";

/** A write the table offers only where the host allows writes. */
function writable(observation: AgentObservation, wired: boolean): boolean {
  return wired && observation.writePolicy === "allow";
}

async function applyAdd({ context }: CommandCall): Promise<WriteExecuteResult> {
  const { apply, plan } = context;
  const rows = (plan?.payload ?? []) as Record<string, unknown>[];
  assertApply(apply, "addRows");
  context.throwIfCancelled();
  await Promise.resolve(apply.addRows(rows));
  return writePayload(plan?.proposals ?? [], true, "not-required");
}

/** Every add appends another row, so a repeat is never a no-op. */
export const addRowsCommand: TableCommand<"rows.add"> = {
  key: "rows.add",
  summary: "Add rows through the host callback.",
  guide:
    "Add rows through the host add callback. Never writes the table's own copy.",
  input: objectSchema({ rows: { type: "array", items: { type: "object" } } }, [
    "rows",
  ]),
  output: WRITE_RESULT,
  kind: "write",
  staging: "unsupported",
  partial: "supported",
  idempotent: false,
  isEnabled: (observation) =>
    writable(observation, observation.hasAdd === true),
  preview: ({ body }): Promise<CapabilityPlan> => {
    const rows = body.rows as Record<string, unknown>[];
    const proposals: WriteProposal[] = rows.map((row, index) => ({
      rowKey:
        typeof row.rowKey === "string"
          ? row.rowKey
          : `new:${String(index + 1)}`,
      after: row,
    }));
    return Promise.resolve({ proposals, payload: rows, perItem: true });
  },
  apply: applyAdd,
};

/**
 * Turn a delete request into the row keys it actually names.
 *
 * Deletion addresses rows the way every other row-targeting command does: a
 * stable `rowKey`, or a 1-based `position` in the named scope. An agent
 * usually knows which row a reader means — the one it is looking at — and not
 * the opaque key behind it, so resolving here is what makes the request
 * expressible at all. It is also what keeps it honest: a reference that names
 * no row is refused while the plan is still a proposal, rather than reaching
 * the host's delete callback to remove nothing and report success.
 */
async function previewDelete(call: CommandCall): Promise<CapabilityPlan> {
  const { observation, apply } = call.context;
  const rows = call.body.rows as Record<string, unknown>[];
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new ApplyError("invalid-arguments", "at least one row is required");
  }
  const keys: string[] = [];
  for (const row of rows) {
    const resolved = await resolveRowArg(row, observation, apply);
    // Resolving awaited host code: the row that answered has to still be
    // addressable in the view this deletion was authorized against.
    assertUnmoved(observation, call.guard.observe());
    keys.push(resolved.rowKey);
  }
  const proposals: WriteProposal[] = keys.map((rowKey) => ({ rowKey }));
  return { proposals, payload: keys, perItem: true };
}

async function applyDelete({
  context,
}: CommandCall): Promise<WriteExecuteResult> {
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

export const deleteRowsCommand: TableCommand<"rows.delete"> = {
  key: "rows.delete",
  summary: "Delete rows, by rowKey or position, through the host callback.",
  guide:
    "Delete rows through the host delete callback. Each row needs a rowKey or a 1-based position. Resolves every row before deleting, so a row that names nothing is refused before anything is removed. This is destructive.",
  input: objectSchema(
    {
      rows: { type: "array", items: objectSchema({ ...ROW_REF_PROPERTIES }) },
    },
    ["rows"]
  ),
  output: WRITE_RESULT,
  kind: "destructive",
  staging: "unsupported",
  partial: "supported",
  idempotent: true,
  isEnabled: (observation) =>
    writable(observation, observation.hasDelete === true),
  preview: previewDelete,
  apply: applyDelete,
};

async function applyReorder({
  context,
}: CommandCall): Promise<WriteExecuteResult> {
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

/** A row move reads its own two keys and is one indivisible change. */
export const reorderRowsCommand: TableCommand<"rows.reorder"> = {
  key: "rows.reorder",
  summary: "Reorder rows through the host callback.",
  guide: "Move a row through the host reorder callback.",
  input: objectSchema({ fromKey: ID, toKey: ID }, ["fromKey", "toKey"]),
  output: WRITE_RESULT,
  kind: "write",
  staging: "unsupported",
  partial: "unsupported",
  idempotent: true,
  isEnabled: (observation) =>
    hasFeature(observation, "row-reorder") &&
    writable(observation, observation.hasReorder),
  preview: ({ body }): Promise<CapabilityPlan> => {
    const fromKey = String(body.fromKey);
    const toKey = String(body.toKey);
    const proposals: WriteProposal[] = [
      { rowKey: fromKey, after: toKey },
      { rowKey: toKey, before: fromKey },
    ];
    return Promise.resolve({ proposals, payload: { fromKey, toKey } });
  },
  apply: applyReorder,
};
