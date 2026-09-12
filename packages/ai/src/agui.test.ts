import { describe, expect, it, vi } from "vitest";

import {
  type AgUiConnection,
  type AgUiEvent,
  AgUiProtocolError,
  type AgUiRunInput,
  aguiToolName,
  aguiTransport,
  statePatch,
} from "./agui";
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

/** The live table the tests drive, and what the host wired to it. */
function liveTable(): {
  session: AgentSession;
  state: { page: number; sortBy?: string; revision: number };
  inputs: () => { view: Record<string, unknown> };
} {
  const state: { page: number; sortBy?: string; revision: number } = {
    page: 1,
    revision: 1,
  };
  const observation = (): AgentObservation => ({
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
  });
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
  return {
    session,
    state,
    inputs: () => ({
      view: {
        page: state.page,
        limit: 25,
        search: "",
        ...(state.sortBy ? { sortBy: state.sortBy, sortDir: "desc" } : {}),
      },
    }),
  };
}

/** A connection that replays one recorded script per run. */
function recorded(
  scripts: readonly ((input: AgUiRunInput) => readonly AgUiEvent[])[]
): { connection: AgUiConnection; inputs: AgUiRunInput[] } {
  const inputs: AgUiRunInput[] = [];
  let run = 0;
  return {
    inputs,
    connection: {
      run: (input) => {
        inputs.push(input);
        const script = scripts[Math.min(run, scripts.length - 1)];
        run += 1;
        const events = script?.(input) ?? [];
        // A recorded script has nothing to wait for; it is still an async
        // iterable, which is what the adapter consumes.
        return (function* () {
          for (const event of events) yield event;
        })();
      },
    },
  };
}

function started(input: AgUiRunInput): AgUiEvent {
  return { type: "RUN_STARTED", threadId: input.threadId, runId: input.runId };
}

function finished(
  input: AgUiRunInput,
  outcome?: AgUiEvent["outcome"]
): AgUiEvent {
  return {
    type: "RUN_FINISHED",
    threadId: input.threadId,
    runId: input.runId,
    ...(outcome ? { outcome } : {}),
  };
}

function says(text: string): AgUiEvent[] {
  return [
    { type: "TEXT_MESSAGE_START", messageId: "m" },
    { type: "TEXT_MESSAGE_CONTENT", messageId: "m", delta: text },
    { type: "TEXT_MESSAGE_END", messageId: "m" },
  ];
}

function calls(id: string, key: string, args: string): AgUiEvent[] {
  return [
    {
      type: "TOOL_CALL_START",
      toolCallId: id,
      toolCallName: aguiToolName(TABLE_ID, key),
    },
    { type: "TOOL_CALL_ARGS", toolCallId: id, delta: args },
    { type: "TOOL_CALL_END", toolCallId: id },
  ];
}

