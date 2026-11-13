/** `view.setGroupBy` and `view.setAggregations`. */
import { withAggregationBag } from "../liveSchemas";
import type {
  AgentAggregationColumn,
  AgentAggregationsPatch,
  AgentObservation,
  CapabilityGuide,
} from "../types";
import { asRecord, columnAsKey, isStringOrNull, renameArg } from "./argNames";
import { describeColumnChoice, findColumn } from "./columnLookup";
import {
  ApplyError,
  assertApply,
  hasFeature,
  recheck,
  type TableCommand,
} from "./command";
import { objectSchema, okWith } from "./schema";

/**
 * Whether the agent may change how the table is grouped.
 *
 * The grouping PANEL, never the static feature. `grouping(key)` reimposes its
 * key on every render, so a setter offered against it reports a change the
 * table has already undone — a live model said "grouped by status" over a
 * table still grouped by team. Grouping is offered only where it is live
 * state the reader drives too.
 */
function canRegroup(observation: AgentObservation): boolean {
  if (!hasFeature(observation, "grouping-panel")) return false;
  return observation.source.grouping !== false;
}

/**
 * Whether the agent may change what a group summarises.
 *
 * Either grouping feature can show aggregates — reading a total does not move
 * the grouping — but only a table that can group at all, and only when some
 * column is actually eligible.
 */
function canAggregate(observation: AgentObservation): boolean {
  if (
    !hasFeature(observation, "grouping") &&
    !hasFeature(observation, "grouping-panel")
  ) {
    return false;
  }
  if (observation.source.grouping === false) return false;
  return (observation.aggregations?.columns.length ?? 0) > 0;
}

/** Group by a column, or clear it, and say which the table is holding. */
export const setGroupByCommand: TableCommand<"view.setGroupBy"> = {
  key: "view.setGroupBy",
  summary: "Change or clear grouping.",
  guide:
    "Group rows by a column id. The parameter is named `key`, NOT " +
    "`column`. Pass null to clear grouping. The result carries the column " +
    "the table is now grouped by, or null.",
  input: objectSchema({ key: { type: ["string", "null"] } }),
  output: okWith({ groupBy: { type: ["string", "null"] } }),
  kind: "view",
  staging: "unsupported",
  partial: "unsupported",
  idempotent: true,
  isEnabled: canRegroup,
  // The capability is called `setGroupBy`, so `groupBy` is the name a model
  // reaches for — and the guide that says otherwise is the first thing a
  // compact context defers.
  normalize: (record) =>
    renameArg(columnAsKey(record), "groupBy", "key", isStringOrNull),
  describe: describeColumnChoice("key", () => true, true),
  apply: ({ context: { apply, observation }, body }) => {
    const asked = body.key as string | null | undefined;
    assertApply(apply, "setGroupBy");
    // Resolved where the table published the column, passed through where it
    // did not: grouping publishes no per-column permission, so a key this
    // contract does not name is the host's business rather than a mistake.
    const groupKey = asked
      ? (findColumn(observation.columns, asked)?.id ?? asked)
      : undefined;
    apply.setGroupBy(groupKey);
    return {
      ok: true,
      revision: observation.viewRevision + 1,
      groupBy: groupKey ?? null,
    };
  },
};

/** Spoken names a caller writes when the table takes the short id. */
const AGGREGATION_IDS: Readonly<Record<string, string>> = {
  average: "avg",
  mean: "avg",
  total: "sum",
};

function spokenAggregationIds(
  set: unknown
): Record<string, unknown> | undefined {
  const bag = asRecord(set);
  if (!bag) return undefined;
  const next = { ...bag };
  for (const [column, operation] of Object.entries(next)) {
    if (typeof operation !== "string") continue;
    const id = AGGREGATION_IDS[operation.trim().toLowerCase()];
    if (id) next[column] = id;
  }
  return next;
}

/**
 * `setAggregations` taking `set` reads as a detail of this API, while
 * `aggregations` is the word the capability itself uses. Spoken operation
 * names (`average`) become the ids the table takes (`avg`).
 */
function normalizeAggregationArgs(
  record: Record<string, unknown>
): Record<string, unknown> {
  if (
    !("set" in record) &&
    !("remove" in record) &&
    !("restoreDefaults" in record) &&
    asRecord(record.aggregations)
  ) {
    record.set = record.aggregations;
    delete record.aggregations;
  }
  const next = spokenAggregationIds(record.set);
  if (next !== undefined) record.set = next;
  return record;
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
                .map((operation) =>
                  operation.description
                    ? `${operation.id} (${operation.label}) — ${operation.description}`
                    : `${operation.id} (${operation.label})`
                )
                .join(", ")}]`
          )
          .join("; ") +
        ".";
  const input = withAggregationBag(guide.input, columns);
  return {
    ...guide,
    guide: guide.guide + listed,
    ...(input ? { input } : {}),
  };
}

type EligibleColumns = ReadonlyMap<string, AgentAggregationColumn>;

function eligibleAggregationColumns(
  observation: AgentObservation
): EligibleColumns {
  return new Map(
    (observation.aggregations?.columns ?? []).map((column) => [
      column.id,
      column,
    ])
  );
}

function aggregationSetEntries(
  set: unknown,
  eligible: EligibleColumns
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
      // Named, so the next attempt is the caller's to make rather than a
      // second guess: a refusal that says only "no" leaves whoever sent it
      // with the same information it had, and "invalid-arguments" is what
      // tells a turn this is worth one repair round.
      const offered = column?.operations.map((operation) => operation.id) ?? [];
      throw new ApplyError(
        "invalid-arguments",
        offered.length > 0
          ? `"${key}" cannot use operation "${operationId}" — it takes ${offered.join(", ")}`
          : `"${key}" cannot use operation "${operationId}"`
      );
    }
    nextSet[key] = operationId;
  }
  return nextSet;
}

function aggregationRemoveKeys(
  remove: unknown,
  eligible: EligibleColumns
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

export const setAggregationsCommand: TableCommand<"view.setAggregations"> = {
  key: "view.setAggregations",
  summary: "Add, change, remove or restore group aggregations.",
  guide:
    "Add or change specific column aggregations without replacing the " +
    "others, remove specific aggregations (suppression when a default or " +
    "host baseline would otherwise return), or restore developer defaults. " +
    "`restoreDefaults` cannot be combined with `set` or `remove`. The " +
    "whole request is validated before anything is applied. Eligible " +
    "columns and operation ids are listed when this capability is " +
    "described against the live table. Send those ids (`avg`), never the " +
    "English word (`average`). Never send a calculate function.",
  input: objectSchema({
    set: {
      type: "object",
      additionalProperties: { type: "string", minLength: 1 },
    },
    remove: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
    restoreDefaults: { type: "boolean" },
  }),
  output: okWith({
    applied: { type: "boolean" },
    pending: { type: "boolean" },
  }),
  kind: "view",
  staging: "unsupported",
  partial: "unsupported",
  idempotent: true,
  isEnabled: canAggregate,
  normalize: normalizeAggregationArgs,
  describe: describeAggregations,
  apply: (call) => {
    const { apply } = call.context;
    assertApply(apply, "setAggregations");
    const latest = recheck(
      call,
      "view.setAggregations",
      "view.setAggregations is not wired on this table"
    );
    apply.setAggregations(validatedAggregationsPatch(call.body, latest));
    const pending = latest.source.grouping === "server";
    return {
      ok: true,
      revision: latest.viewRevision + 1,
      applied: !pending,
      pending,
    };
  },
};
