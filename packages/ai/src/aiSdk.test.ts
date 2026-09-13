import { describe, expect, it } from "vitest";

import {
  AI_SDK_STREAM_VERSION,
  aiSdkCapability,
  type AiSdkConnection,
  type AiSdkPart,
  AiSdkProtocolError,
  type AiSdkRequest,
  aiSdkToolName,
  aiSdkTools,
  aiSdkTransport,
  assertAiSdkVersion,
} from "./aiSdk";
import { createAgentSession } from "./session";
import type { AgentObservation, AgentSession, ApprovalSubject } from "./types";

const TABLE_ID = "orders";

const PAGE_ONLY = {
  fullDataset: false,
  grouping: false as const,
  selectAcrossPages: false,
  exportScope: "page" as const,
  totalCount: "loaded" as const,
};

function liveTable(): {
  session: AgentSession;
  state: { page: number; sortBy?: string; revision: number };
} {
  const state: { page: number; sortBy?: string; revision: number } = {
    page: 1,
    revision: 1,
  };
  const session = createAgentSession({
    observe: (): AgentObservation => ({
      tableId: TABLE_ID,
      viewRevision: state.revision,
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
      source: PAGE_ONLY,
      writePolicy: "deny",
      approval: "never",
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
    }),
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
  return { session, state };
}

/** A route that replays one recorded stream per request. */
function recorded(
  streams: readonly ((request: AiSdkRequest) => readonly AiSdkPart[])[]
): { connection: AiSdkConnection; requests: AiSdkRequest[] } {
  const requests: AiSdkRequest[] = [];
  let at = 0;
  return {
    requests,
    connection: {
      run: (request) => {
        requests.push(request);
        const stream = streams[Math.min(at, streams.length - 1)];
        at += 1;
        const parts = stream?.(request) ?? [];
        // A recorded stream has nothing to wait for; it is still an
        // iterable, which is what the adapter consumes.
        return (function* () {
          for (const part of parts) yield part;
        })();
      },
    },
  };
}

const START: AiSdkPart = {
  type: "start",
  messageId: "m-1",
  version: AI_SDK_STREAM_VERSION,
};
const FINISH: AiSdkPart = { type: "finish" };

function says(text: string): AiSdkPart[] {
  return [
    { type: "text-start", id: "t-1" },
    { type: "text-delta", id: "t-1", delta: text },
    { type: "text-end", id: "t-1" },
  ];
}

function callsTool(id: string, key: string, input: unknown): AiSdkPart[] {
  return [
    {
      type: "tool-input-available",
      toolCallId: id,
      toolName: aiSdkToolName(TABLE_ID, key),
      input,
    },
  ];
}

describe("what a route declares", () => {
  it("offers every permitted capability as a client tool", () => {
    const { session } = liveTable();
    const tools = aiSdkTools(session);

    expect(Object.keys(tools)).toEqual(
      session.catalog().map((entry) => aiSdkToolName(TABLE_ID, entry.key))
    );
    const sort = tools[aiSdkToolName(TABLE_ID, "view.setSort")];
    expect(sort?.description).toBe("Change or clear the sort.");
    expect(sort?.inputSchema).toMatchObject({ type: "object" });
  });

  it("omits `execute` on every one, which is what makes it a client tool", () => {
    const { session } = liveTable();

    for (const tool of Object.values(aiSdkTools(session))) {
      // Present-and-undefined is not the same as absent to the SDK: the key
      // must not be there at all.
      expect("execute" in tool).toBe(false);
    }
  });

  it("names a tool in a shape a provider will accept", () => {
    // Dots are what a function-name schema rejects.
    expect(aiSdkToolName("my.table", "view.setPage")).toBe(
      "adapttable_my_table_view_setPage"
    );
    expect(aiSdkToolName(TABLE_ID, "view.setPage")).not.toMatch(/[^\w-]/);
  });

  it("resolves a name back through the catalog, never by reversing it", () => {
    const { session } = liveTable();

    expect(
      aiSdkCapability(session, aiSdkToolName(TABLE_ID, "view.setPage"))
    ).toBe("view.setPage");
    expect(aiSdkCapability(session, "someoneElsesTool")).toBeUndefined();
  });
});

describe("what a request carries", () => {
  it("sends the conversation, this turn's message and the live view", async () => {
    const table = liveTable();
    const route = recorded([() => [START, ...says("Hello."), FINISH]]);
    const transport = aiSdkTransport({ connection: route.connection });

    await transport.send({
      session: table.session,
      text: "sort it",
      conversation: [{ role: "user", text: "hello" }],
    });

    expect(route.requests[0]).toMatchObject({
      message: "sort it",
      messages: [{ role: "user", content: "hello" }],
    });
    expect(route.requests[0]?.data?.["data-adapttable-view"]).toMatchObject({
      revision: 1,
      page: 1,
    });
  });

  it("returns a tool result the way addToolOutput sends one", async () => {
    const table = liveTable();
    const route = recorded([
      () => [START, ...callsTool("c1", "view.setPage", { page: 3 }), FINISH],
      () => [START, ...says("Page 3."), FINISH],
    ]);
    const transport = aiSdkTransport({ connection: route.connection });

    const reply = await transport.send({
      session: table.session,
      text: "page 3",
      conversation: [],
    });

    expect(table.state.page).toBe(3);
    expect(route.requests[1]?.toolOutputs).toEqual([
      {
        toolCallId: "c1",
        // The session's own receipt travels inside ours: `ok` and the
        // revision are this adapter's, `result` is what the capability
        // returned.
        output: { ok: true, revision: 2, result: { ok: true, revision: 2 } },
      },
    ]);
    expect(reply.keys).toEqual(["view.setPage"]);
    expect(reply.text).toBe("Page 3.");
  });

  it("repeats nothing it has already carried", async () => {
    const table = liveTable();
    const route = recorded([
      () => [START, ...callsTool("c1", "view.setPage", { page: 2 }), FINISH],
      () => [START, ...callsTool("c2", "view.setPage", { page: 3 }), FINISH],
      () => [START, ...says("Done."), FINISH],
    ]);
    const transport = aiSdkTransport({ connection: route.connection });

    await transport.send({
      session: table.session,
      text: "go",
      conversation: [],
    });

    expect(route.requests[1]?.toolOutputs).toHaveLength(1);
    expect(route.requests[2]?.toolOutputs?.[0]?.toolCallId).toBe("c2");
  });
});

describe("running a client tool", () => {
  it("reports what arrives as it arrives", async () => {
    const table = liveTable();
    const route = recorded([
      () => [
        START,
        { type: "text-delta", id: "t-1", delta: "Sorting " },
        { type: "text-delta", id: "t-1", delta: "by total." },
        FINISH,
      ],
    ]);
    const partial: string[] = [];
    const transport = aiSdkTransport({ connection: route.connection });

    const reply = await transport.send({
      session: table.session,
      text: "sort",
      conversation: [],
      onPartialText: (text) => partial.push(text),
    });

    expect(partial).toEqual(["Sorting ", "Sorting by total."]);
    expect(reply.text).toBe("Sorting by total.");
  });

  it("leaves a tool that is not ours to whoever declared it", async () => {
    const table = liveTable();
    const route = recorded([
      () => [
        START,
        {
          type: "tool-input-available",
          toolCallId: "c1",
          toolName: "searchTheHelpCentre",
          input: { q: "refunds" },
        },
        ...says("Looked it up."),
        FINISH,
      ],
    ]);
    const transport = aiSdkTransport({ connection: route.connection });

    const reply = await transport.send({
      session: table.session,
      text: "help",
      conversation: [],
    });

    expect(reply.keys).toEqual([]);
    expect(route.requests).toHaveLength(1);
  });

  it("replays rather than repeating a write when a call is re-sent", async () => {
    const table = liveTable();
    const executed: string[] = [];
    const spied: AgentSession = {
      ...table.session,
      execute: (key, args, revision, idempotencyKey, signal) => {
        executed.push(idempotencyKey);
        return table.session.execute(
          key,
          args,
          revision,
          idempotencyKey,
          signal
        );
      },
    };
    const route = recorded([
      () => [
        START,
        ...callsTool("c1", "view.setPage", { page: 3 }),
        ...callsTool("c1", "view.setPage", { page: 3 }),
        FINISH,
      ],
      () => [START, ...says("Done."), FINISH],
    ]);
    const transport = aiSdkTransport({ connection: route.connection });

    await transport.send({ session: spied, text: "go", conversation: [] });

    expect(executed[0]).toBe(executed[1]);
    // One move, whatever the stream repeated.
    expect(table.state.revision).toBe(2);
  });
});

describe("an approval the route asked for", () => {
  const request: AiSdkPart = {
    type: "tool-approval-request",
    approvalId: "a-1",
    toolCallId: "c1",
    toolName: aiSdkToolName(TABLE_ID, "view.setPage"),
    input: { page: 40 },
  };

  it("reaches the same seam the session uses, and answers on the next request", async () => {
    const table = liveTable();
    const seen: ApprovalSubject[] = [];
    const route = recorded([
      () => [START, request, FINISH],
      () => [START, ...says("Done."), FINISH],
    ]);
    const transport = aiSdkTransport({
      connection: route.connection,
      onApprove: (subject) => {
        seen.push(subject);
        return Promise.resolve(true);
      },
    });

    await transport.send({
      session: table.session,
      text: "last page",
      conversation: [],
    });

    expect(seen[0]).toMatchObject({
      kind: "operation",
      capability: "view.setPage",
      arguments: { page: 40 },
    });
    expect(route.requests[1]?.approvals).toEqual([
      { approvalId: "a-1", approved: true },
    ]);
  });

  it("carries the reader's reason when they gave one", async () => {
    const table = liveTable();
    const route = recorded([
      () => [START, request, FINISH],
      () => [START, ...says("Left it."), FINISH],
    ]);
    const transport = aiSdkTransport({
      connection: route.connection,
      onApprove: () =>
        Promise.resolve({ approved: [], reason: "wrong quarter" }),
    });

    await transport.send({
      session: table.session,
      text: "last page",
      conversation: [],
    });

    expect(route.requests[1]?.approvals).toEqual([
      { approvalId: "a-1", approved: false, reason: "wrong quarter" },
    ]);
  });

  it("stops the turn rather than approving itself when nobody can be asked", async () => {
    const table = liveTable();
    const route = recorded([() => [START, request, FINISH]]);
    const transport = aiSdkTransport({ connection: route.connection });

    const reply = await transport.send({
      session: table.session,
      text: "last page",
      conversation: [],
    });

    expect(reply.unresolved).toMatchObject({
      code: "approval-unavailable",
      pending: ["view.setPage"],
    });
    expect(route.requests).toHaveLength(1);
  });

  it("reports a denied output with the reason the route gave", async () => {
    const table = liveTable();
    const route = recorded([
      () => [
        START,
        {
          type: "output-denied",
          toolCallId: "c1",
          toolName: aiSdkToolName(TABLE_ID, "view.setPage"),
          errorText: "the reader said no",
        },
        ...says("Nothing changed."),
        FINISH,
      ],
    ]);
    const transport = aiSdkTransport({ connection: route.connection });

    const reply = await transport.send({
      session: table.session,
      text: "go",
      conversation: [],
    });

    expect(reply.unresolved).toEqual({
      code: "output-denied",
      message: "the reader said no",
      pending: ["view.setPage"],
    });
    expect(table.state.page).toBe(1);
  });
});

describe("a stream that does not behave like the AI SDK's", () => {
  it("refuses a version it does not speak", async () => {
    const table = liveTable();
    const route = recorded([
      () => [{ type: "start", messageId: "m", version: 99 }, FINISH],
    ]);
    const transport = aiSdkTransport({ connection: route.connection });

    await expect(
      transport.send({ session: table.session, text: "hi", conversation: [] })
    ).rejects.toMatchObject({ code: "unknown-stream-version" });
  });

  it("accepts a stream that names no version", () => {
    expect(() => {
      assertAiSdkVersion(undefined);
    }).not.toThrow();
    expect(() => {
      assertAiSdkVersion(AI_SDK_STREAM_VERSION);
    }).not.toThrow();
    expect(() => {
      assertAiSdkVersion("1");
    }).toThrow(AiSdkProtocolError);
  });

  it("refuses a text delta that is not text", async () => {
    const table = liveTable();
    const route = recorded([
      () => [START, { type: "text-delta", id: "t" }, FINISH],
    ]);
    const transport = aiSdkTransport({ connection: route.connection });

    await expect(
      transport.send({ session: table.session, text: "hi", conversation: [] })
    ).rejects.toMatchObject({ code: "malformed-part" });
  });

  it("refuses a stream that stops without finishing", async () => {
    const table = liveTable();
    const route = recorded([() => [START, ...says("half a")]]);
    const transport = aiSdkTransport({ connection: route.connection });

    await expect(
      transport.send({ session: table.session, text: "hi", conversation: [] })
    ).rejects.toMatchObject({ code: "stream-incomplete" });
  });

  it("reports a route error with what it said", async () => {
    const table = liveTable();
    const route = recorded([
      () => [START, { type: "error", errorText: "rate limited" }],
    ]);
    const transport = aiSdkTransport({ connection: route.connection });

    await expect(
      transport.send({ session: table.session, text: "hi", conversation: [] })
    ).rejects.toMatchObject({ code: "stream-error", message: "rate limited" });
  });

  it("leaves a part it has never heard of alone", async () => {
    const table = liveTable();
    const seen: string[] = [];
    const route = recorded([
      () => [
        START,
        { type: "data-weather", data: { c: 21 } },
        { type: "reasoning-delta", delta: "thinking" },
        ...says("Done."),
        FINISH,
      ],
    ]);
    const transport = aiSdkTransport({
      connection: route.connection,
      onPart: (part) => seen.push(part.type),
    });

    const reply = await transport.send({
      session: table.session,
      text: "hi",
      conversation: [],
    });

    expect(reply.text).toBe("Done.");
    expect(seen).toContain("data-weather");
    expect(seen).toContain("reasoning-delta");
  });

  it("refuses to continue forever", async () => {
    const table = liveTable();
    let id = 0;
    const route = recorded([
      () => {
        id += 1;
        return [
          START,
          ...callsTool(`c${String(id)}`, "view.setPage", { page: 2 }),
          FINISH,
        ];
      },
    ]);
    const transport = aiSdkTransport({
      connection: route.connection,
      maxRequests: 3,
    });

    const reply = await transport.send({
      session: table.session,
      text: "go",
      conversation: [],
    });

    expect(route.requests).toHaveLength(3);
    expect(reply.unresolved).toMatchObject({ code: "continuation-limit" });
  });
});

describe("a cancelled turn", () => {
  it("stops reading and never runs the call that follows", async () => {
    const table = liveTable();
    const controller = new AbortController();
    const route = recorded([
      () => [
        START,
        { type: "text-delta", id: "t", delta: "working" },
        ...callsTool("c1", "view.setPage", { page: 9 }),
        FINISH,
      ],
    ]);
    const transport = aiSdkTransport({ connection: route.connection });

    const reply = transport.send({
      session: table.session,
      text: "page 9",
      conversation: [],
      signal: controller.signal,
      onPartialText: () => controller.abort(),
    });

    await expect(reply).rejects.toMatchObject({ code: "cancelled" });
    expect(table.state.page).toBe(1);
  });
});

describe("a stream this adapter cannot read", () => {
  async function refuse(parts: readonly AiSdkPart[]): Promise<unknown> {
    const table = liveTable();
    const transport = aiSdkTransport({
      connection: recorded([() => parts]).connection,
    });
    return transport
      .send({ session: table.session, text: "go", conversation: [] })
      .then(
        () => undefined,
        (cause: unknown) => cause
      );
  }

  it("refuses a part with no type at all", async () => {
    // Not an unknown part from a newer SDK — those are forwarded and ignored.
    // A part that is not shaped like one means the stream is not this stream.
    const cause = await refuse([START, { type: "" }, FINISH]);
    expect(cause).toMatchObject({ code: "unknown-stream-version" });
  });

  it("refuses a text delta that is not text", async () => {
    const cause = await refuse([
      START,
      { type: "text-delta", id: "t-1", delta: 7 },
      FINISH,
    ]);
    expect(cause).toMatchObject({ code: "malformed-part" });
  });

  it("refuses a tool call with no name", async () => {
    const cause = await refuse([
      START,
      { type: "tool-input-available", toolCallId: "c1", input: {} },
      FINISH,
    ]);
    expect(cause).toMatchObject({ code: "malformed-part" });
  });

  it("refuses one of our tools with no call id to answer", async () => {
    const cause = await refuse([
      START,
      {
        type: "tool-input-available",
        toolName: aiSdkToolName(TABLE_ID, "view.setPage"),
        input: { page: 2 },
      },
      FINISH,
    ]);
    expect(cause).toMatchObject({ code: "malformed-part" });
  });

  it("refuses an approval request with no id to answer", async () => {
    const cause = await refuse([
      START,
      {
        type: "tool-approval-request",
        toolName: aiSdkToolName(TABLE_ID, "view.setPage"),
      },
      FINISH,
    ]);
    expect(cause).toMatchObject({ code: "malformed-part" });
  });

  it("refuses an approval that names neither rows nor one of our tools", async () => {
    const table = liveTable();
    const transport = aiSdkTransport({
      connection: recorded([
        () => [
          START,
          {
            type: "tool-approval-request",
            approvalId: "a1",
            toolName: "somebody-elses-tool",
          },
          FINISH,
        ],
      ]).connection,
      // Reached only when there is somebody to ask: without a reader, the turn
      // stops as unavailable before the request is read this far.
      onApprove: () => Promise.resolve(true),
    });

    const cause = await transport
      .send({ session: table.session, text: "go", conversation: [] })
      .then(
        () => undefined,
        (thrown: unknown) => thrown
      );
    expect(cause).toMatchObject({ code: "malformed-approval" });
  });

  it("stops the turn when the route asks and there is nobody to ask", async () => {
    const table = liveTable();
    const transport = aiSdkTransport({
      connection: recorded([
        () => [
          START,
          {
            type: "tool-approval-request",
            approvalId: "a1",
            toolName: aiSdkToolName(TABLE_ID, "view.setPage"),
          },
          FINISH,
        ],
      ]).connection,
    });

    const reply = await transport.send({
      session: table.session,
      text: "go to page 3",
      conversation: [],
    });

    expect(reply.unresolved).toMatchObject({
      code: "approval-unavailable",
      pending: ["view.setPage"],
    });
    expect(table.state.page).toBe(1);
  });

  it("refuses a stream that ends without finishing", async () => {
    const cause = await refuse([START, ...says("half a")]);
    expect(cause).toMatchObject({ code: "stream-incomplete" });
  });

  it("carries the route's own error text", async () => {
    const cause = await refuse([
      START,
      { type: "error", errorText: "the model is unavailable" },
    ]);
    expect(cause).toMatchObject({
      code: "stream-error",
      message: "the model is unavailable",
    });
  });

  it("names a route failure that said nothing about itself", async () => {
    const cause = await refuse([START, { type: "error" }]);
    expect(cause).toMatchObject({ code: "stream-error" });
    expect(String((cause as Error).message)).toContain("without saying why");
  });
});

describe("a refused call", () => {
  it("reports what the reader turned down, and why", async () => {
    const table = liveTable();
    const route = recorded([
      () => [
        START,
        {
          type: "output-denied",
          toolName: aiSdkToolName(TABLE_ID, "view.setPage"),
          errorText: "not while I am reading",
        },
        FINISH,
      ],
    ]);
    const transport = aiSdkTransport({ connection: route.connection });

    const reply = await transport.send({
      session: table.session,
      text: "go to page 3",
      conversation: [],
    });

    expect(reply.unresolved).toMatchObject({
      code: "output-denied",
      message: "not while I am reading",
      pending: ["view.setPage"],
    });
    // Nothing ran: a refusal is not a turn that half happened.
    expect(table.state.page).toBe(1);
  });

  it("falls back to the route's own name when the tool is not ours", async () => {
    const table = liveTable();
    const route = recorded([
      () => [
        START,
        { type: "output-denied", toolName: "somebody-elses-tool" },
        FINISH,
      ],
    ]);
    const transport = aiSdkTransport({ connection: route.connection });

    const reply = await transport.send({
      session: table.session,
      text: "go",
      conversation: [],
    });

    expect(reply.unresolved?.pending).toEqual(["somebody-elses-tool"]);
  });

  it("says unknown when the route named nothing at all", async () => {
    const table = liveTable();
    const route = recorded([() => [START, { type: "output-denied" }, FINISH]]);
    const transport = aiSdkTransport({ connection: route.connection });

    const reply = await transport.send({
      session: table.session,
      text: "go",
      conversation: [],
    });

    expect(reply.unresolved?.pending).toEqual(["unknown"]);
  });
});

describe("an approval the route enumerated rows for", () => {
  function approvalRun(
    input: unknown,
    onApprove: () => unknown,
    toolName = aiSdkToolName(TABLE_ID, "view.setPage")
  ) {
    const table = liveTable();
    const subjects: ApprovalSubject[] = [];
    const transport = aiSdkTransport({
      connection: recorded([
        () => [
          START,
          {
            type: "tool-approval-request",
            approvalId: "a1",
            toolName,
            input,
          },
          FINISH,
        ],
      ]).connection,
      onApprove: (subject) => {
        subjects.push(subject);
        return Promise.resolve(onApprove() as never);
      },
    });
    return { table, subjects, transport };
  }

  it("puts the rows to the reader, keeping only what it can address", async () => {
    const { table, subjects, transport } = approvalRun(
      {
        proposals: [
          { rowKey: "r1", column: "name", before: "Ada", after: "Grace" },
          // No row key: nothing here can say which row this is.
          { column: "name", after: "Nobody" },
        ],
        perItem: true,
      },
      () => true
    );

    await transport.send({
      session: table.session,
      text: "rename them",
      conversation: [],
    });

    expect(subjects[0]).toMatchObject({ kind: "rows", perItem: true });
    const rows = subjects[0] as { proposals: readonly unknown[] };
    expect(rows.proposals).toHaveLength(1);
    expect(rows.proposals[0]).toMatchObject({
      rowKey: "r1",
      column: "name",
      before: "Ada",
      after: "Grace",
    });
  });

  it("falls back to the tool when no row could be addressed", async () => {
    const { table, subjects, transport } = approvalRun(
      { proposals: [{ column: "name" }] },
      () => true
    );

    await transport.send({
      session: table.session,
      text: "go",
      conversation: [],
    });

    // A list nothing addressable came out of is not a row approval: it falls
    // back to confirming the capability the route named.
    expect(subjects[0]).toMatchObject({ capability: "view.setPage" });
  });

  it("sends the reader's refusal back with its reason", async () => {
    const table = liveTable();
    const route = recorded([
      () => [
        START,
        {
          type: "tool-approval-request",
          approvalId: "a1",
          toolName: aiSdkToolName(TABLE_ID, "view.setPage"),
        },
        FINISH,
      ],
      () => [START, ...says("understood"), FINISH],
    ]);
    const transport = aiSdkTransport({
      connection: route.connection,
      onApprove: () =>
        Promise.resolve({ approved: [], reason: "not right now" }),
    });

    await transport.send({
      session: table.session,
      text: "go to page 3",
      conversation: [],
    });

    expect(route.requests[1]?.approvals).toMatchObject([
      { approvalId: "a1", approved: false, reason: "not right now" },
    ]);
  });
});

describe("a call the table refused", () => {
  it("returns the refusal as the tool's own output", async () => {
    const table = liveTable();
    const route = recorded([
      // A revision the table has already left: the call must not apply.
      () => [
        START,
        {
          type: "tool-input-available",
          toolCallId: "c1",
          toolName: aiSdkToolName(TABLE_ID, "view.setPage"),
          input: { page: "not a page" },
        },
        FINISH,
      ],
      () => [START, ...says("sorry"), FINISH],
    ]);
    const transport = aiSdkTransport({ connection: route.connection });

    await transport.send({
      session: table.session,
      text: "go",
      conversation: [],
    });

    // The route reads a refusal exactly as it reads any client tool's result,
    // so the model can say what happened rather than assuming it worked.
    const output = route.requests[1]?.toolOutputs?.[0];
    expect(output).toMatchObject({ toolCallId: "c1" });
    expect(JSON.stringify(output)).toContain('"ok":false');
  });
});

describe("a turn the reader stopped", () => {
  it("refuses to keep reading the stream", async () => {
    const table = liveTable();
    const controller = new AbortController();
    const transport = aiSdkTransport({
      connection: {
        run: function* () {
          controller.abort();
          yield START;
          yield { type: "text-delta", id: "t", delta: "too late" };
          yield FINISH;
        },
      },
    });

    const cause = await transport
      .send({
        session: table.session,
        text: "go",
        conversation: [],
        signal: controller.signal,
      })
      .then(
        () => undefined,
        (thrown: unknown) => thrown
      );

    expect(cause).toMatchObject({ code: "cancelled" });
  });
});
