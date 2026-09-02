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
      "Write cells through the host onCellEdit callback. Never writes the table's own copy.",
    input: objectSchema(
      {
        edits: {
          type: "array",
          items: objectSchema(
            {
              rowKey: { type: "string", minLength: 1 },
              column: { type: "string", minLength: 1 },
              value: {},
            },
            ["rowKey", "column"]
          ),
        },
      },
      ["edits"]
    ),
    output: OK,
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
    output: OK,
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
  "export.run": "Export through the host export path.",
  "edit.cells": "Edit cells through the host callback.",
  "rows.reorder": "Reorder rows through the host callback.",
};

export function summaryOf(key: CapabilityKey): string {
  return SUMMARIES[key];
}

export function guideOf(key: CapabilityKey): CapabilityGuide {
  return { schemaVersion: AGENT_SCHEMA_VERSION, ...GUIDES[key] };
}