describe("what a run is given", () => {
  it("offers the enabled contract as this run's tools", async () => {
    const table = liveTable();
    const script = recorded([(input) => [started(input), finished(input)]]);
    const transport = aguiTransport({ connection: script.connection });

    await transport.send({
      session: table.session,
      text: "hello",
      conversation: [],
    });

    const [input] = script.inputs;
    expect(input?.tools.map((tool) => tool.name)).toEqual(
      table.session.catalog().map((entry) => aguiToolName(TABLE_ID, entry.key))
    );
    const sort = input?.tools.find(
      (tool) => tool.name === aguiToolName(TABLE_ID, "view.setSort")
    );
    expect(sort?.description).toBe("Change or clear the sort.");
    expect(sort?.parameters).toMatchObject({ type: "object" });
  });

  it("carries the conversation and this turn's message", async () => {
    const table = liveTable();
    const script = recorded([(input) => [started(input), finished(input)]]);
    const transport = aguiTransport({ connection: script.connection });

    await transport.send({
      session: table.session,
      text: "and now sort it",
      conversation: [
        { role: "user", text: "go to page 2" },
        { role: "assistant", text: "Done." },
      ],
    });

    expect(
      script.inputs[0]?.messages.map((message) => [
        message.role,
        message.content,
      ])
    ).toEqual([
      ["user", "go to page 2"],
      ["assistant", "Done."],
      ["user", "and now sort it"],
    ]);
  });

  it("sends the whole view once, then only what moved", async () => {
    const table = liveTable();
    const script = recorded([
      (input) => [
        started(input),
        ...calls("c1", "view.setSort", '{"key":"total","dir":"desc"}'),
        finished(input),
      ],
      (input) => [started(input), finished(input)],
    ]);
    const transport = aguiTransport({
      connection: script.connection,
      contextInputs: table.inputs,
    });

    await transport.send({
      session: table.session,
      text: "sort it",
      conversation: [],
    });
    await transport.send({
      session: table.session,
      text: "thanks",
      conversation: [],
    });

    expect(script.inputs[0]?.state).toMatchObject({ revision: 1, page: 1 });
    expect(script.inputs[0]?.stateDelta).toBeUndefined();
    expect(script.inputs[1]?.state).toBeUndefined();
    expect(script.inputs[1]?.stateDelta).toEqual([
      { op: "replace", path: "/revision", value: 2 },
      { op: "add", path: "/sortBy", value: "total" },
      { op: "add", path: "/sortDir", value: "desc" },
    ]);
  });

  it("publishes the state on connect and does not repeat it", async () => {
    const table = liveTable();
    const script = recorded([(input) => [started(input), finished(input)]]);
    const events: AgUiEvent[] = [];
    const transport = aguiTransport({
      connection: script.connection,
      contextInputs: table.inputs,
      onEvent: (event) => events.push(event),
    });

    await transport.connect?.({ session: table.session });
    await transport.send({
      session: table.session,
      text: "hello",
      conversation: [],
    });

    expect(
      events.filter((event) => event.type === "STATE_SNAPSHOT")
    ).toHaveLength(1);
    // A run input is read on its own, so it still carries the whole view.
    expect(script.inputs[0]?.state).toMatchObject({ page: 1 });
  });
});

describe("a tool call", () => {
  it("runs through the session and answers with its result", async () => {
    const table = liveTable();
    const script = recorded([
      (input) => [
        started(input),
        ...calls("c1", "view.setPage", '{"page":3}'),
        ...says("Page 3."),
        finished(input),
      ],
    ]);
    const events: AgUiEvent[] = [];
    const transport = aguiTransport({
      connection: script.connection,
      onEvent: (event) => events.push(event),
    });

    const reply = await transport.send({
      session: table.session,
      text: "page 3 please",
      conversation: [],
    });

    expect(table.state.page).toBe(3);
    expect(reply.keys).toEqual(["view.setPage"]);
    expect(reply.results?.[0]?.ok).toBe(true);
    expect(reply.text).toBe("Page 3.");
    const answered = events.find((event) => event.type === "TOOL_CALL_RESULT");
    expect(answered?.toolCallId).toBe("c1");
    expect(JSON.parse(String(answered?.content))).toMatchObject({ ok: true });
  });

  it("reports the assistant's words as they arrive", async () => {
    const table = liveTable();
    const script = recorded([
      (input) => [
        started(input),
        { type: "TEXT_MESSAGE_CONTENT", messageId: "m", delta: "Sorted " },
        { type: "TEXT_MESSAGE_CONTENT", messageId: "m", delta: "by total." },
        finished(input),
      ],
    ]);
    const partial: string[] = [];
    const transport = aguiTransport({ connection: script.connection });

    const reply = await transport.send({
      session: table.session,
      text: "sort",
      conversation: [],
      onPartialText: (text) => partial.push(text),
    });

    expect(partial).toEqual(["Sorted ", "Sorted by total."]);
    expect(reply.text).toBe("Sorted by total.");
  });

  it("leaves a tool that is not ours to whoever registered it", async () => {
    const table = liveTable();
    const script = recorded([
      (input) => [
        started(input),
        {
          type: "TOOL_CALL_START",
          toolCallId: "c1",
          toolCallName: "navigateTo",
        },
        { type: "TOOL_CALL_ARGS", toolCallId: "c1", delta: '{"to":"/orders"}' },
        { type: "TOOL_CALL_END", toolCallId: "c1" },
        finished(input),
      ],
    ]);
    const transport = aguiTransport({ connection: script.connection });

    const reply = await transport.send({
      session: table.session,
      text: "go",
      conversation: [],
    });

    expect(reply.keys).toEqual([]);
    expect(reply.results).toEqual([]);
    expect(table.state.page).toBe(1);
  });

  it("replays rather than repeating a write when a run re-emits a call", async () => {
    const table = liveTable();
    const executed = vi.fn();
    const spied: AgentSession = {
      ...table.session,
      execute: (key, args, revision, idempotencyKey, signal) => {
        executed(idempotencyKey);
        return table.session.execute(
          key,
          args,
          revision,
          idempotencyKey,
          signal
        );
      },
    };
    const script = recorded([
      (input) => [
        started(input),
        ...calls("c1", "view.setPage", '{"page":3}'),
        ...calls("c1", "view.setPage", '{"page":3}'),
        finished(input),
      ],
    ]);
    const transport = aguiTransport({ connection: script.connection });

    const reply = await transport.send({
      session: spied,
      text: "page 3",
      conversation: [],
    });

    // Two calls, one identity: the second reads back the first result rather
    // than moving the table again.
    expect(executed).toHaveBeenCalledTimes(2);
    expect(executed.mock.calls[0]?.[0]).toBe(executed.mock.calls[1]?.[0]);
    expect(reply.results).toHaveLength(2);
    expect(table.state.revision).toBe(2);
  });
});

