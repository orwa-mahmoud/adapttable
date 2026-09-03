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
    enum: ["pending", "approved", "rejected", "not-required"],
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
      "Read the current page, sort, search, grouping and revision. No rows.",
    input: objectSchema({}),
    output: objectSchema({
      page: { type: "integer", minimum: 1 },
      limit: { type: "integer", minimum: 1 },
      search: { type: "string" },
      sortBy: { type: ["string", "null"] },
      sortDir: { type: ["string", "null"] },
      groupBy: { type: ["string", "null"] },
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
    guide: "Sort by a column id, or clear sort with a null key.",
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
      "Replace the active filter model. Shape is the table's own filter value.",
    input: objectSchema({ filters: {} }, ["filters"]),
    output: OK,
  },
  "view.setGroupBy": {
    key: "view.setGroupBy",
    guide: "Group rows by a column id, or clear grouping with null.",
    input: objectSchema({ key: { type: ["string", "null"] } }),
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
      "Read a bounded, redacted row window from the current view. Unreadable columns never appear. scope full requires a full-dataset source.",
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
      "Resolve a stable rowKey or a 1-based position against the named current view.",
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
    guide: "Delete rows through the host delete callback. This is destructive.",
    input: objectSchema(
      {
        keys: {
          type: "array",
          items: { type: "string", minLength: 1 },
        },
      },
      ["keys"]
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
  "view.describe": "Read page, sort, search and grouping.",
  "view.setPage": "Change the current page.",
  "view.setSort": "Change or clear the sort.",
  "view.setSearch": "Change the search query.",
  "view.setFilters": "Replace the active filters.",
  "view.setGroupBy": "Change or clear grouping.",
  "view.setSelection": "Replace or clear the current selection.",
  "views.apply": "Apply a saved view.",
  "rows.read": "Read a bounded, redacted row window.",
  "rows.resolve": "Resolve a row key or 1-based position.",
  "export.run": "Export through the host export path.",
  "edit.cells": "Edit cells through the host callback.",
  "rows.add": "Add rows through the host callback.",
  "rows.delete": "Delete rows through the host callback.",
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
