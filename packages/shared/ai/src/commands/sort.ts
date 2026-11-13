/** `view.setSort`. */
import type { AgentObservation } from "../types";
import { asRecord, columnAsKey, pickString } from "./argNames";
import { columnNames, describeColumnChoice, findColumn } from "./columnLookup";
import { ApplyError, assertApply, type TableCommand } from "./command";
import { objectSchema, okWith } from "./schema";

/**
 * The direction a caller asked for, in the two words the schema takes.
 *
 * Case and surrounding space never distinguish one direction from the other,
 * and `DESC` is not a different sort from `desc` — so folding them here means
 * the reader sees their sort rather than "$.dir must be one of". A word that
 * is neither still travels on and is refused by the schema, which names both.
 */
function normalizeDir(value: string): string {
  const wanted = value.trim().toLocaleLowerCase();
  if (wanted === "descending" || wanted === "highest") return "desc";
  if (wanted === "ascending" || wanted === "lowest") return "asc";
  if (wanted === "desc" || wanted === "asc") return wanted;
  return value;
}

function normalizeSortArgs(
  record: Record<string, unknown>
): Record<string, unknown> {
  columnAsKey(record);
  const nested = asRecord(record.sort);
  if (typeof record.sort === "string" && !("key" in record)) {
    record.key = record.sort;
    delete record.sort;
  }
  if (nested) {
    if (!("key" in record)) {
      record.key = pickString(nested, "key", "column", "id");
    }
    const nestedDir = pickString(nested, "dir", "direction", "order");
    if (record.dir == null && nestedDir) record.dir = normalizeDir(nestedDir);
    delete record.sort;
  }
  if (!("key" in record)) {
    record.key = pickString(record, "sortBy", "field");
    delete record.sortBy;
    delete record.field;
  }
  if (record.dir == null) {
    const dir = pickString(record, "direction", "order", "sortDir");
    if (dir) {
      record.dir = normalizeDir(dir);
      delete record.direction;
      delete record.order;
      delete record.sortDir;
    }
  }
  // The field the guide asks for gets the same reading as its near-misses: a
  // direction spelled `DESC` was the only one it could have been.
  if (typeof record.dir === "string") record.dir = normalizeDir(record.dir);
  return record;
}

/**
 * Why this table will not sort by that column, or `undefined`.
 *
 * `sortable` is published per column, and a reader's own sort control is
 * disabled for a column without it. An agent reading that contract and sorting
 * anyway would be doing something the person in front of the table cannot.
 * Clearing a sort names no column, so it is always allowed.
 */
function sortRefusal(
  observation: AgentObservation,
  sortKey: string | null | undefined
): string | undefined {
  if (!sortKey) return undefined;
  // A table that published no columns has said nothing about sorting, and an
  // absence is not a restriction: the host wiring `setSort` is the permission.
  // Where columns exist, they are the contract and the rules below apply.
  if (observation.columns.length === 0) return undefined;
  const column = findColumn(observation.columns, sortKey);
  if (!column) {
    const offered = columnNames(observation.columns);
    return `unknown column "${sortKey}"; this table offers ${offered}`;
  }
  if (column.sortable) return undefined;
  const sortable = observation.columns
    .filter((entry) => entry.sortable)
    .map((entry) => entry.id);
  return sortable.length > 0
    ? `column "${sortKey}" is not sortable; this table sorts by ${sortable.join(", ")}`
    : `column "${sortKey}" is not sortable, and no column on this table is`;
}

/**
 * Change or clear the sort, and say which sort landed.
 *
 * Answered with what was applied for the same reason the filter is: a bare
 * `ok` leaves a caller unable to tell its own request from a guess, so it
 * asks again.
 */
export const setSortCommand: TableCommand<"view.setSort"> = {
  key: "view.setSort",
  summary: "Change or clear the sort.",
  guide:
    "Sort by a column id. The parameter is named `key`, NOT `column` — " +
    'pass the column\'s id as `key`, with `dir` of "asc" or "desc". ' +
    "Pass a null key to clear the sort. The result carries the sort that " +
    "was applied, so there is no need to send it again to check.",
  input: objectSchema({
    key: { type: ["string", "null"] },
    dir: { type: "string", enum: ["asc", "desc"] },
  }),
  output: okWith({
    sort: {
      type: ["object", "null"],
      additionalProperties: false,
      properties: {
        key: { type: "string" },
        dir: { type: "string", enum: ["asc", "desc"] },
      },
    },
  }),
  kind: "view",
  staging: "unsupported",
  partial: "unsupported",
  idempotent: true,
  isEnabled: (observation) => observation.hasSort,
  normalize: normalizeSortArgs,
  describe: describeColumnChoice(
    "key",
    (column) => column.sortable !== false,
    true
  ),
  apply: ({ context: { apply, observation }, body }) => {
    const asked = body.key as string | null | undefined;
    const refused = sortRefusal(observation, asked);
    if (refused) throw new ApplyError("apply-failed", refused);
    assertApply(apply, "setSort");
    // The table's own spelling, so the host sorts by a column it recognises
    // and the answer names the sort that landed rather than the one requested.
    const sortKey = asked
      ? (findColumn(observation.columns, asked)?.id ?? asked)
      : undefined;
    const dir = body.dir as "asc" | "desc" | undefined;
    apply.setSort(sortKey, dir);
    return {
      ok: true,
      revision: observation.viewRevision + 1,
      sort: sortKey ? { key: sortKey, dir: dir ?? "asc" } : null,
    };
  },
};
