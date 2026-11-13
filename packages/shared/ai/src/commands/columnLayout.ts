/** `view.pinColumn`, `view.hideColumn` and `view.setColumnOrder`. */
import { columnIds, withItemEnum } from "../liveSchemas";
import type { AgentApply, AgentObservation } from "../types";
import { columnAsKey, isStringOrNull, renameArg } from "./argNames";
import { describeColumnChoice, knownColumn } from "./columnLookup";
import {
  ApplyError,
  assertApply,
  type TableCommand,
  viewMoved,
} from "./command";
import { ID, ID_LIST, objectSchema, OK_OUTPUT } from "./schema";

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
  const column = knownColumn(observation, String(body.key));
  const key = column.id;
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

export const pinColumnCommand: TableCommand<"view.pinColumn"> = {
  key: "view.pinColumn",
  summary: "Pin or unpin a column at a logical edge.",
  guide:
    "Pin a column to the logical start edge, or unpin it with null. " +
    'Sides are logical, so start is the right edge under dir="rtl". ' +
    "Only columns reported pinnable may be pinned, and the end edge is " +
    "reserved for the table's trailing actions column.",
  input: objectSchema(
    {
      key: ID,
      side: { type: ["string", "null"], enum: ["start", "end", null] },
    },
    ["key"]
  ),
  output: OK_OUTPUT,
  kind: "view",
  staging: "unsupported",
  partial: "unsupported",
  idempotent: true,
  // Advertised from the wired operation, never from a feature name: a table
  // can compose the column menu and still hand the agent no way to change
  // the layout.
  isEnabled: (observation) =>
    observation.hasColumnPinning === true &&
    observation.columns.some((column) => column.pinnable !== false),
  // `pinColumn` takes `side`, and both its summary and its guide describe
  // pinning "to an edge" — so `edge` is the word the capability hands the
  // model on its way to the wrong argument name.
  normalize: (record) =>
    renameArg(columnAsKey(record), "edge", "side", isStringOrNull),
  describe: describeColumnChoice("key", (column) => column.pinnable !== false),
  apply: ({ context: { apply, observation }, body }) => {
    assertApply(apply, "pinColumn");
    apply.pinColumn(...pinColumnArgs(body, observation));
    return viewMoved(observation);
  },
  settlesView: true,
};

/**
 * Validate a hide request against the live columns.
 *
 * The last visible column stays on screen — the Columns menu will not hide
 * it either — and a column the host marked unhideable is only addressable
 * to show it again.
 */
function hideColumnArgs(
  body: Record<string, unknown>,
  observation: AgentObservation
): [string, boolean] {
  const column = knownColumn(observation, String(body.key));
  const hidden = body.hidden !== false;
  if (hidden && column.hideable === false) {
    throw new ApplyError(
      "apply-failed",
      `column "${column.id}" is not hideable`
    );
  }
  if (hidden && column.visible !== false) {
    const visible = observation.columns.filter(
      (entry) => entry.visible !== false
    );
    if (visible.length <= 1) {
      throw new ApplyError(
        "apply-failed",
        `cannot hide "${column.id}"; it is the last visible column`
      );
    }
  }
  return [column.id, hidden];
}

/** `visible` is the word the Columns menu uses; the capability takes `hidden`. */
function normalizeHideArgs(
  record: Record<string, unknown>
): Record<string, unknown> {
  columnAsKey(record);
  if (!("hidden" in record)) {
    if (record.visible === true) record.hidden = false;
    if (record.visible === false) record.hidden = true;
  }
  delete record.visible;
  return record;
}

