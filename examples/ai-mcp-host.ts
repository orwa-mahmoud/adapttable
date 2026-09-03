/**
 * MCP host — no SDK, no long-lived AdaptTable connection.
 *
 * `toMcpTools` / `toMcpResources` wrap one `createAgentSession`. When the
 * live table composes a new feature, compare manifests with `mcpListChanged`
 * and emit `notifications/tools/list_changed`. Hosts that cannot refresh a
 * dynamic tool list keep the portable trio (`catalog` / `describe` /
 * `execute`) or use `@adapttable/ai/openai` `{ deferred: true }`.
 */
import type { AgentObservation } from "@adapttable/ai";
import { createAgentSession } from "@adapttable/ai";
import {
  executeMcpTool,
  mcpListChanged,
  toMcpResources,
  toMcpTools,
} from "@adapttable/ai/mcp";

const TABLE_ID = "employees";

const SOURCE: AgentObservation["source"] = {
  fullDataset: false,
  grouping: false,
  selectAcrossPages: false,
  exportScope: "page",
  totalCount: "loaded",
};

function observation(patch: Partial<AgentObservation> = {}): AgentObservation {
  return {
    tableId: TABLE_ID,
    viewRevision: 1,
    featureIds: [],
    columns: [
      {
        id: "salary",
        label: "Salary",
        type: "number",
        readable: true,
        writable: true,
        sortable: true,
      },
    ],
    source: SOURCE,
    writePolicy: "allow",
    hasPagination: true,
    hasSearch: false,
    hasSort: false,
    hasFilters: false,
    hasExport: false,
    hasEdit: false,
    hasReorder: false,
    page: 1,
    limit: 10,
    search: "",
    pageMax: 50,
    rowAddressScope: "visible",
    ...patch,
  };
}

export async function runMcpHostExample(): Promise<void> {
  const before = createAgentSession({
    observe: () => observation({ hasPagination: true }),
    apply: {},
  });
  console.log(
    "MCP tools (no editing):",
    toMcpTools(before).map((tool) => tool.name)
  );
  console.log(
    "MCP resources:",
    toMcpResources(before).map((resource) => resource.uri)
  );

  const after = createAgentSession({
    observe: () =>
      observation({
        featureIds: ["editing"],
        hasEdit: true,
        hasPagination: true,
      }),
    apply: {
      editCells: (edits) => ({ staged: true, edits }),
    },
  });
  console.log(
    "list changed:",
    mcpListChanged(before.manifest(), after.manifest())
  );
  console.log(
    "MCP tools (editing composed):",
    toMcpTools(after).map((tool) => tool.name)
  );

  const page = await executeMcpTool(
    after,
    "view.setPage",
    { page: 2 },
    after.manifest().viewRevision,
    "mcp-page-2"
  );
  console.log("executeMcpTool view.setPage →", page);
}

void runMcpHostExample();
