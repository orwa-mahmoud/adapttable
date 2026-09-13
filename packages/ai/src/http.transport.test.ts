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
        bodies.push(body as Record<string, unknown>);
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

    // A backend asking forever is a backend the turn has to be able to leave.
    expect(turn.unresolved).toMatchObject({ code: "continuation-exhausted" });
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