export const hideColumnCommand: TableCommand<"view.hideColumn"> = {
  key: "view.hideColumn",
  summary: "Hide or show a column.",
  guide:
    "Hide or show a column the Columns menu can hide. Send the column " +
    "id and `hidden: true` to hide, or `hidden: false` to show it again. " +
    "The last visible column cannot be hidden.",
  input: objectSchema({ key: ID, hidden: { type: "boolean" } }, ["key"]),
  output: OK_OUTPUT,
  kind: "view",
  staging: "unsupported",
  partial: "unsupported",
  idempotent: true,
  isEnabled: (observation) =>
    observation.hasColumnHide === true &&
    observation.columns.some((column) => column.hideable !== false),
  normalize: normalizeHideArgs,
  describe: describeColumnChoice("key", (column) => column.hideable !== false),
  apply: ({ context: { apply, observation }, body }) => {
    assertApply(apply, "hideColumn");
    const [column, hidden] = hideColumnArgs(body, observation);
    apply.hideColumn(column, hidden);
    return { ...viewMoved(observation), key: column, hidden };
  },
  settlesView: true,
};

function resolveColumnOrder(
  asked: readonly unknown[],
  observation: AgentObservation
): string[] {
  const order = asked.map(
    (value) => knownColumn(observation, String(value)).id
  );
  const known = observation.columns.map((column) => column.id);
  const unique = new Set(order);
  if (
    unique.size !== known.length ||
    order.length !== known.length ||
    !known.every((id) => unique.has(id))
  ) {
    throw new ApplyError(
      "invalid-arguments",
      `order must list every column exactly once: ${known.join(", ")}`
    );
  }
  return order;
}

/** Move one column to an index, through `moveColumn` or a full order. */
function moveOneColumn(
  apply: AgentApply,
  body: Record<string, unknown>,
  observation: AgentObservation
): { key: string; index: number } {
  const asked = typeof body.key === "string" ? body.key : "";
  const index =
    typeof body.index === "number" ? Math.floor(body.index) : Number.NaN;
  if (!asked || !Number.isFinite(index)) {
    throw new ApplyError(
      "invalid-arguments",
      "setColumnOrder takes { key, index } or { order }"
    );
  }
  const column = knownColumn(observation, asked);
  const last = observation.columns.length - 1;
  if (index < 0 || index > last) {
    throw new ApplyError(
      "invalid-arguments",
      `index ${String(index)} is out of range; use 0–${String(last)}`
    );
  }
  if (apply.moveColumn) {
    apply.moveColumn(column.id, index);
  } else {
    assertApply(apply, "setColumnOrder");
    const current = observation.columns.map((entry) => entry.id);
    const from = current.indexOf(column.id);
    if (from !== -1) {
      current.splice(from, 1);
      current.splice(index, 0, column.id);
    }
    apply.setColumnOrder(current);
  }
  return { key: column.id, index };
}

/** Move one column or replace the full order, using the table's own ids. */
export const setColumnOrderCommand: TableCommand<"view.setColumnOrder"> = {
  key: "view.setColumnOrder",
  summary: "Reorder columns, including hidden ones.",
  guide:
    "Reorder columns the way the Columns menu does. Send `{ key, index }` " +
    "to move one column — index 0 is first, and the list includes hidden " +
    "columns — or `{ order }` with every column id exactly once.",
  input: objectSchema({
    key: ID,
    index: { type: "integer", minimum: 0 },
    order: ID_LIST,
  }),
  output: OK_OUTPUT,
  kind: "view",
  staging: "unsupported",
  partial: "unsupported",
  idempotent: true,
  isEnabled: (observation) =>
    observation.hasColumnOrder === true && observation.columns.length > 1,
  normalize: columnAsKey,
  describe: (guide, observation) => {
    const moved = describeColumnChoice("key", () => true)(guide, observation);
    const listed = columnIds(observation.columns, () => true);
    const input = withItemEnum(moved.input, "order", listed);
    return input ? { ...moved, input } : moved;
  },
  apply: ({ context: { apply, observation }, body }) => {
    if (Array.isArray(body.order)) {
      assertApply(apply, "setColumnOrder");
      const order = resolveColumnOrder(body.order, observation);
      apply.setColumnOrder(order);
      return { ...viewMoved(observation), order };
    }
    return {
      ...viewMoved(observation),
      ...moveOneColumn(apply, body, observation),
    };
  },
  settlesView: true,
};
