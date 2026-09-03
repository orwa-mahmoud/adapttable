/**
 * Optional result-return loop — application choice, not a library requirement.
 *
 * After execute, the host may send `ExecuteResult` back to its own agent
 * runtime for a final sentence. AdaptTable does not wrap that reply.
 */
import { type AgentObservation, createAgentSession } from "@adapttable/ai";
import {
  type AgentEnvelope,
  executeEnvelope,
  parseEnvelope,
} from "@adapttable/ai/json";
import type { AgentSession, ExecuteResult } from "@adapttable/ai";

const TABLE_ID = "orders";

export interface AppTurn {
  text: string;
  actions: readonly AgentEnvelope[];
}

export type AgentReply = (
  text: string,
  results: readonly ExecuteResult[]
) => void;

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

export async function applyTurnAndReply(
  session: AgentSession,
  turn: AppTurn,
  reply: AgentReply
): Promise<readonly ExecuteResult[]> {
  const results: ExecuteResult[] = [];
  for (const action of turn.actions) {
    results.push(await executeEnvelope(session, parseEnvelope(action)));
  }
  reply(turn.text, results);
  return results;
}

export async function runResultReturnExample(
  reply: AgentReply = (text, results) => {
    console.log(
      text,
      results.map((result) => result.ok)
    );
  }
): Promise<readonly ExecuteResult[]> {
  const session = createAgentSession({
    observe: () => observation(),
    apply: {
      setPage: (page) => {
        console.log("result-return setPage", page);
      },
    },
  });
  return applyTurnAndReply(
    session,
    {
      text: "Moved to page 2.",
      actions: [
        {
          schemaVersion: "adapttable.agent.v1",
          tableId: TABLE_ID,
          key: "view.setPage",
          args: { page: 2 },
          expectedRevision: session.manifest().viewRevision,
          idempotencyKey: "return-page-2",
        },
      ],
    },
    reply
  );
}
