/**
 * Server-side agent — no React, no model SDK, no hosted AdaptTable service.
 *
 * A worker holds one `createAgentSession` and accepts `AgentEnvelope` JSON
 * over HTTP. `executeEnvelope` is the only dispatch.
 */
import {
  type AgentApply,
  type AgentObservation,
  createAgentSession,
} from "@adapttable/ai";
import {
  type AgentEnvelope,
  executeEnvelope,
  parseEnvelope,
} from "@adapttable/ai/json";

const TABLE_ID = "employees";

const COLUMNS: AgentObservation["columns"] = [
  {
    id: "name",
    label: "Name",
    type: "string",
    readable: true,
    writable: false,
    sortable: true,
  },
  {
    id: "salary",
    label: "Salary",
    type: "number",
    readable: true,
    writable: true,
    sortable: true,
  },
];

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
    columns: COLUMNS,
    source: SOURCE,
    writePolicy: "allow",
    hasPagination: true,
    hasSearch: true,
    hasSort: true,
    hasFilters: false,
    hasExport: false,
    hasEdit: true,
    hasReorder: false,
    page: 1,
    limit: 10,
    search: "",
    pageMax: 50,
    rowAddressScope: "visible",
    ...patch,
  };
}

const proposals: unknown[] = [];

function applyFor(commit: "stage" | "immediate"): AgentApply {
  return {
    setPage: (page) => {
      console.log(`apply.setPage(${page})`);
    },
    editCells: (edits) => {
      const record = { commit, edits };
      if (commit === "stage") {
        proposals.push(record);
        return { staged: true, edits };
      }
      return { committed: true, edits };
    },
  };
}

export async function runServerAgentExample(): Promise<void> {
  let revision = 1;
  const session = createAgentSession({
    observe: () =>
      observation({
        viewRevision: revision,
        featureIds: ["editing"],
        hasEdit: true,
      }),
    apply: applyFor("stage"),
  });

  console.log(
    "catalog (minimal + editing):",
    session.catalog().map((entry) => entry.key)
  );

  const withFilters = createAgentSession({
    observe: () =>
      observation({
        featureIds: ["editing", "filters"],
        hasEdit: true,
        hasFilters: true,
      }),
    apply: {},
  });
  console.log(
    "catalog (filters composed):",
    withFilters.catalog().map((entry) => entry.key)
  );

  const page = await session.execute("view.setPage", { page: 2 }, 1, "page-2");
  console.log("view.setPage →", page);
  if (page.ok) revision = page.revision;

  const salaryArgs = {
    edits: [{ rowKey: "5", column: "salary", value: 20000 }],
  };
  const first = await session.execute(
    "edit.cells",
    salaryArgs,
    revision,
    "sal"
  );
  const replay = await session.execute(
    "edit.cells",
    salaryArgs,
    revision,
    "sal"
  );
  console.log("edit.cells first →", first);
  console.log("edit.cells replay (same idempotency key) →", replay);
  console.log("staged proposals:", proposals);

  const envelope: AgentEnvelope = {
    schemaVersion: "adapttable.agent.v1",
    tableId: TABLE_ID,
    key: "view.setPage",
    args: { page: 1 },
    expectedRevision: revision,
    idempotencyKey: "http-page-1",
  };
  console.log("HTTP 200 ←", await handleAgentPost(session, envelope));
}

export async function handleAgentPost(
  session: ReturnType<typeof createAgentSession>,
  body: unknown
): Promise<{ status: number; body: unknown }> {
  try {
    const envelope = parseEnvelope(body);
    const result = await executeEnvelope(session, envelope);
    return { status: result.ok ? 200 : 409, body: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { status: 400, body: { error: message } };
  }
}

void runServerAgentExample();
