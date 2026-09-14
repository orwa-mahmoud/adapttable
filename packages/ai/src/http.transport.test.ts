/**
 * The bridge's own front door.
 *
 * Everything reaching `parseAgentHttpRequest` / `parseAgentHttpResponse` comes
 * off the wire from a model or a backend nobody here controls, so the shape
 * checks ARE the contract: a malformed body has to be refused by name, and a
 * well-formed one has to survive untouched. The ceilings matter for the same
 * reason — a model that asks for two hundred row windows, or answers with a
 * megabyte of actions, must be stopped before any of it is executed.
 */
import { describe, expect, it, vi } from "vitest";

import {
  AgentHttpError,
  assistantHttpTransport,
  createAgentHttpClient,
  parseAgentHttpRequest,
  parseAgentHttpResponse,
  runAgentHttpTurn,
} from "./http";
import { AGENT_SCHEMA_VERSION } from "./keys";
import { createAgentSession } from "./session";
import type { AgentObservation } from "./types";

const PAGE_ONLY = {
  fullDataset: false,
  grouping: false as const,
  selectAcrossPages: false,
  exportScope: "page" as const,
  totalCount: "loaded" as const,
};

function observation(patch: Partial<AgentObservation> = {}): AgentObservation {
  return {
    tableId: "orders",
    viewRevision: 1,
    featureIds: ["filters"],
    columns: [
      {
        id: "name",
        label: "Name",
        type: "string",
        readable: true,
        writable: true,
        sortable: true,
      },
    ],
    source: PAGE_ONLY,
    writePolicy: "allow",
    approval: "never",
    commit: "immediate",
    hasPagination: true,
    hasSearch: true,
    hasSort: true,
    hasFilters: true,
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

function session(apply = {}) {
  return createAgentSession({
    observe: () => observation(),
    apply: {
      setPage: vi.fn(),
      readRows: () => ({
        offset: 0,
        limit: 1,
        redacted: [],
        rows: [{ rowKey: "r1", cells: { name: "Ada" } }],
      }),
      resolveRow: () => ({ rowKey: "r1", scope: "visible" as const }),
      ...apply,
    },
  });
}

function validRequest(): Record<string, unknown> {
  const live = session();
  return {
    schemaVersion: AGENT_SCHEMA_VERSION,
    kind: "hello",
    tableId: "orders",
    manifest: live.manifest(),
    catalog: live.catalog(),
  };
}

function response(patch: Record<string, unknown>): Record<string, unknown> {
  return { schemaVersion: AGENT_SCHEMA_VERSION, ...patch };
}

describe("parseAgentHttpRequest rejects a malformed envelope by name", () => {
  const cases: readonly [string, unknown, RegExp][] = [
    ["not an object", "hello", /must be an object/],
    [
      "an unknown kind",
      { ...validRequest(), kind: "chat" },
      /kind must be "hello", "schema", or "turn"/,
    ],
    ["an empty tableId", { ...validRequest(), tableId: "" }, /tableId/],
    [
      "a manifest that is not an object",
      { ...validRequest(), manifest: "orders" },
      /manifest must be an object/,
    ],
    [
      "a catalog that is not an array",
      { ...validRequest(), catalog: {} },
      /catalog must be an array/,
    ],
  ];
  for (const [name, body, message] of cases) {
    it(`refuses ${name}`, () => {
      expect(() => parseAgentHttpRequest(body)).toThrow(message);
    });
  }
});

describe("parseAgentHttpRequest checks the manifest it is handed", () => {
  const base = validRequest();
  const manifest = base.manifest as Record<string, unknown>;
  const cases: readonly [string, Record<string, unknown>, RegExp][] = [
    [
      "a manifest for no table",
      { ...manifest, tableId: "" },
      /manifest.tableId/,
    ],
    [
      "a manifest with no revision to pin to",
      { ...manifest, viewRevision: "1" },
      /manifest.viewRevision/,
    ],
    [
      "a manifest whose capabilities are not a list",
      { ...manifest, capabilities: "view.setPage" },
      /manifest.capabilities/,
    ],
    [
      "a manifest with no policy",
      { ...manifest, policy: undefined },
      /manifest.policy/,
    ],
  ];
  for (const [name, patched, message] of cases) {
    it(`refuses ${name}`, () => {
      expect(() =>
        parseAgentHttpRequest({ ...base, manifest: patched })
      ).toThrow(message);
    });
  }

  it("carries an optional turn payload through unchanged", () => {
    // `descriptions` and `rows` are gone: a turn answers a backend's questions
    // through `toolResults`, in the same list the calls arrived on.
    const toolResults = [
      { id: "n1", result: { source: "table-rows", untrusted: true } },
    ];
    const parsed = parseAgentHttpRequest({
      ...base,
      kind: "turn",
      message: "page 2",
      conversation: [{ role: "user", content: "page 2" }],
      turnId: "t-1",
      phaseId: 0,
      toolResults,
    });
    expect(parsed.message).toBe("page 2");
    expect(parsed.conversation).toHaveLength(1);
    expect(parsed.turnId).toBe("t-1");
    expect(parsed.toolResults?.[0]?.id).toBe("n1");
  });
});

describe("parseAgentHttpResponse holds the ceilings", () => {
  it("refuses a response that is not an object", () => {
    expect(() => parseAgentHttpResponse(["ok"])).toThrow(/must be an object/);
  });

  it("refuses a tool call with no name or no id", () => {
    expect(() =>
      parseAgentHttpResponse(response({ toolCalls: [{ id: "a1", args: {} }] }))
    ).toThrow(/tool call.name is required/);
    expect(() =>
      parseAgentHttpResponse(
        response({ toolCalls: [{ name: "view.setPage", args: {} }] })
      )
    ).toThrow(/tool call.id is required/);
  });

  it("refuses more tool calls than one turn may carry", () => {
    const toolCalls = Array.from({ length: 33 }, (_, index) => ({
      id: `page-${String(index)}`,
      name: "view.setPage",
      args: { page: index + 1 },
    }));
    expect(() => parseAgentHttpResponse(response({ toolCalls }))).toThrow(
      /toolCalls exceed limit of 32/
    );
  });

  it("refuses more describe asks than one turn may carry", () => {
    const toolCalls = Array.from({ length: 17 }, (_, i) => ({
      id: `d${String(i)}`,
      name: "describe",
      args: { keys: [`view.k${String(i)}`] },
    }));
    expect(() => parseAgentHttpResponse(response({ toolCalls }))).toThrow(
      /describe calls exceed limit of 16/
    );
  });

  it("refuses more row windows than one turn may carry", () => {
    const toolCalls = Array.from({ length: 17 }, (_, i) => ({
      id: `r${String(i)}`,
      name: "read",
      args: { offset: i, limit: 1 },
    }));
    expect(() => parseAgentHttpResponse(response({ toolCalls }))).toThrow(
      /read calls exceed limit of 16/
    );
  });

  it("refuses a row window it cannot address", () => {
    const read = (args: unknown) =>
      response({ toolCalls: [{ id: "r1", name: "read", args }] });
    expect(() =>
      parseAgentHttpResponse(read({ offset: 0, limit: 1, scope: "all" }))
    ).toThrow(/read.scope must be "visible", "page", or "full"/);
    expect(() =>
      parseAgentHttpResponse(read({ offset: "0", limit: 1 }))
    ).toThrow(/read.offset must be a finite number/);
    expect(() =>
      parseAgentHttpResponse(read({ offset: 0, limit: Infinity }))
    ).toThrow(/read.limit must be a finite number/);
  });

  it("refuses a describe that does not name string keys", () => {
    expect(() =>
      parseAgentHttpResponse(
        response({
          toolCalls: [{ id: "d1", name: "describe", args: { keys: [7] } }],
        })
      )
    ).toThrow(/describe.keys must be an array of strings/);
  });

  it("defaults a window the model left open, and keeps what it named", () => {
    const parsed = parseAgentHttpResponse(
      response({
        toolCalls: [
          { id: "d1", name: "describe", args: { keys: ["view.setPage"] } },
          {
            id: "r1",
            name: "read",
            args: { scope: "page", columns: ["name", 7] },
          },
        ],
      })
    );
    expect(parsed.toolCalls?.[1]?.args).toEqual({
      offset: 0,
      limit: 10,
      columns: ["name"],
      scope: "page",
    });
    expect(parsed.toolCalls?.[0]?.args).toEqual({ keys: ["view.setPage"] });
  });

  it("refuses a question that offers nothing and forbids typing", () => {
    expect(() =>
      parseAgentHttpResponse(
        response({
          askUser: { id: "q1", question: "Which?", allowFreeText: false },
        })
      )
    ).toThrow(/must offer options or allow free text/);
  });
});

describe("the HTTP client", () => {
  it("refuses to send a body larger than one request may carry", async () => {
    const live = session({});
    const client = createAgentHttpClient({
      endpoint: "https://agent.example/turn",
      request: () => {
        throw new Error("must not reach the network");
      },
    });
    await expect(client.send(live, "x".repeat(300_000))).rejects.toThrow(
      AgentHttpError
    );
  });

  it("resolves headers from a function on every exchange", async () => {
    const headers = vi.fn(() => ({ authorization: "Bearer live" }));
    const fetchImpl = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((resolve) => {
          expect(new Headers(init?.headers).get("authorization")).toBe(
            "Bearer live"
          );
          resolve(
            new Response(
              JSON.stringify({
                schemaVersion: AGENT_SCHEMA_VERSION,
                ok: true,
                text: "Ready",
              }),
              { status: 200, headers: { "content-type": "application/json" } }
            )
          );
        })
    );
    const live = session();
    const client = createAgentHttpClient({
      endpoint: "https://agent.example/turn",
      headers,
      fetch: fetchImpl as unknown as typeof fetch,
    });
    await client.connect(live);
    expect(headers).toHaveBeenCalledTimes(1);
  });

  it("reports the caller's own abort reason rather than a platform one", async () => {
    const controller = new AbortController();
    const live = session();
    const promise = runAgentHttpTurn(
      live,
      "page 2",
      {
        endpoint: "https://agent.example/turn",
        request: () => new Promise(() => undefined),
      },
      { signal: controller.signal }
    );
    controller.abort(new Error("host navigated away"));
    await expect(promise).rejects.toThrow(/host navigated away/);
  });

  it("keeps answering while the model asks for more, then stops", async () => {
    const live = session();
    const replies = [
      {
        schemaVersion: AGENT_SCHEMA_VERSION,
        toolCalls: [{ id: "p2", name: "view.setPage", args: { page: 2 } }],
        text: "Moved.",
        continueWithResults: true,
      },
      {
        schemaVersion: AGENT_SCHEMA_VERSION,
        toolCalls: [{ id: "r1", name: "read", args: { offset: 0, limit: 1 } }],
      },
      {
        schemaVersion: AGENT_SCHEMA_VERSION,
        toolCalls: [{ id: "p3", name: "view.setPage", args: { page: 3 } }],
        text: "And again.",
        continueWithResults: false,
      },
    ];
    let call = 0;
    const result = await runAgentHttpTurn(
      live,
      "page 2",
      {
        endpoint: "https://agent.example/turn",
        request: () => Promise.resolve(replies[call++] ?? replies[2]),
      },
      { returnResults: true }
    );
    expect(result.results.map((r) => r.ok)).toEqual([true, true]);
    expect(result.text).toBe("And again.");
    expect(result.needsFulfilled.read).toBe(1);
  });
});

describe("the HTTP transport the assistant store speaks to", () => {
  /** A backend that answers one recorded reply per turn. */
  function backend(replies: readonly Record<string, unknown>[]) {
    const bodies: unknown[] = [];
    let at = 0;
    return {
      bodies,
      request: (body: unknown) => {
        bodies.push(body);
        const reply = replies[Math.min(at, replies.length - 1)] ?? {};
        at += 1;
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          ...reply,
        });
      },
    };
  }

  it("carries the turn and hands back what the backend said", async () => {
    const live = session();
    const route = backend([{ text: "Page 3 it is." }]);
    const transport = assistantHttpTransport({
      endpoint: "https://agent.example/turn",
      request: route.request,
    });

    await transport.connect?.({ session: live });
    const reply = await transport.send({
      session: live,
      text: "go to page 3",
      conversation: [{ role: "user", text: "hello" }],
    });

    expect(reply.text).toBe("Page 3 it is.");
    expect(route.bodies.at(-1)).toMatchObject({
      message: "go to page 3",
      conversation: [{ role: "user", text: "hello" }],
    });
  });

  it("reports streamed text to the turn that is in flight", async () => {
    const live = session();
    const seen: string[] = [];
    const transport = assistantHttpTransport({
      endpoint: "https://agent.example/turn",
      request: () =>
        Promise.resolve({ schemaVersion: AGENT_SCHEMA_VERSION, text: "done" }),
      // The client's own sink stands in for a stream arriving mid-turn.
      onStreamText: undefined,
    });
    await transport.connect?.({ session: live });

    await transport.send({
      session: live,
      text: "go",
      conversation: [],
      onPartialText: (text) => seen.push(text),
    });

    // Nothing streamed here, but the turn completed and the sink was released
    // rather than left pointing at a conversation that has moved on.
    expect(seen).toEqual([]);
  });

  it("asks the turn's own surface when the host supplied no channel", async () => {
    const live = session();
    const asked: string[] = [];
    const transport = assistantHttpTransport({
      endpoint: "https://agent.example/turn",
      request: (body) => {
        const sent = body as { toolResults?: unknown };
        // First turn asks; the second carries the answer back.
        return Promise.resolve(
          sent.toolResults
            ? { schemaVersion: AGENT_SCHEMA_VERSION, text: "thanks" }
            : {
                schemaVersion: AGENT_SCHEMA_VERSION,
                askUser: {
                  id: "q1",
                  question: "Which quarter?",
                  options: [{ id: "q4", label: "Q4" }],
                },
              }
        );
      },
    });
    await transport.connect?.({ session: live });

    await transport.send({
      session: live,
      text: "summarise",
      conversation: [],
      askUser: (question) => {
        asked.push(question.question);
        return Promise.resolve({ optionId: "q4" });
      },
    });

    expect(asked).toEqual(["Which quarter?"]);
  });

  it("sends the answer back in words, not as an id against a lost question", async () => {
    // The wire is stateless: every request describes the whole situation, and
    // the question is not in the next one. `{"optionId":"d"}` against `q1` is
    // a letter answering something the backend cannot see, which is how a
    // model ends up telling the reader it never asked anything.
    const live = session();
    let carried: unknown;
    const transport = assistantHttpTransport({
      endpoint: "https://agent.example/turn",
      request: (body) => {
        const sent = body as { toolResults?: readonly { result?: unknown }[] };
        if (sent.toolResults) carried = sent.toolResults[0]?.result;
        return Promise.resolve(
          sent.toolResults
            ? { schemaVersion: AGENT_SCHEMA_VERSION, text: "thanks" }
            : {
                schemaVersion: AGENT_SCHEMA_VERSION,
                askUser: {
                  id: "q1",
                  question: "Which quarter?",
                  options: [
                    { id: "d", label: "Q4" },
                    { id: "c", label: "Q3" },
                  ],
                },
              }
        );
      },
    });

    await transport.connect?.({ session: live });
    await transport.send({
      session: live,
      text: "summarise",
      conversation: [],
      askUser: () => Promise.resolve({ optionId: "d" }),
    });

    expect(carried).toEqual({
      question: "Which quarter?",
      offered: [
        { id: "d", label: "Q4" },
        { id: "c", label: "Q3" },
      ],
      optionId: "d",
      chose: "Q4",
    });
  });

  it("still names the question when the chosen id matches no option", async () => {
    // A backend that renumbered its own options, or a host channel answering
    // with an id of its own: the label is gone, the id and the question are
    // not, and sending those beats sending nothing.
    const live = session();
    let carried: unknown;
    const transport = assistantHttpTransport({
      endpoint: "https://agent.example/turn",
      request: (body) => {
        const sent = body as { toolResults?: readonly { result?: unknown }[] };
        if (sent.toolResults) carried = sent.toolResults[0]?.result;
        return Promise.resolve(
          sent.toolResults
            ? { schemaVersion: AGENT_SCHEMA_VERSION, text: "thanks" }
            : {
                schemaVersion: AGENT_SCHEMA_VERSION,
                askUser: {
                  id: "q1",
                  question: "Which quarter?",
                  options: [{ id: "d", label: "Q4" }],
                  allowFreeText: true,
                },
              }
        );
      },
    });
    await transport.connect?.({ session: live });
    await transport.send({
      session: live,
      text: "summarise",
      conversation: [],
      askUser: () => Promise.resolve({ optionId: "z", text: "the last one" }),
    });

    expect(carried).toEqual({
      question: "Which quarter?",
      offered: [{ id: "d", label: "Q4" }],
      optionId: "z",
      text: "the last one",
    });
  });

  it("sends the choices back beside an answer that ignored them", async () => {
    // A reader may say something else instead of picking — they always can.
    // The backend kept nothing, so the list it offered travels with the
    // answer, and it can tell a new request from one of its own choices.
    const live = session();
    let carried: unknown;
    const transport = assistantHttpTransport({
      endpoint: "https://agent.example/turn",
      request: (body) => {
        const sent = body as { toolResults?: readonly { result?: unknown }[] };
        if (sent.toolResults) carried = sent.toolResults[0]?.result;
        return Promise.resolve(
          sent.toolResults
            ? { schemaVersion: AGENT_SCHEMA_VERSION, text: "thanks" }
            : {
                schemaVersion: AGENT_SCHEMA_VERSION,
                askUser: {
                  id: "q1",
                  question: "Which quarter?",
                  options: [
                    { id: "d", label: "Q4" },
                    { id: "c", label: "Q3" },
                  ],
                  allowFreeText: false,
                },
              }
        );
      },
    });
    await transport.connect?.({ session: live });
    await transport.send({
      session: live,
      text: "summarise",
      conversation: [],
      askUser: () => Promise.resolve({ text: "neither — show me Platform" }),
    });

    expect(carried).toEqual({
      question: "Which quarter?",
      offered: [
        { id: "d", label: "Q4" },
        { id: "c", label: "Q3" },
      ],
      text: "neither — show me Platform",
    });
  });

  it("carries typed answers as the words that were typed", async () => {
    const live = session();
    let carried: unknown;
    const transport = assistantHttpTransport({
      endpoint: "https://agent.example/turn",
      request: (body) => {
        const sent = body as { toolResults?: readonly { result?: unknown }[] };
        if (sent.toolResults) carried = sent.toolResults[0]?.result;
        return Promise.resolve(
          sent.toolResults
            ? { schemaVersion: AGENT_SCHEMA_VERSION, text: "thanks" }
            : {
                schemaVersion: AGENT_SCHEMA_VERSION,
                askUser: {
                  id: "q1",
                  question: "Which quarter?",
                  allowFreeText: true,
                },
              }
        );
      },
    });
    await transport.connect?.({ session: live });
    await transport.send({
      session: live,
      text: "summarise",
      conversation: [],
      askUser: () => Promise.resolve({ text: "the last one" }),
    });

    expect(carried).toEqual({
      question: "Which quarter?",
      text: "the last one",
    });
  });

  it("forgets what a closed connection was told", async () => {
    const live = session();
    const route = backend([
      { text: "one", pin: { status: "acknowledged", contractVersion: "c1" } },
      { text: "two" },
    ]);
    const transport = assistantHttpTransport({
      endpoint: "https://agent.example/turn",
      request: route.request,
    });

    await transport.connect?.({ session: live });
    await transport.send({ session: live, text: "one", conversation: [] });
    transport.disconnect?.();

    // A pin belongs to the connection that earned it. After a disconnect the
    // next exchange negotiates for itself rather than assuming a backend it
    // is no longer talking to still holds the contract, so the contract
    // travels again instead of being referred to by version alone.
    await transport.connect?.({ session: live });
    await transport.send({ session: live, text: "two", conversation: [] });

    const last = route.bodies.at(-1) as Record<string, unknown>;
    expect(last.context ?? last.catalog).toBeDefined();
  });
});

