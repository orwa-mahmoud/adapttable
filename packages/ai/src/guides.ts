import { AGENT_SCHEMA_VERSION, type CapabilityKey } from "./keys";
import type { CapabilityGuide, JsonSchema } from "./types";

const DRAFT = "https://json-schema.org/draft/2020-12/schema";

function objectSchema(
  properties: Record<string, JsonSchema>,
  required: readonly string[] = []
): JsonSchema {
  return {
    $schema: DRAFT,
    type: "object",
    additionalProperties: false,
    properties,
    required,
  };
}

const OK = objectSchema({
  ok: { type: "boolean", const: true },
  revision: { type: "integer", minimum: 1 },
});

const WRITE_RESULT = objectSchema({
  proposals: {
    type: "array",
    items: objectSchema({
      rowKey: { type: "string" },
      column: { type: "string" },
      before: {},
      after: {},
    }),
  },
  applied: { type: "boolean" },
  approval: {
    type: "string",
    enum: ["pending", "approved", "rejected", "cancelled", "not-required"],
  },
});

const ROW_KEY_OR_POSITION = objectSchema({
  rowKey: { type: "string", minLength: 1 },
  position: { type: "integer", minimum: 1 },
  scope: { type: "string", enum: ["visible", "page", "full"] },
  expectedRevision: { type: "integer", minimum: 1 },
});

