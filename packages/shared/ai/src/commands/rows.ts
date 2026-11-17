/** `rows.read`, `rows.resolve`, `view.pinRow` and `view.setSelection`. */
import { isPinnedSummaryRowId } from "@adapttable/core";

import type { RowAddressScope } from "../keys";
import type {
  ExecuteResult,
  RowProvenanceEnvelope,
  RowReadQuery,
} from "../types";
import { keyAsRowKey } from "./argNames";
import {
  ApplyError,
  assertApply,
  recheck,
  type TableCommand,
  viewMoved,
} from "./command";
import {
  assertScope,
  boundedInt,
  projectWindow,
  readableAllowlist,
  readMaxOf,
  redactedIds,
  resolveRowArg,
  rowProvenance,
} from "./rowAddress";
import {
  ID,
  ID_LIST,
  objectSchema,
  OK_OUTPUT,
  POSITION,
  ROW_KEY_OR_POSITION,
  SCOPE,
  STRING_LIST,
} from "./schema";

/**
 * Read a row window. The allowlist comes from the CURRENT declaration and is
 * re-derived after the host callback returns, so an over-returning callback,
 * an undeclared column or a tightened ceiling cannot disclose data the table
 * does not permit right now.
 */
export const readRowsCommand: TableCommand<"rows.read"> = {
  key: "rows.read",
  summary: "Read a bounded, redacted row window, each row with its rowKey.",
  guide:
    "Read a bounded, redacted row window from the current view. Each row comes back with the rowKey that addresses it, which is where a rowKey comes from — it is a host key, never a value on screen. offset counts from the start of the named scope, not of the dataset: with scope page it is 0 on every page, however far into the data that page sits. A window past the end of its scope comes back empty, which says nothing about whether the table has rows. Unreadable columns never appear. scope full requires a full-dataset source.",
  input: objectSchema(
    {
      offset: { type: "integer", minimum: 0 },
      limit: { type: "integer", minimum: 1 },
      columns: ID_LIST,
      scope: SCOPE,
    },
    ["offset", "limit"]
  ),
  // Rows arrive labelled as somebody's data, read at one revision.
  output: objectSchema({
    source: { type: "string", const: "table-rows" },
    untrusted: { type: "boolean", const: true },
    revision: { type: "integer", minimum: 1 },
    rows: objectSchema({
      rows: {
        type: "array",
        items: objectSchema({
          rowKey: { type: "string" },
          cells: { type: "object" },
        }),
      },
      offset: { type: "integer", minimum: 0 },
      limit: { type: "integer", minimum: 1 },
      redacted: STRING_LIST,
    }),
  }),
  kind: "read",
  staging: "unsupported",
  partial: "unsupported",
  idempotent: true,
  isEnabled: (observation) => observation.columns.length > 0,
  apply: async (call): Promise<RowProvenanceEnvelope> => {
    const { observation, apply } = call.context;
    const { body } = call;
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
    const latest = recheck(call, "rows.read");
    assertScope(requestedScope, latest);
    const permitted = Math.min(limit, readMaxOf(latest));
    // Labelled here, once, so every path that can put rows in front of a
    // model carries it: the HTTP `read` tool, the JSON and MCP adapters, and
    // anything later that calls `rows.read`. Rows are somebody's data and are
    // input from outside the system; handing them over as bare cell text
    // invites a value to be read as an instruction.
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
  },
  // A replayed read is re-derived against the CURRENT declaration, so a
  // column the host has since made unreadable does not come back out of the
  // cache.
  replay: (result: ExecuteResult, args, observation): ExecuteResult => {
    const body = (args ?? {}) as Record<string, unknown>;
    assertScope(body.scope as RowAddressScope | undefined, observation);
    const window = (result.result as RowProvenanceEnvelope).rows;
    const wanted = body.columns as readonly string[] | undefined;
    const allow = readableAllowlist(observation.columns, wanted);
    const limit = Math.min(window.limit, readMaxOf(observation));
    return {
      ...result,
      revision: result.revision,
      result: rowProvenance(
        projectWindow(window, allow, observation.columns, window.offset, limit),
        result.revision
      ),
    };
  },
};

export const resolveRowCommand: TableCommand<"rows.resolve"> = {
  key: "rows.resolve",
  summary: "Turn a 1-based position into a row key, or confirm one.",
  guide:
    "Turn a 1-based position in the named current view into its stable rowKey, or confirm a rowKey still addresses a row there. This is not a search: it cannot find a row from a name or any other cell value. Read the rows to get their keys.",
  input: ROW_KEY_OR_POSITION,
  output: objectSchema({
    rowKey: { type: "string" },
    scope: SCOPE,
    position: { type: "integer", minimum: 1 },
  }),
  kind: "view",
  staging: "unsupported",
  partial: "unsupported",
  idempotent: true,
  isEnabled: (observation) => observation.columns.length > 0,
  normalize: keyAsRowKey,
  apply: ({ context: { observation, apply }, body }) =>
    resolveRowArg(body, observation, apply),
};

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

export const pinRowCommand: TableCommand<"view.pinRow"> = {
  key: "view.pinRow",
  summary: "Pin or unpin a row above or below the body.",
  guide:
    "Pin a row above or below the scrolled body, or unpin it with null. " +
    "Address the row by stable rowKey, or by 1-based position with the " +
    "scope and expectedRevision that position was read at. Summary and " +
    "group rows are not data rows and cannot be pinned this way.",
  input: objectSchema(
    {
      rowKey: ID,
      position: POSITION,
      scope: SCOPE,
      expectedRevision: { type: "integer", minimum: 1 },
      side: { type: ["string", "null"], enum: ["top", "bottom", null] },
    },
    ["side"]
  ),
  output: OK_OUTPUT,
  kind: "view",
  staging: "unsupported",
  partial: "unsupported",
  idempotent: true,
  isEnabled: (observation) => observation.hasRowPinning === true,
  normalize: keyAsRowKey,
  apply: async (call) => {
    const { apply, observation } = call.context;
    assertApply(apply, "pinRow");
    const side = call.body.side as "top" | "bottom" | null;
    // Resolving through the same path edits use means a position is read
    // against the revision it was seen at, and a key that names no data row
    // fails here rather than pinning nothing.
    const resolved = await resolveRowArg(
      rowRefBody(call.body),
      observation,
      apply
    );
    // Resolving is an awaited boundary: the row that answered has to still
    // be addressable in the view this request was authorized against.
    recheck(call, "view.pinRow");
    assertPinnableRow(resolved.rowKey);
    apply.pinRow(resolved.rowKey, side ?? undefined);
    return viewMoved(observation);
  },
};

export const setSelectionCommand: TableCommand<"view.setSelection"> = {
  key: "view.setSelection",
  summary: "Replace or clear the current selection.",
  guide: "Replace the current selection with the given row keys, or clear it.",
  input: objectSchema({ ids: ID_LIST }),
  output: OK_OUTPUT,
  kind: "view",
  staging: "unsupported",
  partial: "unsupported",
  idempotent: true,
  isEnabled: (observation) => observation.hasSelection === true,
  apply: ({ context: { apply, observation }, body }) => {
    const ids = body.ids as readonly string[] | undefined;
    assertApply(apply, "setSelection");
    apply.setSelection(ids);
    return viewMoved(observation);
  },
  settlesView: true,
};