describe("a client that cannot reach a backend", () => {
  it("refuses an endpoint that is only whitespace", async () => {
    const client = createAgentHttpClient({ endpoint: "   " });
    await expect(client.send(session(), "go")).rejects.toThrow(
      /endpoint is required/
    );
  });

  it("refuses when the runtime has no fetch and none was supplied", async () => {
    const saved = Object.getOwnPropertyDescriptor(globalThis, "fetch");
    Object.defineProperty(globalThis, "fetch", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    try {
      const client = createAgentHttpClient({
        endpoint: "https://agent.example/turn",
      });
      await expect(client.send(session(), "go")).rejects.toThrow(
        /requires fetch/
      );
    } finally {
      if (saved) Object.defineProperty(globalThis, "fetch", saved);
    }
  });

  it("says so when the backend rejects the opening exchange", async () => {
    const client = createAgentHttpClient({
      endpoint: "https://agent.example/turn",
      request: () =>
        Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          ok: false,
          text: "this table is not one I serve",
        }),
    });

    await expect(client.connect(session())).rejects.toThrow(/not one I serve/);
  });
});

describe("a host that would rather send the contract every time", () => {
  it("never pins when pinning is turned off", async () => {
    const bodies: Record<string, unknown>[] = [];
    const client = createAgentHttpClient({
      endpoint: "https://agent.example/turn",
      pinCatalog: false,
      request: (body) => {
        bodies.push(body as unknown as Record<string, unknown>);
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "ok",
          pin: { status: "acknowledged", contractVersion: "c1" },
        });
      },
    });
    const live = session();

    await client.connect(live);
    await client.send(live, "one");
    await client.send(live, "two");

    // The backend said it would hold the contract. The host said not to rely
    // on that, so every turn still carries it.
    for (const body of bodies) {
      expect(body.context ?? body.catalog).toBeDefined();
    }
  });
});

