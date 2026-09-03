/**
 * One model response → execute in the browser → show the result in app UI.
 *
 * The text-plus-actions envelope is application-owned. AdaptTable does not
 * add a chat-response wrapper. After execute, this path does not send
 * `ExecuteResult` back to a model.
 */
import { type AgentObservation, createAgentSession } from "@adapttable/ai";
import {
  type AgentEnvelope,
  executeEnvelope,
  parseEnvelope,
} from "@adapttable/ai/json";
import type { AgentSession, ExecuteResult } from "@adapttable/ai";

const TABLE_ID = "orders";

/** Application-owned turn — text plus structured actions from one response. */
export interface AppTurn {
  text: string;
  actions: readonly AgentEnvelope[];
}

const SOURCE: AgentObservation["source"] = {
  fullDataset: false,
  grouping: false,
  selectAcrossPages: false,
  exportScope: "page",
  totalCount: "loaded",
};

function observation(): AgentObservation {
  return {
    tableId: TABLE_ID,
    viewRevision: 1,
    featureIds: ["filters"],
    columns: [
      {
        id: "team",
        label: "Team",
        type: "string",
        readable: true,
        writable: false,
        sortable: true,
      },
    ],
    source: SOURCE,
    writePolicy: "allow",
    hasPagination: true,
    hasSearch: true,
    hasSort: true,
    hasFilters: true,
    hasExport: false,
    hasEdit: false,
    hasReorder: false,
    page: 1,
    limit: 10,
    search: "",
    pageMax: 50,
    rowAddressScope: "visible",
  };
}

export async function applyTurnWithoutRoundTrip(
  session: AgentSession,
  turn: AppTurn
): Promise<{ text: string; results: ExecuteResult[] }> {
  const results: ExecuteResult[] = [];
  for (const action of turn.actions) {
    results.push(await executeEnvelope(session, parseEnvelope(action)));
  }
  return { text: turn.text, results };
}

export async function runOneCallExample(): Promise<{
  text: string;
  results: ExecuteResult[];
}> {
  const session = createAgentSession({
    observe: () => observation(),
    apply: {
      setFilters: (filters) => {
        console.log("one-call setFilters", filters);
      },
    },
  });
  const turn: AppTurn = {
    text: "Showing the Core team.",
    actions: [
      {
        schemaVersion: "adapttable.agent.v1",
        tableId: TABLE_ID,
        key: "view.setFilters",
        args: { filters: { team: ["Core"] } },
        expectedRevision: session.manifest().viewRevision,
        idempotencyKey: "one-call-core",
      },
    ],
  };
  return applyTurnWithoutRoundTrip(session, turn);
}