const GUIDES: Record<CapabilityKey, Omit<CapabilityGuide, "schemaVersion">> = {
  "columns.describe": {
    key: "columns.describe",
    guide: "List readable and writable columns. Does not return row values.",
    input: objectSchema({}),
    output: objectSchema({
      columns: {
        type: "array",
        items: objectSchema({
          id: { type: "string" },
          label: { type: "string" },
          type: { type: "string" },
          readable: { type: "boolean" },
          writable: { type: "boolean" },
          sortable: { type: "boolean" },
        }),
      },
    }),
  },
  "view.describe": {
    key: "view.describe",
    guide:
      "Read the current page, sort, search, grouping, filters and revision. No rows.",
    input: objectSchema({}),
    output: objectSchema({
      page: { type: "integer", minimum: 1 },
      limit: { type: "integer", minimum: 1 },
      search: { type: "string" },
      sortBy: { type: ["string", "null"] },
      sortDir: { type: ["string", "null"] },
      groupBy: { type: ["string", "null"] },
      filters: {},
      revision: { type: "integer", minimum: 1 },
    }),
  },
  "view.setPage": {
    key: "view.setPage",
    guide: "Move to a 1-based page. Rejects a stale view revision.",
    input: objectSchema(
      {
        page: { type: "integer", minimum: 1 },
        limit: { type: "integer", minimum: 1 },
      },
      ["page"]
    ),
    output: OK,
  },
  "view.setSort": {
    key: "view.setSort",
    guide:
      "Sort by a column id. The parameter is named `key`, NOT `column` — " +
      'pass the column\'s id as `key`, with `dir` of "asc" or "desc". ' +
      "Pass a null key to clear the sort.",
    input: objectSchema({
      key: { type: ["string", "null"] },
      dir: { type: "string", enum: ["asc", "desc"] },
    }),
    output: OK,
  },
  "view.setSearch": {
    key: "view.setSearch",
    guide: "Set the toolbar search string. Empty string clears it.",
    input: objectSchema({ query: { type: "string" } }, ["query"]),
    output: OK,
  },
  "view.setFilters": {
    key: "view.setFilters",
    guide:
      "Replace the extra filter bag. Send `{}` to clear. Eligible filters, " +
      "operators and (when small enough) options are listed when this " +
      "capability is described against the live table. Use those extra-bag " +
      "keys — for a number filter that is `salaryMin` / `salaryMax` / " +
      "`salaryOp`, not `{ salary: { gt: 10000 } }`. You may also send an " +
      "array of `{ key, op, value }` conditions; they become the same bag. " +
      "Never invent a filter, operator or option that is not listed. The " +
      "result carries the bag that was applied, so there is no need to send " +
      "the same filter again in another shape.",
    input: objectSchema({ filters: {} }, ["filters"]),
    output: objectSchema({
      ok: { type: "boolean", const: true },
      revision: { type: "integer", minimum: 1 },
      filters: { type: "object" },
    }),
  },
  "view.setGroupBy": {
    key: "view.setGroupBy",
    guide:
      "Group rows by a column id. The parameter is named `key`, NOT " +
      "`column`. Pass null to clear grouping.",
    input: objectSchema({ key: { type: ["string", "null"] } }),
    output: OK,
  },
  "view.setAggregations": {
    key: "view.setAggregations",
    guide:
      "Add or change specific column aggregations without replacing the " +
      "others, remove specific aggregations (suppression when a default or " +
      "host baseline would otherwise return), or restore developer defaults. " +
      "`restoreDefaults` cannot be combined with `set` or `remove`. The " +
      "whole request is validated before anything is applied. Eligible " +
      "columns and operation ids are listed when this capability is " +
      "described against the live table. Never send a calculate function.",
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
    output: objectSchema({
      ok: { type: "boolean", const: true },
      revision: { type: "integer", minimum: 1 },
      applied: { type: "boolean" },
      pending: { type: "boolean" },
    }),
  },
  "view.pinColumn": {
    key: "view.pinColumn",
    guide:
      "Pin a column to the logical start edge, or unpin it with null. " +
      'Sides are logical, so start is the right edge under dir="rtl". ' +
      "Only columns reported pinnable may be pinned, and the end edge is " +
      "reserved for the table's trailing actions column.",
    input: objectSchema(
      {
        key: { type: "string", minLength: 1 },
        side: { type: ["string", "null"], enum: ["start", "end", null] },
      },
      ["key"]
    ),
    output: OK,
  },
  "view.pinRow": {
    key: "view.pinRow",
    guide:
      "Pin a row above or below the scrolled body, or unpin it with null. " +
      "Address the row by stable rowKey, or by 1-based position with the " +
      "scope and expectedRevision that position was read at. Summary and " +
      "group rows are not data rows and cannot be pinned this way.",
    input: objectSchema(
      {
        rowKey: { type: "string", minLength: 1 },
        position: { type: "integer", minimum: 1 },
        scope: { type: "string", enum: ["visible", "page", "full"] },
        expectedRevision: { type: "integer", minimum: 1 },
        side: { type: ["string", "null"], enum: ["top", "bottom", null] },
      },
      ["side"]
    ),
    output: OK,
  },
  "view.setSelection": {
    key: "view.setSelection",
    guide:
      "Replace the current selection with the given row keys, or clear it.",
    input: objectSchema({
      ids: { type: "array", items: { type: "string", minLength: 1 } },
    }),
    output: OK,
  },
  "views.apply": {
    key: "views.apply",
    guide: "Apply a saved view by id through the host saved-views path.",
    input: objectSchema({ viewId: { type: "string", minLength: 1 } }, [
      "viewId",
    ]),
    output: OK,
  },
  "rows.read": {
    key: "rows.read",
    guide:
      "Read a bounded, redacted row window from the current view. Each row comes back with the rowKey that addresses it, which is where a rowKey comes from — it is a host key, never a value on screen. offset counts from the start of the named scope, not of the dataset: with scope page it is 0 on every page, however far into the data that page sits. A window past the end of its scope comes back empty, which says nothing about whether the table has rows. Unreadable columns never appear. scope full requires a full-dataset source.",
    input: objectSchema(
      {
        offset: { type: "integer", minimum: 0 },
        limit: { type: "integer", minimum: 1 },
        columns: {
          type: "array",
          items: { type: "string", minLength: 1 },
        },
        scope: { type: "string", enum: ["visible", "page", "full"] },
      },
      ["offset", "limit"]
    ),
    output: objectSchema({
      rows: {
        type: "array",
        items: objectSchema({
          rowKey: { type: "string" },
          cells: { type: "object" },
        }),
      },
      offset: { type: "integer", minimum: 0 },
      limit: { type: "integer", minimum: 1 },
      redacted: { type: "array", items: { type: "string" } },
    }),
  },
  "rows.resolve": {
    key: "rows.resolve",
    guide:
      "Turn a 1-based position in the named current view into its stable rowKey, or confirm a rowKey still addresses a row there. This is not a search: it cannot find a row from a name or any other cell value. Read the rows to get their keys.",
    input: ROW_KEY_OR_POSITION,
    output: objectSchema({
      rowKey: { type: "string" },
      scope: { type: "string", enum: ["visible", "page", "full"] },
      position: { type: "integer", minimum: 1 },
    }),
  },
  "export.run": {
    key: "export.run",
    guide: "Start an export through the host's existing export path.",
    input: objectSchema({ format: { type: "string", minLength: 1 } }, [
      "format",
    ]),
    output: objectSchema({
      ok: { type: "boolean" },
      revision: { type: "integer", minimum: 1 },
    }),
  },
  "edit.cells": {
    key: "edit.cells",
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
              rowKey: { type: "string", minLength: 1 },
              position: { type: "integer", minimum: 1 },
              scope: { type: "string", enum: ["visible", "page", "full"] },
            },
            ["column"]
          ),
        },
      },
      ["edits"]
    ),
    output: WRITE_RESULT,
  },
  "rows.add": {
    key: "rows.add",
    guide:
      "Add rows through the host add callback. Never writes the table's own copy.",
    input: objectSchema(
      {
        rows: {
          type: "array",
          items: { type: "object" },
        },
      },
      ["rows"]
    ),
    output: WRITE_RESULT,
  },
  "rows.delete": {
    key: "rows.delete",
    guide:
      "Delete rows through the host delete callback. Each row needs a rowKey or a 1-based position. Resolves every row before deleting, so a row that names nothing is refused before anything is removed. This is destructive.",
    input: objectSchema(
      {
        rows: {
          type: "array",
          items: objectSchema({
            rowKey: { type: "string", minLength: 1 },
            position: { type: "integer", minimum: 1 },
            scope: { type: "string", enum: ["visible", "page", "full"] },
          }),
        },
      },
      ["rows"]
    ),
    output: WRITE_RESULT,
  },
  "rows.reorder": {
    key: "rows.reorder",
    guide: "Move a row through the host reorder callback.",
    input: objectSchema(
      {
        fromKey: { type: "string", minLength: 1 },
        toKey: { type: "string", minLength: 1 },
      },
      ["fromKey", "toKey"]
    ),
    output: WRITE_RESULT,
  },
};

