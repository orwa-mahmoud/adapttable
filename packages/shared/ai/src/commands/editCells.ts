/** `edit.cells`: the one built-in write with a staging path. */
import type {
  AgentApply,
  AgentColumn,
  AgentObservation,
  RowReadQuery,
  RowWindow,
  WriteExecuteResult,
  WriteProposal,
} from "../types";
import { columnNames, findColumn } from "./columnLookup";
import {
  ApplyError,
  assertUnmoved,
  type CommandCall,
  type TableCommand,
} from "./command";
import { asRowRef, readMaxOf, resolveRowArg } from "./rowAddress";
import { objectSchema, ROW_REF_PROPERTIES, WRITE_RESULT } from "./schema";
import { applyEach, writePayload } from "./writeResult";

interface CellEdit {
  rowKey: string;
  column: string;
  value: unknown;
}

/**
 * Refuse a value the column cannot hold.
 *
 * A column that declared itself a number is a promise to whoever reads it,
 * and a host applying `Number("185 thousand")` writes NaN into its own data
 * and shows it to the reader. The model asked for something the table cannot
 * do, so the table says so rather than passing it on: a refusal names the
 * column and costs a retry, where a coercion costs the value.
 */
function assertWritableValue(column: AgentColumn, value: unknown): void {
  if (column.type !== "number") return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  throw new ApplyError(
    "invalid-arguments",
    `column "${column.id}" takes a number, not ${JSON.stringify(value)}`
  );
}

function writableColumn(
  columns: readonly AgentColumn[],
  id: string
): AgentColumn {
  const column = findColumn(columns, id);
  if (!column) {
    throw new ApplyError(
      "unknown-column",
      `column "${id}" is not on this table; it has ${columnNames(columns)}`
    );
  }
  if (!column.writable) {
    const writable = columns
      .filter((entry) => entry.writable)
      .map((entry) => entry.id);
    throw new ApplyError(
      "column-not-writable",
      writable.length > 0
        ? `column "${id}" is not writable; this table writes ${writable.join(", ")}`
        : `column "${id}" is not writable, and no column on this table is`
    );
  }
  return column;
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
 * separately, from the table they are already looking at.
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

async function previewCells(call: CommandCall) {
  const { observation, apply } = call.context;
  const edits = call.body.edits as Record<string, unknown>[];
  if (!Array.isArray(edits) || edits.length === 0) {
    throw new ApplyError("invalid-arguments", "at least one edit is required");
  }
  const resolved: CellEdit[] = [];
  const proposals: WriteProposal[] = [];
  for (const edit of edits) {
    if (typeof edit.column !== "string") {
      throw new ApplyError("invalid-arguments", "each edit requires a column");
    }
    const target = writableColumn(observation.columns, edit.column);
    assertWritableValue(target, edit.value);
    // The table's own column id from here on: a host reads the cell it owns,
    // and a proposal the reader approves names the column the table draws.
    const column = target.id;
    const ref = asRowRef(edit, observation.viewRevision);
    const row = await resolveRowArg(
      "rowKey" in ref ? { rowKey: ref.rowKey } : { ...ref },
      observation,
      apply
    );
    const before = await peekCell(apply, observation, row.rowKey, column);
    // resolveRow and the peek both awaited host code.
    const latest = call.guard.observe();
    assertUnmoved(observation, latest);
    writableColumn(latest.columns, column);
    resolved.push({ rowKey: row.rowKey, column, value: edit.value });
    proposals.push({ rowKey: row.rowKey, column, before, after: edit.value });
  }
  return { proposals, payload: resolved, perItem: true };
}

async function applyCells({
  context,
}: CommandCall): Promise<WriteExecuteResult> {
  const { apply, plan } = context;
  const resolved = (plan?.payload ?? []) as CellEdit[];
  const proposals = plan?.proposals ?? [];
  const commit = context.commit ?? context.observation.commit ?? "stage";
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

export const editCellsCommand: TableCommand<"edit.cells"> = {
  key: "edit.cells",
  summary: "Change the value of one or more cells.",
  guide:
    "Propose cell writes. Each edit needs a rowKey or a 1-based position. Resolves the row before writing so a sort or page change cannot target the wrong record.",
  input: objectSchema(
    {
      edits: {
        type: "array",
        items: objectSchema(
          {
            column: { type: "string", minLength: 1 },
            value: {},
            ...ROW_REF_PROPERTIES,
          },
          ["column"]
        ),
      },
    },
    ["edits"]
  ),
  output: WRITE_RESULT,
  kind: "write",
  staging: "supported",
  partial: "supported",
  idempotent: true,
  // Read from the wired channel, never from a feature name: cell, row and
  // batch editing compose under three different ids, and a table editable
  // through any of them hands the agent a real write path. `hasEdit` is
  // already that answer — it is true only where a host callback or a
  // composed editing channel exists.
  isEnabled: (observation) =>
    observation.hasEdit && observation.writePolicy === "allow",
  preview: previewCells,
  apply: applyCells,
};