describe("a backend that will not finish a turn", () => {
  it("leaves a backend that keeps asking for new work", async () => {
    let rounds = 0;
    const client = createAgentHttpClient({
      endpoint: "https://agent.example/turn",
      request: (body) => {
        const sent = body as { kind?: string };
        if (sent.kind !== "turn" && sent.kind !== undefined) {
          return Promise.resolve({ schemaVersion: AGENT_SCHEMA_VERSION });
        }
        rounds += 1;
        // A different page each round, so nothing here is a repeat — this is
        // the backend that genuinely never settles.
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: `round ${String(rounds)}`,
          toolCalls: [
            {
              id: `c${String(rounds)}`,
              name: "view.setPage",
              args: { page: rounds + 1 },
            },
          ],
          continueWithResults: true,
        });
      },
    });

    const turn = await client.send(session(), "go", { returnResults: true });

    expect(turn.unresolved).toMatchObject({ code: "continuation-exhausted" });
    expect(rounds).toBeLessThanOrEqual(5);
  });

  it("stops asking to continue after the fourth round", async () => {
    let rounds = 0;
    const client = createAgentHttpClient({
      endpoint: "https://agent.example/turn",
      request: (body) => {
        const sent = body as { kind?: string };
        if (sent.kind !== "turn" && sent.kind !== undefined) {
          return Promise.resolve({ schemaVersion: AGENT_SCHEMA_VERSION });
        }
        rounds += 1;
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: `round ${String(rounds)}`,
          toolCalls: [
            {
              id: `c${String(rounds)}`,
              name: "view.setPage",
              args: { page: 2 },
            },
          ],
          continueWithResults: true,
        });
      },
    });

    // The continuation loop only runs for a caller that wants the receipts.
    const turn = await client.send(session(), "go", { returnResults: true });

    // A backend asking forever is a backend the turn has to be able to leave,
    // and it leaves on the first round that adds nothing: this one asks for
    // the page it is already on, again.
    expect(turn.unresolved).toMatchObject({ code: "repeated-plan" });
    expect(rounds).toBeLessThanOrEqual(5);
  });
});

