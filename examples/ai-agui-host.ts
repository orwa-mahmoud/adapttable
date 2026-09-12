/**
 * AG-UI frontend tool host — recorded events, no agent framework installed.
 *
 * `aguiTransport` turns one `createAgentSession` into the frontend half of an
 * AG-UI run: the enabled contract becomes the run's tools, the sanitized view
 * becomes its state, and a tool call the backend makes comes back through
 * `session.execute`. The `AgUiConnection` below replays recorded events
 * instead of reaching a backend, which is exactly how a conformance fixture
 * for CopilotKit, Mastra, LangGraph or Microsoft Agent Framework is driven.
 */
import {
  type AgentObservation,
  type ApprovalSubject,
  createAgentSession,
} from "@adapttable/ai";
import {
  type AgUiConnection,
  type AgUiEvent,
  type AgUiRunInput,
  aguiToolName,
  aguiTransport,
} from "@adapttable/ai/ag-ui";

const TABLE_ID = "orders";

const SOURCE: AgentObservation["source"] = {
  fullDataset: false,
  grouping: false,
  selectAcrossPages: false,
  exportScope: "page",
  totalCount: "loaded",
};

/** The live table, as the host already describes it to everything else. */
const state = { page: 1, sortBy: undefined as string | undefined, revision: 1 };

function observation(): AgentObservation {
  return {
    tableId: TABLE_ID,
    viewRevision: state.revision,
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
    hasSearch: false,
    hasSort: true,
    hasFilters: false,
    hasExport: false,
    hasEdit: false,
    hasReorder: false,
    page: state.page,
    limit: 25,
    search: "",
    pageMax: 40,
    rowAddressScope: "visible",
  };
}

const session = createAgentSession({
  observe: observation,
  apply: {
    setPage: (page) => {
      state.page = page;
      state.revision += 1;
    },
    setSort: (key) => {
      state.sortBy = key;
      state.revision += 1;
    },
  },
});

/** One recorded run: the agent sorts, says what it did, and finishes. */
function sortRun(input: AgUiRunInput): AgUiEvent[] {
  const call = "call-1";
  return [
    { type: "RUN_STARTED", threadId: input.threadId, runId: input.runId },
    {
      type: "TOOL_CALL_START",
      toolCallId: call,
      toolCallName: aguiToolName(TABLE_ID, "view.setSort"),
    },
    {
      type: "TOOL_CALL_ARGS",
      toolCallId: call,
      delta: '{"key":"total","dir":"desc"}',
    },
    { type: "TOOL_CALL_END", toolCallId: call },
    { type: "TEXT_MESSAGE_START", messageId: "m-1" },
    {
      type: "TEXT_MESSAGE_CONTENT",
      messageId: "m-1",
      delta: "Sorted by total, highest first.",
    },
    { type: "TEXT_MESSAGE_END", messageId: "m-1" },
    { type: "RUN_FINISHED", threadId: input.threadId, runId: input.runId },
  ];
}

/** A run that stops to have a whole-table operation confirmed. */
function confirmRun(input: AgUiRunInput): AgUiEvent[] {
  return [
    { type: "RUN_STARTED", threadId: input.threadId, runId: input.runId },
    {
      type: "RUN_FINISHED",
      threadId: input.threadId,
      runId: input.runId,
      outcome: {
        interrupt: {
          interruptId: "int-1",
          reason: "confirmation",
          payload: {
            capability: "view.setPage",
            title: "Jump to the last page",
            arguments: { page: 40 },
          },
        },
      },
    },
  ];
}

/** What the backend does once the reader has answered. */
function resumedRun(input: AgUiRunInput): AgUiEvent[] {
  const call = "call-2";
  const decided = input.resume?.[0];
  if (decided?.status !== "approved") {
    return [
      { type: "RUN_STARTED", threadId: input.threadId, runId: input.runId },
      { type: "TEXT_MESSAGE_START", messageId: "m-2" },
      {
        type: "TEXT_MESSAGE_CONTENT",
        messageId: "m-2",
        delta: "Left the page where it was.",
      },
      { type: "TEXT_MESSAGE_END", messageId: "m-2" },
      { type: "RUN_FINISHED", threadId: input.threadId, runId: input.runId },
    ];
  }
  return [
    { type: "RUN_STARTED", threadId: input.threadId, runId: input.runId },
    {
      type: "TOOL_CALL_START",
      toolCallId: call,
      toolCallName: aguiToolName(TABLE_ID, "view.setPage"),
    },
    { type: "TOOL_CALL_ARGS", toolCallId: call, delta: '{"page":40}' },
    { type: "TOOL_CALL_END", toolCallId: call },
    { type: "RUN_FINISHED", threadId: input.threadId, runId: input.runId },
  ];
}

/** The seam a real host fills with its own AG-UI client. */
const connection: AgUiConnection = {
  run: async function* (input) {
    const events = input.resume
      ? resumedRun(input)
      : input.messages.at(-1)?.content.includes("last page")
        ? confirmRun(input)
        : sortRun(input);
    for (const event of events) yield event;
  },
};

const transport = aguiTransport({
  connection,
  threadId: "demo-thread",
  // Read per run: the point of a state delta is that the view moved.
  contextInputs: () => ({
    view: {
      page: state.page,
      limit: 25,
      search: "",
      ...(state.sortBy
        ? { sortBy: state.sortBy, sortDir: "desc" as const }
        : {}),
    },
  }),
  // The same seam `session.execute` uses, so a backend's confirmation is
  // decided exactly where the table's own writes are.
  onApprove: async (subject: ApprovalSubject) => {
    if (subject.kind === "operation") {
      console.log(`confirm: ${subject.title ?? subject.capability}`);
    }
    return true;
  },
  onEvent: (event) => {
    if (event.type === "STATE_SNAPSHOT" || event.type === "STATE_DELTA") {
      console.log(event.type, JSON.stringify(event.snapshot ?? event.delta));
    }
  },
});

await transport.connect?.({ session });

const sorted = await transport.send({
  session,
  text: "sort by total, biggest first",
  conversation: [],
  onPartialText: (text) => {
    console.log(`… ${text}`);
  },
});
console.log("ran:", sorted.keys, "sortBy:", state.sortBy);

const jumped = await transport.send({
  session,
  text: "take me to the last page",
  conversation: [
    { role: "user", text: "sort by total, biggest first" },
    { role: "assistant", text: sorted.text },
  ],
});
console.log("ran:", jumped.keys, "page:", state.page);

transport.disconnect?.();
