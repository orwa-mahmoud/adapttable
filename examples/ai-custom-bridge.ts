/**
 * Custom frontend bridge — any agent format → `session.execute`.
 *
 * AdaptTable does not parse the agent's native tool call. The host maps
 * that shape onto a capability key and arguments, then calls the live
 * session. No model SDK. No second session type.
 */
import { type AgentObservation, createAgentSession } from "@adapttable/ai";
import type { AgentSession, ExecuteResult } from "@adapttable/ai";

const TABLE_ID = "orders";

/** Application-owned action — not AdaptTable's envelope. */
export interface HostAgentAction {
  tool: string;
  input: unknown;
}

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
    ...patch,
  };
}

export function toExecuteCall(action: HostAgentAction): {
  key: string;
  args: unknown;
} {
  return { key: action.tool, args: action.input };
}

export async function runCustomBridge(
  session: AgentSession,
  action: HostAgentAction,
  idempotencyKey: string
): Promise<ExecuteResult> {
  const { key, args } = toExecuteCall(action);
  return session.execute(
    key,
    args,
    session.manifest().viewRevision,
    idempotencyKey
  );
}

export function createBridgeSession(apply: {
  setFilters?: (filters: unknown) => void;
  setPage?: (page: number) => void;
}) {
  return createAgentSession({
    observe: () => observation(),
    apply,
  });
}

export async function runCustomBridgeExample(): Promise<ExecuteResult> {
  const session = createBridgeSession({
    setFilters: (filters) => {
      console.log("host setFilters", filters);
    },
  });
  return runCustomBridge(
    session,
    { tool: "view.setFilters", input: { filters: { team: ["Core"] } } },
    "bridge-filter-core"
  );
}
