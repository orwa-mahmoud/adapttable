/**
 * An AI SDK route that hands the table's capabilities to the client.
 *
 * The shape a Next.js or Nuxt app already has — `streamText`, the provider it
 * chose, one route handler — with the table added by spreading `aiSdkTools`
 * into the `tools` map. Those entries have **no `execute`**, which is how the
 * AI SDK says the client runs them; `@adapttable/ai/ai-sdk` is what answers
 * them in the browser, through the same `session.execute` as everything else.
 *
 * The `ai` package is not imported here either: the route half is shown as the
 * object a real route builds, so the example typechecks and runs in this repo
 * without pulling an SDK into it. Copy the `tools` spread and the system
 * prompt into your own `streamText` call.
 */
import {
  type AgentObservation,
  buildAgentContext,
  createAgentSession,
} from "@adapttable/ai";
import { aiSdkTools } from "@adapttable/ai/ai-sdk";
import { agentSystemPrompt } from "@adapttable/ai/http";

const TABLE_ID = "orders";

const SOURCE: AgentObservation["source"] = {
  fullDataset: false,
  grouping: false,
  selectAcrossPages: false,
  exportScope: "page",
  totalCount: "loaded",
};

const state = { page: 1, search: "" };

function observation(): AgentObservation {
  return {
    tableId: TABLE_ID,
    viewRevision: 1,
    featureIds: [],
    columns: [
      {
        id: "customer",
        label: "Customer",
        type: "string",
        readable: true,
        writable: false,
        sortable: true,
      },
      {
        id: "total",
        label: "Total",
        type: "number",
        readable: true,
        writable: false,
        sortable: true,
      },
    ],
    source: SOURCE,
    writePolicy: "deny",
    hasPagination: true,
    hasSearch: true,
    hasSort: true,
    hasFilters: false,
    hasExport: false,
    hasEdit: false,
    hasReorder: false,
    page: state.page,
    limit: 25,
    search: state.search,
    pageMax: 40,
    rowAddressScope: "visible",
  };
}

const session = createAgentSession({
  observe: observation,
  apply: {
    setPage: (page) => {
      state.page = page;
    },
    setSearch: (search) => {
      state.search = search;
    },
    setSort: () => undefined,
  },
});

/**
 * What the route sends to the model.
 *
 * The system prompt is built from the same permitted context every other
 * integration uses, so the rules the model is given are the rules the executor
 * enforces — rather than a second description of them that can drift.
 */
export function routeBody(yourOwnTools: Record<string, unknown> = {}) {
  const context = buildAgentContext(session, { profile: "compact" });
  return {
    // In your route: `model: openai("gpt-4.1")` or whichever you use.
    system: agentSystemPrompt({ context }),
    tools: {
      ...yourOwnTools,
      // Client tools: declared here, run in the browser. Every entry omits
      // `execute`, and that omission is the whole contract.
      ...aiSdkTools(session),
    },
    // The table's live state travels as a data part, so "reverse that sort"
    // has something to reverse.
    data: { "data-adapttable-view": context.view },
  };
}

const body = routeBody({
  searchTheHelpCentre: {
    description: "Search the help centre",
    inputSchema: { type: "object", properties: { q: { type: "string" } } },
    // A route tool: it HAS an execute, so the SDK runs it here.
    execute: (input: { q: string }) => `no results for ${input.q}`,
  },
});

console.log("client tools the route declares:");
for (const [name, tool] of Object.entries(body.tools)) {
  // No `execute` is the whole contract: the SDK hands that call to the client.
  const clientRun = !(typeof tool === "object" && tool && "execute" in tool);
  console.log(` ${clientRun ? "browser" : "route  "} · ${name}`);
}
console.log("\nview sent as a data part:", body.data["data-adapttable-view"]);
console.log("\nsystem prompt, first line:", body.system.split("\n")[0]);