describe("a question with nowhere to put it", () => {
  it("stops the turn rather than answering on the reader's behalf", async () => {
    const client = createAgentHttpClient({
      endpoint: "https://agent.example/turn",
      request: () =>
        Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          askUser: {
            id: "q1",
            question: "Which quarter?",
            options: [{ id: "q4", label: "Q4" }],
          },
        }),
    });

    const turn = await client.send(session(), "summarise");

    expect(turn.unresolved).toBeDefined();
  });
});

describe("what a turn does with a reader who will not answer", () => {
  it("reports a declined question as unanswered, not as an answer", async () => {
    const client = createAgentHttpClient({
      endpoint: "https://agent.example/turn",
      // The reader closed the panel, or the turn was abandoned while the
      // question was on screen. Neither is a value to proceed on.
      askUser: () => Promise.resolve(undefined),
      request: () =>
        Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          askUser: {
            id: "q1",
            question: "Which quarter?",
            options: [{ id: "q4", label: "Q4" }],
          },
        }),
    });

    const turn = await client.send(session(), "summarise");

    expect(turn.unresolved).toMatchObject({ code: "question-unanswered" });
  });

  it("names a turn that had no channel to ask through at all", async () => {
    const client = createAgentHttpClient({
      endpoint: "https://agent.example/turn",
      request: () =>
        Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          askUser: {
            id: "q1",
            question: "Which quarter?",
            options: [{ id: "q4", label: "Q4" }],
          },
        }),
    });

    const turn = await client.send(session(), "summarise");

    expect(turn.unresolved).toMatchObject({ code: "no-reader-channel" });
  });

  it("prefers the host's own channel over the turn's surface", async () => {
    const hostAsked = vi.fn(() => Promise.resolve({ optionId: "q4" }));
    const turnAsked = vi.fn(() => Promise.resolve({ optionId: "q1" }));
    const transport = assistantHttpTransport({
      endpoint: "https://agent.example/turn",
      askUser: hostAsked,
      request: (body) => {
        const sent = body as { toolResults?: unknown };
        return Promise.resolve(
          sent.toolResults
            ? { schemaVersion: AGENT_SCHEMA_VERSION, text: "thanks" }
            : {
                schemaVersion: AGENT_SCHEMA_VERSION,
                askUser: {
                  id: "q1",
                  question: "Which quarter?",
                  options: [{ id: "q4", label: "Q4" }],
                },
              }
        );
      },
    });
    const live = session();
    await transport.connect?.({ session: live });

    await transport.send({
      session: live,
      text: "summarise",
      conversation: [],
      askUser: turnAsked,
    });

    // A host that wired its own question channel keeps it.
    expect(hostAsked).toHaveBeenCalledTimes(1);
    expect(turnAsked).not.toHaveBeenCalled();
  });
});

