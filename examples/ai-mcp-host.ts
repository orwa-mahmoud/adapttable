/**
 * MCP host — no SDK, no long-lived AdaptTable connection.
 *
 * `toMcpTools` / `toMcpResources` wrap one `createAgentSession`. When the
 * live table composes a new feature, compare manifests with `mcpListChanged`
 * and emit `notifications/tools/list_changed`. Hosts that cannot refresh a
 * dynamic tool list keep the portable trio on the session
 * (`catalog` / `describe` / `execute`) or use `@adapttable/ai/openai`
 * `{ deferred: true }`.
 *
 * Frozen 11-B keys that will appear in `catalog()` when wired:
 *   view.setSelection, views.apply, rows.read, rows.resolve,
 *   rows.add, rows.delete
 *
 * Host policy (future `tableAgent` options, not envelope fields):
 *   approval: "writes" | "destructive" | "never"  (default "writes")
 *   commit:   "stage" | "immediate"               (default "stage")
 */
import { createAgentSession } from "@adapttable/ai";
import {
  executeMcpTool,
  mcpListChanged,
  toMcpResources,
  toMcpTools,
} from "@adapttable/ai/mcp";
import type { AgentObservation } from "@adapttable/ai";

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

  const proposals: unknown[] = [];
  const after = createAgentSession({
    observe: () =>
      observation({
        featureIds: ["editing"],
        hasEdit: true,
        hasPagination: true,
      }),
    apply: {
      editCells: (edits) => {
        // commit: "stage" — record a proposal. "immediate" would persist.
        proposals.push({ commit: "stage", edits });
        return { staged: true, edits };
      },
    },
  });

  const changed = mcpListChanged(before.manifest(), after.manifest());
  console.log("mcpListChanged after composing edit.cells:", changed);
  if (!changed) {
    throw new Error("expected list-changed when edit.cells becomes wired");
  }
  console.log(
    "MCP tools (editing wired):",
    toMcpTools(after).map((tool) => tool.name)
  );

  const page = await executeMcpTool(
    after,
    "view.setPage",
    { page: 2 },
    1,
    "mcp-page"
  );
  console.log("execute view.setPage →", page);

  const salary = await executeMcpTool(
    after,
    "edit.cells",
    { edits: [{ rowKey: "5", column: "salary", value: 20000 }] },
    1,
    "mcp-sal"
  );
  console.log("execute edit.cells →", salary);
  console.log("staged proposals:", proposals);
}

void runMcpHostExample();