describe("a run that stops for the reader", () => {
  it("asks through the same seam the session uses, and resumes approved", async () => {
    const table = liveTable();
    const seen: ApprovalSubject[] = [];
    const script = recorded([
      (input) => [
        started(input),
        finished(input, {
          interrupt: {
            interruptId: "int-1",
            reason: "confirmation",
            payload: {
              capability: "view.setPage",
              title: "Jump to the last page",
              arguments: { page: 40 },
            },
          },
        }),
      ],
      (input) => [
        started(input),
        ...calls("c1", "view.setPage", '{"page":40}'),
        finished(input),
      ],
    ]);
    const transport = aguiTransport({
      connection: script.connection,
      onApprove: (subject) => {
        seen.push(subject);
        return Promise.resolve(true);
      },
    });

    const reply = await transport.send({
      session: table.session,
      text: "last page",
      conversation: [],
    });

    expect(seen[0]).toMatchObject({
      kind: "operation",
      capability: "view.setPage",
      title: "Jump to the last page",
      arguments: { page: 40 },
    });
    expect(script.inputs[1]?.resume).toEqual([
      { interruptId: "int-1", status: "approved" },
    ]);
    expect(table.state.page).toBe(40);
    expect(reply.unresolved).toBeUndefined();
  });

  it("hands an enumerated write over as rows the reader can decide one by one", async () => {
    const table = liveTable();
    const seen: ApprovalSubject[] = [];
    const script = recorded([
      (input) => [
        started(input),
        finished(input, {
          interrupt: {
            interruptId: "int-1",
            reason: "confirmation",
            payload: {
              perItem: true,
              proposals: [
                { rowKey: "r1", column: "total", before: 1, after: 2 },
                { rowKey: "r2", column: "total", before: 3, after: 4 },
                { nothing: "addressable" },
              ],
            },
          },
        }),
      ],
      (input) => [started(input), ...says("Changed one."), finished(input)],
    ]);
    const transport = aguiTransport({
      connection: script.connection,
      onApprove: (subject) => {
        seen.push(subject);
        return Promise.resolve({ approved: [0], reason: "only the first" });
      },
    });

    await transport.send({
      session: table.session,
      text: "fix them",
      conversation: [],
    });

    const subject = seen[0];
    expect(subject?.kind).toBe("rows");
    // A proposal nobody can address is not a row anyone can decide about.
    expect(subject?.kind === "rows" && subject.proposals).toEqual([
      { rowKey: "r1", column: "total", before: 1, after: 2 },
      { rowKey: "r2", column: "total", before: 3, after: 4 },
    ]);
    expect(subject?.kind === "rows" && subject.perItem).toBe(true);
    expect(script.inputs[1]?.resume).toEqual([
      {
        interruptId: "int-1",
        status: "partial",
        payload: { approved: [0], reason: "only the first" },
      },
    ]);
  });

  it("resumes rejected, and the write never runs", async () => {
    const table = liveTable();
    const script = recorded([
      (input) => [
        started(input),
        finished(input, {
          interrupt: {
            interruptId: "int-1",
            reason: "confirmation",
            payload: { capability: "view.setPage", arguments: { page: 40 } },
          },
        }),
      ],
      (input) => [started(input), ...says("Left it alone."), finished(input)],
    ]);
    const transport = aguiTransport({
      connection: script.connection,
      onApprove: () => Promise.resolve(false),
    });

    const reply = await transport.send({
      session: table.session,
      text: "last page",
      conversation: [],
    });

    expect(script.inputs[1]?.resume).toEqual([
      { interruptId: "int-1", status: "rejected" },
    ]);
    expect(table.state.page).toBe(1);
    expect(reply.text).toBe("Left it alone.");
  });

  it("stops the turn rather than approving itself when nobody can be asked", async () => {
    const table = liveTable();
    const script = recorded([
      (input) => [
        started(input),
        finished(input, {
          interrupt: {
            interruptId: "int-1",
            reason: "confirmation",
            payload: { capability: "edit.cells", arguments: {} },
          },
        }),
      ],
    ]);
    const transport = aguiTransport({ connection: script.connection });

    const reply = await transport.send({
      session: table.session,
      text: "change them",
      conversation: [],
    });

    expect(reply.unresolved).toMatchObject({
      code: "approval-unavailable",
      pending: ["edit.cells"],
    });
    expect(script.inputs).toHaveLength(1);
  });

  it("puts an input_required interrupt to the reader as a question", async () => {
    const table = liveTable();
    const asked: unknown[] = [];
    const script = recorded([
      (input) => [
        started(input),
        finished(input, {
          interrupt: {
            interruptId: "q-1",
            reason: "input_required",
            payload: {
              question: "Which quarter?",
              options: [
                { id: "q3", label: "Q3" },
                { id: "q4", label: "Q4" },
                { id: 7, label: "not a choice" },
              ],
            },
          },
        }),
      ],
      (input) => [started(input), ...says("Q4 it is."), finished(input)],
    ]);
    const transport = aguiTransport({
      connection: script.connection,
      askUser: (question) => {
        asked.push(question);
        return Promise.resolve({ optionId: "q4" });
      },
    });

    const reply = await transport.send({
      session: table.session,
      text: "totals please",
      conversation: [],
    });

    expect(asked[0]).toEqual({
      id: "q-1",
      question: "Which quarter?",
      options: [
        { id: "q3", label: "Q3" },
        { id: "q4", label: "Q4" },
      ],
      allowFreeText: false,
    });
    expect(script.inputs[1]?.resume).toEqual([
      { interruptId: "q-1", status: "answered", payload: { optionId: "q4" } },
    ]);
    expect(reply.text).toBe("Q4 it is.");
  });

  it("reports an unanswered question rather than inventing an answer", async () => {
    const table = liveTable();
    const script = recorded([
      (input) => [
        started(input),
        finished(input, {
          interrupt: {
            interruptId: "q-1",
            reason: "input_required",
            payload: { question: "Which quarter?" },
          },
        }),
      ],
    ]);
    const transport = aguiTransport({
      connection: script.connection,
      askUser: () => Promise.resolve(undefined),
    });

    const reply = await transport.send({
      session: table.session,
      text: "totals",
      conversation: [],
    });

    expect(reply.unresolved).toMatchObject({ code: "question-unanswered" });
  });

  it("refuses to resume forever", async () => {
    const table = liveTable();
    const script = recorded([
      (input) => [
        started(input),
        finished(input, {
          interrupt: {
            interruptId: "int-1",
            reason: "confirmation",
            payload: { capability: "view.setPage", arguments: { page: 2 } },
          },
        }),
      ],
    ]);
    const transport = aguiTransport({
      connection: script.connection,
      maxRuns: 3,
      onApprove: () => Promise.resolve(true),
    });

    const reply = await transport.send({
      session: table.session,
      text: "go",
      conversation: [],
    });

    expect(script.inputs).toHaveLength(3);
    expect(reply.unresolved).toMatchObject({ code: "resume-limit" });
  });
});