const SUMMARIES: Record<CapabilityKey, string> = {
  "columns.describe": "List column metadata without row values.",
  "view.describe": "Read page, sort, search, grouping and filters.",
  "view.setPage": "Change the current page.",
  "view.setSort": "Change or clear the sort.",
  "view.setSearch": "Change the search query.",
  "view.setFilters": "Replace the active filters.",
  "view.setGroupBy": "Change or clear grouping.",
  "view.setAggregations": "Add, change, remove or restore group aggregations.",
  "view.pinColumn": "Pin or unpin a column at a logical edge.",
  "view.pinRow": "Pin or unpin a row above or below the body.",
  "view.setSelection": "Replace or clear the current selection.",
  "views.apply": "Apply a saved view.",
  "rows.read": "Read a bounded, redacted row window, each row with its rowKey.",
  "rows.resolve": "Turn a 1-based position into a row key, or confirm one.",
  "export.run": "Export through the host export path.",
  "edit.cells": "Edit cells through the host callback.",
  "rows.add": "Add rows through the host callback.",
  "rows.delete":
    "Delete rows, by rowKey or position, through the host callback.",
  "rows.reorder": "Reorder rows through the host callback.",
};

/**
 * One-line English summary for a capability key.
 *
 * @public
 */
export function summaryOf(key: CapabilityKey): string {
  return SUMMARIES[key];
}

/**
 * Full describe() guide for a capability key, including input/output schemas.
 *
 * @public
 */
export function guideOf(key: CapabilityKey): CapabilityGuide {
  return { schemaVersion: AGENT_SCHEMA_VERSION, ...GUIDES[key] };
}
