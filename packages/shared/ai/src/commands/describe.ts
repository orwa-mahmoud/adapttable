/** `columns.describe` and `view.describe`: what the table is, without rows. */
import type { TableCommand } from "./command";
import { observedPagination } from "./page";
import { objectSchema, STRING_LIST } from "./schema";

export const describeColumnsCommand: TableCommand<"columns.describe"> = {
  key: "columns.describe",
  summary: "List column metadata without row values.",
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
  kind: "read",
  staging: "unsupported",
  partial: "unsupported",
  idempotent: true,
  isEnabled: () => true,
  apply: ({ context }) => ({ columns: context.observation.columns }),
  // The current declaration decides what may still be disclosed, but a replay
  // did not read the current view and cannot claim its revision as progress
  // made by this call.
  replay: (result, _args, observation) => ({
    ...result,
    revision: result.revision,
    result: { columns: observation.columns },
  }),
};

export const describeViewCommand: TableCommand<"view.describe"> = {
  key: "view.describe",
  summary: "Read page, sort, search, grouping and filters.",
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
    pinnedColumns: { type: "object" },
    pinnedRows: objectSchema({ top: STRING_LIST, bottom: STRING_LIST }),
    hiddenColumns: STRING_LIST,
    columnOrder: STRING_LIST,
    filters: {},
    availableFilters: { type: "array", items: { type: "object" } },
    pagination: { type: "object" },
    revision: { type: "integer", minimum: 1 },
  }),
  kind: "view",
  staging: "unsupported",
  partial: "unsupported",
  idempotent: true,
  isEnabled: () => true,
  apply: ({ context: { observation } }) => ({
    page: observation.page,
    limit: observation.limit,
    search: observation.search,
    sortBy: observation.sortBy ?? null,
    sortDir: observation.sortDir ?? null,
    groupBy: observation.groupBy ?? null,
    pinnedColumns: observation.pinnedColumns ?? {},
    pinnedRows: observation.pinnedRows ?? { top: [], bottom: [] },
    hiddenColumns: observation.hiddenColumns ?? [],
    columnOrder: observation.columnOrder ?? [],
    filters: observation.filters ?? null,
    availableFilters: observation.availableFilters,
    pagination: observedPagination(observation),
    revision: observation.viewRevision,
  }),
};