describe("a run that does not behave like AG-UI", () => {
  it("refuses a text event without a delta", async () => {
    const table = liveTable();
    const script = recorded([
      (input) => [
        started(input),
        { type: "TEXT_MESSAGE_CONTENT", messageId: "m" },
        finished(input),
      ],
    ]);
    const transport = aguiTransport({ connection: script.connection });

    await expect(
      transport.send({ session: table.session, text: "hi", conversation: [] })
    ).rejects.toThrow(AgUiProtocolError);
  });

  it("refuses arguments that arrive for a call nobody started", async () => {
    const table = liveTable();
    const script = recorded([
      (input) => [
        started(input),
        { type: "TOOL_CALL_ARGS", toolCallId: "ghost", delta: "{}" },
        finished(input),
      ],
    ]);
    const transport = aguiTransport({ connection: script.connection });

    await expect(
      transport.send({ session: table.session, text: "hi", conversation: [] })
    ).rejects.toMatchObject({ code: "unknown-tool-call" });
  });

  it("refuses tool arguments that are not JSON", async () => {
    const table = liveTable();
    const script = recorded([
      (input) => [
        started(input),
        ...calls("c1", "view.setPage", "{page: 3"),
        finished(input),
      ],
    ]);
    const transport = aguiTransport({ connection: script.connection });

    await expect(
      transport.send({ session: table.session, text: "hi", conversation: [] })
    ).rejects.toMatchObject({ code: "malformed-tool-args" });
    expect(table.state.page).toBe(1);
  });

  it("refuses a stream that stops without finishing", async () => {
    const table = liveTable();
    const script = recorded([(input) => [started(input), ...says("half a")]]);
    const transport = aguiTransport({ connection: script.connection });

    await expect(
      transport.send({ session: table.session, text: "hi", conversation: [] })
    ).rejects.toMatchObject({ code: "run-incomplete" });
  });

  it("reports a run error with what the backend said", async () => {
    const table = liveTable();
    const script = recorded([
      (input) => [
        started(input),
        { type: "RUN_ERROR", code: "rate-limited", message: "slow down" },
      ],
    ]);
    const transport = aguiTransport({ connection: script.connection });

    await expect(
      transport.send({ session: table.session, text: "hi", conversation: [] })
    ).rejects.toMatchObject({ code: "rate-limited", message: "slow down" });
  });

  it("leaves an event it has never heard of alone", async () => {
    const table = liveTable();
    const seen: string[] = [];
    const script = recorded([
      (input) => [
        started(input),
        { type: "STEP_STARTED", stepName: "plan" },
        { type: "CUSTOM", name: "whatever" },
        ...says("Done."),
        finished(input),
      ],
    ]);
    const transport = aguiTransport({
      connection: script.connection,
      onEvent: (event) => seen.push(event.type),
    });

    const reply = await transport.send({
      session: table.session,
      text: "hi",
      conversation: [],
    });

    expect(reply.text).toBe("Done.");
    expect(seen).toContain("STEP_STARTED");
    expect(seen).toContain("CUSTOM");
  });
});