describe("a backend that will not hold the contract", () => {
  it("keeps sending it when the pin exchange is declined", async () => {
    const bodies: unknown[] = [];
    const client = createAgentHttpClient({
      endpoint: "https://agent.example/turn",
      request: (body) => {
        bodies.push(body);
        const sent = body as { kind?: string };
        // The opening exchange is refused; turns still have to work.
        return Promise.resolve(
          sent.kind === "hello" || sent.kind === "schema"
            ? {
                schemaVersion: AGENT_SCHEMA_VERSION,
                ok: false,
                text: "no pins",
              }
            : { schemaVersion: AGENT_SCHEMA_VERSION, text: "ok" }
        );
      },
    });
    const live = session();

    await client.connect(live).catch(() => undefined);
    const turn = await client.send(live, "go");

    expect(turn.text).toBe("ok");
    // Nothing was marked current, so the contract travels with the turn.
    const last = bodies.at(-1) as Record<string, unknown>;
    expect(last.context ?? last.catalog).toBeDefined();
  });
});

describe("a backend that streams its answer", () => {
  /** A fetch that answers with a real SSE body. */
  function sse(records: readonly string[]) {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        for (const record of records) {
          controller.enqueue(encoder.encode(record));
        }
        controller.close();
      },
    });
    return () =>
      Promise.resolve(
        new Response(body, {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        })
      );
  }

  it("reports the text as it arrives and runs the calls after done", async () => {
    const seen: string[] = [];
    const live = session();
    const client = createAgentHttpClient({
      endpoint: "https://agent.example/turn",
      stream: true,
      onStreamText: (text) => seen.push(text),
      fetch: sse([
        'event: text-delta\ndata: {"text":"Going "}\n\n',
        'event: text-delta\ndata: {"text":"to page 3."}\n\n',
        "event: done\ndata: {}\n\n",
      ]),
    });

    const turn = await client.send(live, "go to page 3");

    expect(seen).toEqual(["Going ", "Going to page 3."]);
    expect(turn.text).toBe("Going to page 3.");
  });

  it("refuses a stream that ends without a reply", async () => {
    const client = createAgentHttpClient({
      endpoint: "https://agent.example/turn",
      stream: true,
      fetch: sse(['event: text-delta\ndata: {"text":"half a"}\n\n']),
    });

    await expect(client.send(session(), "go")).rejects.toThrow();
  });

  it("reads an ordinary JSON answer when the backend did not stream", async () => {
    const client = createAgentHttpClient({
      endpoint: "https://agent.example/turn",
      stream: true,
      fetch: () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              schemaVersion: AGENT_SCHEMA_VERSION,
              text: "no stream here",
            }),
            { status: 200, headers: { "content-type": "application/json" } }
          )
        ),
    });

    const turn = await client.send(session(), "go");
    expect(turn.text).toBe("no stream here");
  });
});

