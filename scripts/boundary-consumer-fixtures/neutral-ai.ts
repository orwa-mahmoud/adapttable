/**
 * Neutral consumer: the AI subpaths with no React and no browser globals.
 *
 * Every import here is a published subpath of `@adapttable/ai`, type-checked
 * in a package that has no React installed at all. A subpath that reached for
 * React, the DOM, an agent SDK or a model client would fail to resolve here
 * rather than in somebody's server build.
 */
import { type AgentObservation, createAgentSession } from "@adapttable/ai";
import { aguiTools } from "@adapttable/ai/ag-ui";
import { aiSdkTools } from "@adapttable/ai/ai-sdk";
import { createTableAssistant, planUndo } from "@adapttable/ai/assistant";
import { buildAgentContext, sampleColumnValues } from "@adapttable/ai/context";
import { toMcpToolList } from "@adapttable/ai/mcp";
import { mcpAppCsp, mcpAppResource } from "@adapttable/ai/mcp-apps";
import { registerWebMcpTools } from "@adapttable/ai/webmcp";

const observation: AgentObservation = {
  tableId: "orders",
  viewRevision: 1,
  featureIds: [],
  columns: [
    {
      id: "total",
      label: "Total",
      type: "number",
      readable: true,
      writable: false,
      sortable: true,
    },
  ],
  source: {
    fullDataset: false,
    grouping: false,
    selectAcrossPages: false,
    exportScope: "page",
    totalCount: "loaded",
  },
  writePolicy: "deny",
  hasPagination: true,
  hasSearch: false,
  hasSort: true,
  hasFilters: false,
  hasExport: false,
  hasEdit: false,
  hasReorder: false,
  page: 1,
  limit: 25,
  search: "",
  pageMax: 40,
  rowAddressScope: "visible",
};

const session = createAgentSession({
  observe: () => observation,
  apply: { setPage: () => undefined, setSort: () => undefined },
});

const context = buildAgentContext(session, { profile: "compact" });

/** The conversation store, with nothing rendering it. */
const store = createTableAssistant({ session });
store.dispose();

/** Every adapter reachable without a browser. */
export const upfront = context.selection.selected.length;
export const contractVersion = context.contract.version;
export const aguiToolCount = aguiTools(session).length;
export const aiSdkToolCount = Object.keys(aiSdkTools(session)).length;
export const mcpToolCount = toMcpToolList(session).tools.length;
export const csp = mcpAppCsp({ connectDomains: ["https://api.example"] });
export const appUri = mcpAppResource(session, {
  src: "https://view.example/",
}).uri;

/** No `document` here, so this registers nothing and says so. */
export const webmcpActive = registerWebMcpTools(session).active;

/** Sampling is a promise, not a read at import. */
export const sample = sampleColumnValues(session, "total");

/** Undo is a plan, computed from two views. */
export const undoPlan = planUndo(context.view, context.view, session, 1);