describe("a cancelled run", () => {
  it("stops consuming and never runs the call that follows", async () => {
    const table = liveTable();
    const controller = new AbortController();
    const script = recorded([
      (input) => [
        started(input),
        { type: "TEXT_MESSAGE_CONTENT", messageId: "m", delta: "working" },
        ...calls("c1", "view.setPage", '{"page":9}'),
        finished(input),
      ],
    ]);
    const transport = aguiTransport({ connection: script.connection });

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

describe("statePatch", () => {
  it("names what changed, and escapes a pointer segment", () => {
    expect(
      statePatch(
        { revision: 1, filters: { "a/b": 1, "c~d": 2, gone: 3 } },
        { revision: 2, filters: { "a/b": 9, "c~d": 2 }, search: "x" }
      )
    ).toEqual([
      { op: "replace", path: "/revision", value: 2 },
      { op: "replace", path: "/filters/a~1b", value: 9 },
      { op: "remove", path: "/filters/gone" },
      { op: "add", path: "/search", value: "x" },
    ]);
  });

  it("says nothing about a view that did not move", () => {
    const view = { revision: 1, filters: { team: ["core"] } };
    expect(
      statePatch(view, { revision: 1, filters: { team: ["core"] } })
    ).toEqual([]);
  });

  it("replaces an array whole rather than guessing at positions", () => {
    expect(
      statePatch({ unknown: ["page"] }, { unknown: ["page", "limit"] })
    ).toEqual([{ op: "replace", path: "/unknown", value: ["page", "limit"] }]);
  });
});