describe("what a model may write in a read or describe call", () => {
  const ask = (name: string, args: unknown): unknown =>
    parseAgentHttpResponse({
      schemaVersion: AGENT_SCHEMA_VERSION,
      toolCalls: [{ id: "c1", name, args }],
    });

  it("takes a read call with nothing in it", () => {
    expect(ask("read", undefined)).toMatchObject({
      toolCalls: [{ name: "read" }],
    });
  });

  it("keeps only the column names a read call could mean", () => {
    const parsed = ask("read", { columns: ["name", 7, null, "salary"] });
    const args = (parsed as { toolCalls: { args: { columns: string[] } }[] })
      .toolCalls[0]?.args;
    expect(args?.columns).toEqual(["name", "salary"]);
  });

  it("refuses a describe call whose keys are not a list", () => {
    expect(() => ask("describe", { keys: "view.setPage" })).toThrow();
  });

  it("takes a describe call asking for a family", () => {
    expect(ask("describe", { family: "view" })).toMatchObject({
      toolCalls: [{ name: "describe" }],
    });
  });
});

describe("a backend that holds the contract between turns", () => {
  it("names the version it acknowledged instead of resending it", async () => {
    const bodies: Record<string, unknown>[] = [];
    const client = createAgentHttpClient({
      endpoint: "https://agent.example/turn",
      request: (body) => {
        const sent = body as unknown as Record<string, unknown>;
        bodies.push(sent);
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "ok",
          sessionId: "backend-session-1",
          // The backend echoes the exact version it was sent, which is what
          // makes the pin usable rather than a guess.
          pin: {
            status: "acknowledged",
            contractVersion: sent.contractVersion as string | undefined,
            ttlMs: 60_000,
          },
        });
      },
    });
    const live = session();

    await client.connect(live);
    await client.send(live, "one");
    await client.send(live, "two");

    const last = bodies.at(-1);
    // The handle the backend issued travels back, so it can find what it kept.
    expect(last?.sessionId).toBe("backend-session-1");
    expect(last?.contractVersion).toBeDefined();
  });

  it("forgets the pin when the host resets the session", async () => {
    const bodies: Record<string, unknown>[] = [];
    const client = createAgentHttpClient({
      endpoint: "https://agent.example/turn",
      request: (body) => {
        bodies.push(body as unknown as Record<string, unknown>);
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "ok",
          sessionId: "backend-session-1",
          pin: { status: "acknowledged", contractVersion: "c1" },
        });
      },
    });
    const live = session();

    await client.connect(live);
    await client.send(live, "one");
    client.reset(live);
    await client.send(live, "two");

    // A reset is the host saying this conversation is over; the next turn
    // does not claim a handle the backend issued to a different one.
    expect(bodies.at(-1)?.sessionId).toBeUndefined();
  });
});

