/**
 * MCP host — no SDK, no long-lived AdaptTable connection.
 *
 * `toMcpTools` / `toMcpResources` wrap one `createAgentSession`. When the
 * live table composes a new feature, compare manifests with `mcpListChanged`
 * and emit `notifications/tools/list_changed`. Hosts that cannot refresh a
 * dynamic tool list keep the portable trio (`catalog` / `describe` /
 * `execute`) or use `@adapttable/ai/openai` `{ deferred: true }`.
 */
import { type AgentObservation, createAgentSession } from "@adapttable/ai";
import {
  executeMcpTool,
  mcpListChanged,
  mcpToolResult,
  toMcpResourceList,
  toMcpResources,
  toMcpToolList,
  toMcpTools,
} from "@adapttable/ai/mcp";
import { mcpAppResource, withMcpAppMeta } from "@adapttable/ai/mcp-apps";

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
  console.log("as a tools/call result →", mcpToolResult(page));

  // What a host is told about each call, so it knows which ones need a
  // confirmation and which are safe to retry.
  for (const tool of toMcpTools(after)) {
    console.log(tool.name, tool.annotations);
  }

  // The same lists, with what a host caching them needs. `cacheScope` is the
  // contract stamp: a table whose capabilities or policy moved gets a new one.
  console.log("tools/list _meta:", toMcpToolList(after)._meta);
  console.log("resources/list _meta:", toMcpResourceList(after)._meta);

  // Serve the table as a view the host embeds. `connectDomains` is the whole
  // channel the view gets: the CSP refuses everything else.
  const view = mcpAppResource(after, {
    src: "https://adapttable.orwamahmoud.com/react/demo/mcp-app/",
    security: { connectDomains: ["https://adapttable.orwamahmoud.com"] },
    preferredSize: { width: 720, height: 480 },
  });
  console.log("MCP App resource:", view.uri, view.mimeType);
  console.log("CSP:", view._meta["ui/csp"]);
  console.log(
    "tools pointed at the view:",
    withMcpAppMeta(toMcpTools(after), after).map((tool) => [
      tool.name,
      tool._meta?.ui,
    ])
  );
}

void runMcpHostExample();