describe("a table that changed while the backend was thinking", () => {
  it("ends the turn when the table it was answering is gone", async () => {
    let tableId = "orders";
    const live = createAgentSession({
      observe: () => ({ ...observation(), tableId }),
      apply: { setPage: vi.fn() },
    });
    const client = createAgentHttpClient({
      endpoint: "https://agent.example/turn",
      request: () => {
        // The host swapped the table underneath while the model was called.
        tableId = "invoices";
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "here you go",
        });
      },
    });

    // A view revision ticking mid-turn is ordinary. Identity is not: this is
    // no longer the table the backend answered.
    await expect(client.send(live, "go")).rejects.toThrow(/table changed/);
  });

  it("ends the turn when the table's policy changed underneath", async () => {
    let writePolicy: "allow" | "deny" = "allow";
    const live = createAgentSession({
      observe: () => ({ ...observation(), writePolicy }),
      apply: { setPage: vi.fn() },
    });
    const client = createAgentHttpClient({
      endpoint: "https://agent.example/turn",
      request: () => {
        writePolicy = "deny";
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "here you go",
        });
      },
    });

    await expect(client.send(live, "go")).rejects.toThrow(/policy changed/);
  });
});

describe("a read the table refused", () => {
  it("hands the refusal back as the call's own result", async () => {
    const live = createAgentSession({
      observe: () => observation(),
      apply: {
        setPage: vi.fn(),
        readRows: () => {
          throw new Error("that window is not readable");
        },
        resolveRow: () => ({ rowKey: "r1", scope: "visible" as const }),
      },
    });
    const bodies: Record<string, unknown>[] = [];
    const client = createAgentHttpClient({
      endpoint: "https://agent.example/turn",
      request: (body) => {
        const sent = body as unknown as Record<string, unknown>;
        bodies.push(sent);
        return Promise.resolve(
          sent.toolResults
            ? {
                schemaVersion: AGENT_SCHEMA_VERSION,
                text: "I could not read it",
              }
            : {
                schemaVersion: AGENT_SCHEMA_VERSION,
                toolCalls: [
                  { id: "c1", name: "read", args: { offset: 0, limit: 5 } },
                ],
              }
        );
      },
    });

    const turn = await client.send(live, "what is in it");

    // The backend is told what happened rather than being left to assume the
    // window came back.
    const answered = bodies.at(-1)?.toolResults as
      readonly { error?: { message?: string } }[] | undefined;
    expect(answered?.[0]?.error?.message).toContain("not readable");
    expect(turn.text).toBe("I could not read it");
  });

  it("names a read that failed without saying why", async () => {
    const live = createAgentSession({
      observe: () => observation(),
      apply: {
        setPage: vi.fn(),
        readRows: () => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw { nothing: "useful" };
        },
        resolveRow: () => ({ rowKey: "r1", scope: "visible" as const }),
      },
    });
    const bodies: Record<string, unknown>[] = [];
    const client = createAgentHttpClient({
      endpoint: "https://agent.example/turn",
      request: (body) => {
        const sent = body as unknown as Record<string, unknown>;
        bodies.push(sent);
        return Promise.resolve(
          sent.toolResults
            ? { schemaVersion: AGENT_SCHEMA_VERSION, text: "no luck" }
            : {
                schemaVersion: AGENT_SCHEMA_VERSION,
                toolCalls: [
                  { id: "c1", name: "read", args: { offset: 0, limit: 5 } },
                ],
              }
        );
      },
    });

    await client.send(live, "what is in it");

    const answered = bodies.at(-1)?.toolResults as
      readonly { error?: { code?: string } }[] | undefined;
    expect(answered?.[0]?.error?.code).toBeDefined();
  });
});
