import { describe, expect, it, vi } from "vitest";

import {
  AGENT_HTTP_LIMITS,
  agentHttpJsonSchema,
  type AgentHttpRequest,
  connectAgentHttp,
  createAgentHttpClient,
  isToolValue,
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
    featureIds: ["filters", "editing"],
    columns: [
      {
        id: "name",
        label: "Name",
        type: "string",
        readable: true,
        writable: true,
        sortable: true,
      },
      {
        id: "ssn",
        label: "SSN",
        type: "string",
        readable: false,
        writable: false,
        sortable: false,
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
      setFilters: vi.fn(),
      readRows: () => ({
        offset: 0,
        limit: 1,
        redacted: ["ssn"],
        rows: [{ rowKey: "r1", cells: { name: "Ada", ssn: "hidden" } }],
      }),
      resolveRow: () => ({ rowKey: "r1", scope: "visible" as const }),
      editCells: vi.fn(),
      ...apply,
    },
  });
}

/**
 * A row read, as a backend actually receives it.
 *
 * Inside the provenance envelope, always: rows are somebody's data, and the
 * label is what says so. A backend reads the window out of `rows`.
 */
interface RowWindowResult {
  readonly source: "table-rows";
  readonly untrusted: true;
  readonly revision: number;
  readonly rows: {
    readonly rows: readonly {
      readonly rowKey: string;
      readonly cells: unknown;
    }[];
    readonly redacted?: readonly string[];
  };
}

/** What the frontend sent back for one call id, when it sent a value. */
function toolValue<T>(
  body: { toolResults?: readonly { id: string }[] },
  id: string
): T | undefined {
  const entry = body.toolResults?.find((result) => result.id === id);
  if (!entry || !("result" in entry)) return undefined;
  return (entry as { result: T }).result;
}

function okResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("parseAgentHttpRequest / parseAgentHttpResponse", () => {
  it("accepts a compact turn and rejects a bad schema", () => {
    const live = session();
    const parsed = parseAgentHttpRequest({
      schemaVersion: AGENT_SCHEMA_VERSION,
      kind: "turn",
      tableId: "orders",
      manifest: live.manifest(),
      catalog: live.catalog(),
      message: "Show page 2",
    });
    expect(parsed.kind).toBe("turn");
    expect(parsed.catalog?.some((entry) => entry.key === "view.setPage")).toBe(
      true
    );
    expect(() =>
      parseAgentHttpRequest({ ...parsed, schemaVersion: "nope" })
    ).toThrow(/schemaVersion/);
    expect(() =>
      parseAgentHttpRequest({ ...parsed, kind: "turn" })
    ).not.toThrow();
    expect(() =>
      parseAgentHttpRequest({ ...parsed, kind: "hello", message: undefined })
    ).not.toThrow();
    expect(() =>
      parseAgentHttpRequest({
        schemaVersion: AGENT_SCHEMA_VERSION,
        kind: "turn",
        tableId: "orders",
        manifest: live.manifest(),
        catalog: live.catalog(),
      })
    ).toThrow(/message/);
  });

  it("requires a call id to correlate a result with", () => {
    expect(() =>
      parseAgentHttpResponse({
        schemaVersion: AGENT_SCHEMA_VERSION,
        toolCalls: [{ name: "view.setPage", args: { page: 2 } }],
      })
    ).toThrow(/tool call.id is required/);
    const parsed = parseAgentHttpResponse({
      schemaVersion: AGENT_SCHEMA_VERSION,
      text: "Moved.",
      toolCalls: [
        {
          name: "view.setPage",
          args: { page: 2 },
          id: "page-2",
        },
      ],
    });
    expect(parsed.toolCalls?.[0]?.id).toBe("page-2");
    expect(parsed.toolCalls?.[0]?.name).toBe("view.setPage");
  });

  it("reads a null optional as one the backend did not answer", () => {
    // JSON has no `undefined`, and a model asked for a document fills in the
    // keys it was shown. A turn with nothing to ask and nothing to say about
    // the pin writes them as null, and that is a reply, not a malformed one.
    const parsed = parseAgentHttpResponse({
      schemaVersion: AGENT_SCHEMA_VERSION,
      text: "Cleared the grouping.",
      askUser: null,
      pin: null,
    });

    expect(parsed.askUser).toBeUndefined();
    expect(parsed.pin).toBeUndefined();
    expect(parsed.text).toBe("Cleared the grouping.");
  });

  it("rejects a non-numeric call expectedRevision", () => {
    expect(() =>
      parseAgentHttpResponse({
        schemaVersion: AGENT_SCHEMA_VERSION,
        toolCalls: [
          {
            name: "view.setPage",
            args: { page: 2 },
            id: "page-2",
            expectedRevision: "1",
          },
        ],
      })
    ).toThrow(/expectedRevision must be a finite number/);
  });
});

describe("createAgentHttpClient", () => {
  it("does not send until connect or send is called", () => {
    const request = vi.fn();
    createAgentHttpClient({ endpoint: "https://agent.example/turn", request });
    expect(request).not.toHaveBeenCalled();
  });

  it("connects only after a valid hello body", async () => {
    const live = session();
    const hello = await connectAgentHttp(live, {
      endpoint: "https://agent.example/turn",
      request: (body) => {
        expect(body.kind).toBe("hello");
        expect(body.manifest?.capabilities).toContain("view.setPage");
        expect(body.manifest?.capabilities).not.toContain("rows.add");
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          ok: true,
          text: "Ready",
        });
      },
    });
    expect(hello.ok).toBe(true);
    await expect(
      connectAgentHttp(live, {
        endpoint: "https://agent.example/turn",
        request: () => Promise.resolve({ greeting: "hi" }),
      })
    ).rejects.toThrow(/schemaVersion/);
    await expect(
      connectAgentHttp(live, {
        endpoint: "https://agent.example/turn",
        request: () => Promise.reject(new Error("ECONNREFUSED")),
      })
    ).rejects.toThrow(/ECONNREFUSED/);
  });

  it("accepts a question-only turn and a schema pin", () => {
    const parsed = parseAgentHttpRequest({
      schemaVersion: AGENT_SCHEMA_VERSION,
      kind: "turn",
      tableId: "orders",
      sessionId: "sess-1",
      viewRevision: 2,
      message: "Show page 2",
    });
    expect(parsed.catalog).toBeUndefined();
    expect(parsed.manifest).toBeUndefined();
    expect(parsed.viewRevision).toBe(2);
    const live = session();
    const schema = parseAgentHttpRequest({
      schemaVersion: AGENT_SCHEMA_VERSION,
      kind: "schema",
      tableId: "orders",
      sessionId: "sess-1",
      manifest: live.manifest(),
      catalog: live.catalog(),
    });
    expect(schema.kind).toBe("schema");
    expect(schema.catalog?.length).toBeGreaterThan(0);
    expect(() =>
      parseAgentHttpRequest({
        schemaVersion: AGENT_SCHEMA_VERSION,
        kind: "hello",
        tableId: "orders",
      })
    ).toThrow(/manifest/);
  });

  it("pins the catalog on hello and omits it on later turns", async () => {
    const live = session();
    const kinds: string[] = [];
    const options = {
      endpoint: "https://agent.example/turn",
      request: (body: {
        kind: string;
        catalog?: unknown;
        manifest?: unknown;
        sessionId?: string;
        viewRevision?: number;
        contractVersion?: string;
      }) => {
        kinds.push(body.kind);
        if (body.kind === "hello") {
          expect(body.catalog).toBeDefined();
          expect(body.manifest).toBeDefined();
        }
        if (body.kind === "turn") {
          expect(body.catalog).toBeUndefined();
          expect(body.manifest).toBeUndefined();
          expect(body.viewRevision).toBe(1);
          expect(body.sessionId).toBe("sess-1");
        }
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          ok: true,
          sessionId: "sess-1",
          // A pin is what a backend says it holds, not what a successful turn
          // implies. Acknowledging the exact version it was sent is the whole
          // of it; anything else keeps being sent the contract.
          pin: {
            status: "acknowledged" as const,
            ...(body.contractVersion
              ? { contractVersion: body.contractVersion }
              : {}),
          },
          text: body.kind === "turn" ? "Done" : "Ready",
        });
      },
    };
    await connectAgentHttp(live, options);
    await runAgentHttpTurn(live, "Show page 2", options);
    expect(kinds).toEqual(["hello", "turn"]);
  });

  it("keeps a session handle the backend named once", async () => {
    // A backend issues its handle when the connection opens and acknowledges
    // every later contract without repeating it. Each request still has to
    // carry it: a backend that keys its pin by session and is sent none
    // answers as a stranger, and the turn pays a round trip to resend the
    // contract and is then planned again from the beginning.
    const live = session();
    const carried: (string | undefined)[] = [];
    const options = {
      endpoint: "https://agent.example/turn",
      request: (body: {
        kind: string;
        sessionId?: string;
        contractVersion?: string;
      }) => {
        if (body.kind === "turn") carried.push(body.sessionId);
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          ok: true,
          ...(body.kind === "hello" ? { sessionId: "sess-once" } : {}),
          pin: {
            status: "acknowledged" as const,
            ...(body.contractVersion
              ? { contractVersion: body.contractVersion }
              : {}),
          },
          text: "Done",
        });
      },
    };
    await connectAgentHttp(live, options);
    await runAgentHttpTurn(live, "Show page 2", options);
    await runAgentHttpTurn(live, "Sort by total", options);

    expect(carried).toEqual(["sess-once", "sess-once"]);
  });

  it("carries the view the reader left behind, not the one the turn opened on", async () => {
    // A reader who sorts and filters the table themselves says nothing to the
    // assistant. The contract is pinned and stays pinned; the view is read
    // again for every round, so the next request describes the table they are
    // actually looking at rather than the one the conversation started on.
    let revision = 1;
    let readerView: Record<string, unknown> = {};
    const live = createAgentSession({
      observe: () => observation({ viewRevision: revision }),
      apply: { setPage: vi.fn() },
    });
    const seen: { revision?: number; view?: Record<string, unknown> }[] = [];
    const options = {
      endpoint: "https://agent.example/turn",
      // Filter state travels only for filters the table published, so the
      // catalog rides beside the view the same way.
      contextInputs: () => ({
        view: readerView,
        filters: [
          {
            key: "team",
            label: "Team",
            type: "multiSelect",
            operators: ["is"],
            defaultOperator: "is",
            valueKeys: ["team", "teamOp"],
          },
        ],
      }),
      request: (body: AgentHttpRequest) => {
        if (body.kind === "turn") {
          seen.push({
            revision: body.viewRevision,
            view: body.view as Record<string, unknown> | undefined,
          });
        }
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          ok: true,
          sessionId: "sess-view",
          pin: {
            status: "acknowledged" as const,
            ...(body.contractVersion
              ? { contractVersion: body.contractVersion }
              : {}),
          },
          text: "Done",
        });
      },
    };
    await connectAgentHttp(live, options);
    await runAgentHttpTurn(live, "What am I looking at?", options);

    // The reader sorts and filters by hand, through the table's own controls.
    revision = 4;
    readerView = {
      search: "nair",
      sortBy: "name",
      sortDir: "desc",
      filters: { team: "Platform" },
    };
    await runAgentHttpTurn(live, "And now?", options);

    expect(seen[0]?.view).toMatchObject({ revision: 1, search: "" });
    expect(seen[0]?.view?.sortBy).toBeUndefined();
    expect(seen[1]?.revision).toBe(4);
    expect(seen[1]?.view).toMatchObject({
      revision: 4,
      search: "nair",
      sortBy: "name",
      sortDir: "desc",
      filters: { team: "Platform" },
    });
  });

  it("re-sends schema when column options change", async () => {
    let writable = false;
    const live = createAgentSession({
      observe: () =>
        observation({
          columns: [
            {
              id: "name",
              label: "Name",
              type: "string",
              readable: true,
              writable,
              sortable: true,
            },
          ],
        }),
      apply: { setPage: vi.fn() },
    });
    const kinds: string[] = [];
    const options = {
      endpoint: "https://agent.example/turn",
      request: (body: { kind: string; contractVersion?: string }) => {
        kinds.push(body.kind);
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          ok: true,
          sessionId: "sess-2",
          // Held, and said so. A backend that pins nothing has nothing to
          // refresh, so there would be no schema round to observe.
          pin: {
            status: "acknowledged" as const,
            ...(body.contractVersion
              ? { contractVersion: body.contractVersion }
              : {}),
          },
          text: "ok",
        });
      },
    };
    await connectAgentHttp(live, options);
    writable = true;
    await runAgentHttpTurn(live, "Show page 2", options);
    expect(kinds).toEqual(["hello", "schema", "turn"]);
  });

  it("keeps sending the snapshot when pinCatalog is false", async () => {
    const live = session();
    const catalogs: unknown[] = [];
    const options = {
      endpoint: "https://agent.example/turn",
      pinCatalog: false as const,
      request: (body: { catalog?: unknown }) => {
        catalogs.push(body.catalog);
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          ok: true,
          text: "Done",
        });
      },
    };
    await connectAgentHttp(live, options);
    await runAgentHttpTurn(live, "Show page 2", options);
    expect(catalogs[0]).toBeDefined();
    expect(catalogs[1]).toBeDefined();
  });

  it("executes text-plus-actions without a second model call", async () => {
    const setPage = vi.fn();
    const live = session({ setPage });
    const posts: string[] = [];
    const result = await runAgentHttpTurn(live, "Go to page 2", {
      endpoint: "https://agent.example/turn",
      request: (body) => {
        posts.push(body.kind);
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "Showing page 2.",
          toolCalls: [
            {
              name: "view.setPage",
              args: { page: 2 },
              id: "page-2",
            },
          ],
        });
      },
    });
    expect(result.text).toBe("Showing page 2.");
    expect(result.results[0]?.ok).toBe(true);
    // The key travels beside the result: without it a receipt can only say
    // "done", which tells the reader something happened but not what.
    expect(result.keys).toEqual(["view.setPage"]);
    expect(setPage).toHaveBeenCalledWith(2);
    expect(posts).toEqual(["turn"]);
  });

  it("runs a proposal the moment the backend stops asking", async () => {
    const setPage = vi.fn();
    const live = session({ setPage });
    let rounds = 0;
    const result = await runAgentHttpTurn(live, "Page 2 please", {
      endpoint: "https://agent.example/turn",
      request: () => {
        rounds += 1;
        // What a small model actually sends: a decision AND a row window, in
        // the same breath. The decision is not lost — it is held as the
        // phase's proposal until a reply settles it.
        if (rounds === 1) {
          return Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            text: "Page 2 it is.",
            toolCalls: [
              { id: "p", name: "view.setPage", args: { page: 2 } },
              { id: "r", name: "read", args: { offset: 0, limit: 5 } },
            ],
          });
        }
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "Page 2 it is.",
          toolCalls: [{ id: "p", name: "view.setPage", args: { page: 2 } }],
        });
      },
    });

    expect(setPage).toHaveBeenCalledTimes(1);
    expect(setPage).toHaveBeenCalledWith(2);
    expect(result.keys).toEqual(["view.setPage"]);
    expect(result.results[0]?.ok).toBe(true);
  });

  it("applies nothing when the backend never settles on a plan", async () => {
    const setPage = vi.fn();
    const live = session({ setPage });
    const result = await runAgentHttpTurn(live, "Page 2 please", {
      endpoint: "https://agent.example/turn",
      // A model that proposes and asks forever. Running the proposal anyway
      // because the budget ran out would be writing on a guess.
      request: () =>
        Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "Working on it.",
          toolCalls: [
            { id: "p", name: "view.setPage", args: { page: 2 } },
            { id: "r", name: "read", args: { offset: 0, limit: 5 } },
          ],
        }),
    });

    expect(setPage).not.toHaveBeenCalled();
    expect(result.results).toEqual([]);
    // The reader is told what did not happen, and what was going to.
    expect(result.unresolved?.code).toBe("discovery-exhausted");
    expect(result.unresolved?.pending).toEqual(["view.setPage"]);
    expect(result.text).toBe("Working on it.");
  });

  it("answers a describe for a capability that does not exist", async () => {
    const setPage = vi.fn();
    const live = session({ setPage });
    let round = 0;
    const result = await runAgentHttpTurn(live, "Filter it", {
      endpoint: "https://agent.example/turn",
      request: () => {
        round += 1;
        if (round === 1) {
          // A small model guessing a key. Ending the turn over one bad name
          // leaves nothing run and nothing explained.
          return Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            toolCalls: [
              {
                id: "d1",
                name: "describe",
                args: { keys: ["view", "view.setPage"] },
              },
            ],
          });
        }
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "Page 2 it is.",
          toolCalls: [{ name: "view.setPage", args: { page: 2 }, id: "p" }],
        });
      },
    });

    expect(result.text).toBe("Page 2 it is.");
    expect(setPage).toHaveBeenCalledWith(2);
  });

  it("still fails a backend that produced nothing at all", async () => {
    const live = session();
    let rounds = 0;
    // Reported, not thrown: a turn that could not settle on a plan still says
    // what it did and why it stopped, and nothing ran either way.
    const exhausted = await runAgentHttpTurn(live, "Filter it", {
      endpoint: "https://agent.example/turn",
      request: () => {
        rounds += 1;
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          toolCalls: [{ id: "d1", name: "describe", args: { keys: ["nope"] } }],
        });
      },
    });
    expect(exhausted.unresolved?.code).toBe("discovery-exhausted");
    expect(exhausted.results).toEqual([]);

    // A round that produced only unknown names still counts as a round, or
    // this loops forever.
    expect(rounds).toBeLessThanOrEqual(5);
  });

  it("names every action it ran, in order, including a failure", async () => {
    const live = session({ setPage: vi.fn() });
    const result = await runAgentHttpTurn(live, "Two things", {
      endpoint: "https://agent.example/turn",
      request: () =>
        Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "Tried two.",
          toolCalls: [
            { name: "view.setPage", args: { page: 2 }, id: "a" },
            // A shape the schema refuses — the receipt still has to name it.
            {
              name: "view.setSort",
              args: { foo: "salary" },
              id: "b",
            },
          ],
        }),
    });

    expect(result.keys).toEqual(["view.setPage", "view.setSort"]);
    expect(result.results).toHaveLength(2);
    expect(result.results[1]?.ok).toBe(false);
  });

  it("answers describe and read calls without sending the whole dataset", async () => {
    const live = session();
    const bodies: { guides?: number; rows?: number }[] = [];
    const result = await runAgentHttpTurn(live, "Who is visible?", {
      endpoint: "https://agent.example/turn",
      request: (body) => {
        const guides = toolValue<{ guides: readonly unknown[] }>(body, "d1");
        const window = toolValue<RowWindowResult>(body, "r1");
        bodies.push({
          guides: guides?.guides.length,
          rows: window?.rows.rows.length,
        });
        if (!body.toolResults) {
          return Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            toolCalls: [
              { id: "d1", name: "describe", args: { keys: ["rows.read"] } },
              {
                id: "r1",
                name: "read",
                args: { offset: 0, limit: 1, columns: ["name"] },
              },
            ],
          });
        }
        expect(window?.source).toBe("table-rows");
        expect(window?.rows.redacted).toContain("ssn");
        expect(window?.rows.rows[0]?.cells).not.toHaveProperty("ssn");
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "Ada is visible.",
        });
      },
    });
    expect(result.text).toBe("Ada is visible.");
    expect(result.needsFulfilled).toEqual({ describe: 1, read: 1 });
    expect(bodies[0]).toEqual({});
    expect(bodies[1]?.guides).toBe(1);
    expect(bodies[1]?.rows).toBe(1);
  });

  it("scopes read cache keys and keeps earlier guides across discovery rounds", async () => {
    let reads = 0;
    const live = session({
      readRows: (query: { columns?: readonly string[] }) => {
        reads += 1;
        return {
          offset: 0,
          limit: 1,
          redacted: ["ssn"],
          rows: [
            {
              rowKey: `r${String(reads)}`,
              cells: {
                name: query.columns?.includes("name") ? `Ada-${reads}` : "x",
              },
            },
          ],
        };
      },
    });
    const firstBodies: { guides?: string[]; columns?: string[] }[] = [];
    await runAgentHttpTurn(live, "Describe then read", {
      endpoint: "https://agent.example/turn",
      request: (body) => {
        const described = toolValue<{ guides: readonly { key: string }[] }>(
          body,
          "d1"
        );
        const window = toolValue<RowWindowResult>(body, "r1");
        firstBodies.push({
          guides: described?.guides.map((guide) => guide.key),
          columns: window
            ? Object.keys(
                (window.rows.rows[0]?.cells as object | undefined) ?? {}
              )
            : undefined,
        });
        if (!described) {
          return Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            toolCalls: [
              { id: "d1", name: "describe", args: { keys: ["rows.read"] } },
            ],
          });
        }
        if (!window) {
          expect(
            described.guides.some((guide) => guide.key === "rows.read")
          ).toBe(true);
          return Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            toolCalls: [
              {
                id: "r1",
                name: "read",
                args: { offset: 0, limit: 1, columns: ["name"] },
              },
            ],
          });
        }
        // The guide asked for two rounds ago is still in the request: a
        // stateless backend is never told something once.
        expect(
          described.guides.some((guide) => guide.key === "rows.read")
        ).toBe(true);
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "Ada.",
        });
      },
    });
    expect(firstBodies.at(-1)?.guides).toContain("rows.read");
    expect(reads).toBe(1);

    await runAgentHttpTurn(live, "Read again", {
      endpoint: "https://agent.example/turn",
      request: (body) => {
        const window = toolValue<RowWindowResult>(body, "r1");
        if (!window) {
          return Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            toolCalls: [
              {
                id: "r1",
                name: "read",
                args: { offset: 0, limit: 1, columns: ["name"] },
              },
            ],
          });
        }
        // A new turn re-reads: a window cached under the previous turn is not
        // current for this one.
        expect(window.rows.rows[0]?.rowKey).toBe("r2");
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "Again.",
        });
      },
    });
    expect(reads).toBe(2);
  });

  it("refuses an omitted revision when the table was edited during the model call", async () => {
    let revision = 1;
    const setPage = vi.fn();
    const live = createAgentSession({
      observe: () => observation({ viewRevision: revision, approval: "never" }),
      apply: { setPage },
    });
    const result = await runAgentHttpTurn(live, "Page 2", {
      endpoint: "https://agent.example/turn",
      request: () => {
        // Someone edits the table while the backend is still thinking. The
        // reply below was decided on the view before that edit.
        revision = 2;
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          toolCalls: [
            {
              name: "view.setPage",
              args: { page: 2 },
              id: "page-2",
            },
          ],
        });
      },
    });
    expect(result.results[0]?.ok).toBe(false);
    expect(result.results[0]?.error?.code).toBe("revision-mismatch");
    expect(setPage).not.toHaveBeenCalled();
  });

  it("runs an omitted revision when the table held still", async () => {
    const setPage = vi.fn();
    const live = createAgentSession({
      observe: () => observation({ viewRevision: 1, approval: "never" }),
      apply: { setPage },
    });
    const result = await runAgentHttpTurn(live, "Page 2", {
      endpoint: "https://agent.example/turn",
      request: () =>
        Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          toolCalls: [
            {
              name: "view.setPage",
              args: { page: 2 },
              id: "page-2",
            },
          ],
        }),
    });
    expect(result.results[0]?.ok).toBe(true);
    expect(setPage).toHaveBeenCalledWith(2);
  });

  it("still fails the turn when policy changes mid-flight", async () => {
    let writePolicy: "allow" | "deny" = "allow";
    const setPage = vi.fn();
    const live = createAgentSession({
      observe: () =>
        observation({
          viewRevision: 1,
          approval: "never",
          writePolicy,
        }),
      apply: { setPage },
    });
    await expect(
      runAgentHttpTurn(live, "Page 2", {
        endpoint: "https://agent.example/turn",
        request: () => {
          writePolicy = "deny";
          return Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            toolCalls: [
              {
                name: "view.setPage",
                args: { page: 2 },
                id: "page-2",
              },
            ],
          });
        },
      })
    ).rejects.toMatchObject({ code: "context-stale" });
    expect(setPage).not.toHaveBeenCalled();
  });

  it("chains filter then sort when the first apply advances the revision", async () => {
    let revision = 1;
    const setFilters = vi.fn(() => {
      revision += 1;
    });
    const setSort = vi.fn(() => {
      revision += 1;
    });
    const live = createAgentSession({
      observe: () => observation({ viewRevision: revision, approval: "never" }),
      apply: { setFilters, setSort },
    });
    const result = await runAgentHttpTurn(live, "Active, salary first", {
      endpoint: "https://agent.example/turn",
      request: () =>
        Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          toolCalls: [
            {
              name: "view.setFilters",
              args: { filters: { status: ["Active"] } },
              id: "filter-active",
            },
            {
              name: "view.setSort",
              args: { key: "name", dir: "desc" },
              id: "sort-name",
            },
          ],
        }),
    });
    expect(result.results.map((entry) => entry.ok)).toEqual([true, true]);
    expect(setFilters).toHaveBeenCalledTimes(1);
    expect(setSort).toHaveBeenCalledWith("name", "desc");
  });

  it("skips remaining actions after cancel without undoing completed writes", async () => {
    const setPage = vi.fn();
    const editCells = vi.fn();
    const controller = new AbortController();
    const live = createAgentSession({
      observe: () => observation({ approval: "writes" }),
      apply: {
        setPage,
        editCells,
        resolveRow: () => ({ rowKey: "r1", scope: "visible" as const }),
      },
      onApprove: () => {
        controller.abort();
        return new Promise(() => undefined);
      },
    });
    const result = await runAgentHttpTurn(
      live,
      "Write then edit",
      {
        endpoint: "https://agent.example/turn",
        request: () =>
          Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            toolCalls: [
              {
                name: "view.setPage",
                args: { page: 2 },
                id: "page-done",
              },
              {
                name: "edit.cells",
                args: {
                  edits: [{ rowKey: "r1", column: "name", value: "Ada" }],
                },
                id: "edit-pending",
              },
              {
                name: "view.setPage",
                args: { page: 3 },
                id: "page-skip",
              },
            ],
          }),
      },
      { signal: controller.signal }
    );
    expect(setPage).toHaveBeenCalledTimes(1);
    expect(setPage).toHaveBeenCalledWith(2);
    expect(editCells).not.toHaveBeenCalled();
    expect(result.results[0]?.ok).toBe(true);
    expect(result.results[1]?.error?.code).toBe("cancelled");
    expect(result.results[2]?.error?.code).toBe("cancelled");
  });

  it("honours revision, idempotency and does not retry a failed write", async () => {
    const editCells = vi.fn();
    const live = session({ editCells });
    const stale = await runAgentHttpTurn(live, "Edit Ada", {
      endpoint: "https://agent.example/turn",
      request: () =>
        Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          toolCalls: [
            {
              name: "edit.cells",
              args: {
                edits: [
                  { rowKey: "r1", column: "name", value: "Ada Lovelace" },
                ],
              },
              expectedRevision: 9,
              id: "edit-ada-stale",
            },
          ],
        }),
    });
    expect(stale.results[0]?.error?.code).toBe("revision-mismatch");
    expect(editCells).not.toHaveBeenCalled();

    const first = await runAgentHttpTurn(live, "Edit Ada", {
      endpoint: "https://agent.example/turn",
      request: () =>
        Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          toolCalls: [
            {
              name: "edit.cells",
              args: {
                edits: [
                  { rowKey: "r1", column: "name", value: "Ada Lovelace" },
                ],
              },
              id: "edit-ada",
            },
          ],
        }),
    });
    const again = await runAgentHttpTurn(live, "Edit Ada again", {
      endpoint: "https://agent.example/turn",
      request: () =>
        Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          toolCalls: [
            {
              name: "edit.cells",
              args: {
                edits: [
                  { rowKey: "r1", column: "name", value: "Ada Lovelace" },
                ],
              },
              id: "edit-ada",
            },
          ],
        }),
    });
    expect(first.results[0]?.ok).toBe(true);
    expect(again.results[0]?.ok).toBe(true);
    // Two turns are two asks. The replay identity carries the turn, so a
    // reader who asks again gets the write they asked for — rather than a
    // cached "done" for a write that happened during an earlier question.
    expect(again.results[0]?.idempotencyKey).not.toBe(
      first.results[0]?.idempotencyKey
    );
    expect(editCells).toHaveBeenCalledTimes(2);
  });

  it("surfaces cancel, timeout and HTTP failures", async () => {
    const live = session();
    const cancelled = new AbortController();
    cancelled.abort();
    await expect(
      runAgentHttpTurn(
        live,
        "Hi",
        {
          endpoint: "https://agent.example/turn",
          request: (_body, signal) => {
            if (signal.aborted) {
              return Promise.reject(new Error("agent HTTP cancelled"));
            }
            return Promise.resolve({ schemaVersion: AGENT_SCHEMA_VERSION });
          },
        },
        { signal: cancelled.signal }
      )
    ).rejects.toThrow(/cancelled/);

    await expect(
      runAgentHttpTurn(live, "Hi", {
        endpoint: "https://agent.example/turn",
        timeoutMs: 5,
        fetch: () => new Promise<Response>(() => undefined),
      })
    ).rejects.toThrow(/timed out/);

    await expect(
      runAgentHttpTurn(live, "Hi", {
        endpoint: "https://agent.example/turn",
        fetch: () => Promise.resolve(okResponse({ error: "nope" }, 503)),
      })
    ).rejects.toThrow(/503/);
  });

  it("hands an argument refusal back once, even unasked", async () => {
    const editCells = vi.fn();
    const live = session({ editCells });
    const sent: unknown[] = [];
    const result = await runAgentHttpTurn(
      live,
      "Raise Ada to 185",
      {
        endpoint: "https://agent.example/turn",
        request: (body) => {
          sent.push(body.toolResults);
          // The backend never asks to continue. It does not have to: the
          // phase ran nothing, so the refusal is the only thing that can
          // still make this turn succeed.
          if (!body.toolResults) {
            return Promise.resolve({
              schemaVersion: AGENT_SCHEMA_VERSION,
              text: "Setting it.",
              toolCalls: [
                { name: "edit.cells", args: { rowKey: "r1" }, id: "e1" },
              ],
            });
          }
          return Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            text: "Fixed it.",
            toolCalls: [
              {
                name: "edit.cells",
                args: {
                  edits: [{ rowKey: "r1", column: "name", value: "Ada" }],
                },
                id: "e2",
              },
            ],
          });
        },
      },
      { returnResults: true }
    );

    // The second phase was handed the refusal, under the refused call's id.
    expect(sent).toHaveLength(2);
    expect((sent[1] as { id: string }[])[0]?.id).toBe("e1");
    expect(result.text).toBe("Fixed it.");
    expect(editCells).toHaveBeenCalledTimes(1);
  });

  it("spends two repair rounds and then stops", async () => {
    const live = session();
    let rounds = 0;
    await runAgentHttpTurn(
      live,
      "Raise Ada",
      {
        endpoint: "https://agent.example/turn",
        request: () => {
          rounds += 1;
          return Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            text: "Setting it.",
            toolCalls: [
              {
                name: "edit.cells",
                args: { rowKey: "r1" },
                id: `e${String(rounds)}`,
              },
            ],
          });
        },
      },
      { returnResults: true }
    );

    // Initial attempt plus two repairs. A third identical refusal is shown.
    expect(rounds).toBe(3);
  });

  it("repairs a refused call even when a sibling already landed", async () => {
    const setPage = vi.fn();
    const editCells = vi.fn();
    const live = session({ setPage, editCells });
    let rounds = 0;
    const result = await runAgentHttpTurn(
      live,
      "Page 2 and an edit",
      {
        endpoint: "https://agent.example/turn",
        request: (body) => {
          rounds += 1;
          if (!body.toolResults) {
            return Promise.resolve({
              schemaVersion: AGENT_SCHEMA_VERSION,
              text: "Doing both.",
              toolCalls: [
                { name: "view.setPage", args: { page: 2 }, id: "p1" },
                { name: "edit.cells", args: { rowKey: "r1" }, id: "e1" },
              ],
            });
          }
          return Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            text: "Fixed the edit.",
            toolCalls: [
              {
                name: "edit.cells",
                args: {
                  edits: [{ rowKey: "r1", column: "name", value: "Ada" }],
                },
                id: "e2",
              },
            ],
          });
        },
      },
      { returnResults: true }
    );

    expect(rounds).toBe(2);
    expect(setPage).toHaveBeenCalledTimes(1);
    expect(editCells).toHaveBeenCalledTimes(1);
    expect(result.results.every((entry) => entry.ok)).toBe(true);
    expect(result.results).toHaveLength(2);
  });

  it("returns execute receipts when the backend asks to continue", async () => {
    const live = session();
    const seen: (readonly { id: string }[] | undefined)[] = [];
    await runAgentHttpTurn(
      live,
      "Page 2",
      {
        endpoint: "https://agent.example/turn",
        request: (body) => {
          seen.push(body.toolResults);
          if (!body.toolResults) {
            return Promise.resolve({
              schemaVersion: AGENT_SCHEMA_VERSION,
              text: "Moved.",
              continueWithResults: true,
              toolCalls: [
                {
                  name: "view.setPage",
                  args: { page: 2 },
                  id: "p2",
                },
              ],
            });
          }
          return Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            text: "Noted.",
          });
        },
      },
      { returnResults: true }
    );
    expect(seen[0]).toBeUndefined();
    // The continuation carries the receipt of the call it depends on, under
    // that call's own id.
    expect(seen[1]?.[0]?.id).toBe("p2");
    const text = await runAgentHttpTurn(
      live,
      "Page 2",
      {
        endpoint: "https://agent.example/turn",
        request: (body) => {
          if (!body.toolResults) {
            return Promise.resolve({
              schemaVersion: AGENT_SCHEMA_VERSION,
              text: "Moved.",
              continueWithResults: true,
              toolCalls: [
                {
                  name: "view.setPage",
                  args: { page: 2 },
                  id: "p2-text",
                },
              ],
            });
          }
          return Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            text: "Noted.",
          });
        },
      },
      { returnResults: true }
    );
    expect(text.text).toBe("Noted.");
  });

  it("binds a continuation to the view its own first action produced", async () => {
    let revision = 1;
    const setFilters = vi.fn(() => {
      revision += 1;
    });
    const setSort = vi.fn();
    const live = createAgentSession({
      observe: () => observation({ viewRevision: revision, approval: "never" }),
      apply: { setFilters, setSort },
    });
    const result = await runAgentHttpTurn(
      live,
      "Active only, then sort by name",
      {
        endpoint: "https://agent.example/turn",
        request: (body) =>
          Promise.resolve(
            body.toolResults
              ? {
                  schemaVersion: AGENT_SCHEMA_VERSION,
                  text: "Sorted.",
                  toolCalls: [
                    {
                      name: "view.setSort",
                      args: { key: "name", dir: "asc" },
                      id: "sort-name",
                    },
                  ],
                }
              : {
                  schemaVersion: AGENT_SCHEMA_VERSION,
                  text: "Filtered.",
                  continueWithResults: true,
                  toolCalls: [
                    {
                      name: "view.setFilters",
                      args: { filters: { status: ["Active"] } },
                      id: "filter-active",
                    },
                  ],
                }
          ),
      },
      { returnResults: true }
    );
    // The filter moved the table, and the dependent sort is answered on where
    // the filter left it — not refused for a revision this turn produced.
    expect(setFilters).toHaveBeenCalledTimes(1);
    expect(setSort).toHaveBeenCalledWith("name", "asc");
    expect(result.results.every((entry) => entry.ok)).toBe(true);
  });

  it("refuses continuation work when the table was edited while it asked", async () => {
    let revision = 1;
    const setPage = vi.fn();
    const setSort = vi.fn();
    const live = createAgentSession({
      observe: () => observation({ viewRevision: revision, approval: "never" }),
      apply: { setPage, setSort },
    });
    const result = await runAgentHttpTurn(
      live,
      "Page 2, then sort",
      {
        endpoint: "https://agent.example/turn",
        request: (body) => {
          if (!body.toolResults) {
            return Promise.resolve({
              schemaVersion: AGENT_SCHEMA_VERSION,
              text: "Paged.",
              continueWithResults: true,
              toolCalls: [
                {
                  name: "view.setPage",
                  args: { page: 2 },
                  id: "p2-stale",
                },
              ],
            });
          }
          // Someone edits the table while the continuation is being answered.
          revision += 1;
          return Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            text: "Sorted.",
            toolCalls: [
              {
                name: "view.setSort",
                args: { key: "name", dir: "asc" },
                id: "sort-stale",
              },
            ],
          });
        },
      },
      { returnResults: true }
    );
    // The page change already happened and keeps its receipt; only the work
    // decided on the view that moved is refused.
    expect(setPage).toHaveBeenCalledWith(2);
    expect(setSort).not.toHaveBeenCalled();
    expect(result.results[0]?.ok).toBe(true);
    expect(result.results[1]?.error?.code).toBe("revision-mismatch");
  });

  it("rejects empty messages, empty bodies and a rejected hello", async () => {
    const live = session();
    await expect(
      runAgentHttpTurn(live, "   ", {
        endpoint: "https://agent.example/turn",
        request: () => Promise.resolve({ schemaVersion: AGENT_SCHEMA_VERSION }),
      })
    ).rejects.toThrow(/message/);
    await expect(
      runAgentHttpTurn(live, "Hi", {
        endpoint: "https://agent.example/turn",
        fetch: () => Promise.resolve(new Response("", { status: 200 })),
      })
    ).rejects.toThrow(/empty/);
    await expect(
      runAgentHttpTurn(live, "Hi", {
        endpoint: "https://agent.example/turn",
        fetch: () =>
          Promise.resolve(
            new Response("not-json", {
              status: 200,
              headers: { "content-type": "application/json" },
            })
          ),
      })
    ).rejects.toThrow(/not JSON/);
    await expect(
      connectAgentHttp(live, {
        endpoint: "https://agent.example/turn",
        headers: () => ({ authorization: "Bearer demo" }),
        request: () =>
          Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            ok: false,
            text: "nope",
          }),
      })
    ).rejects.toThrow(/nope/);
  });

  it("stops after too many discovery rounds and surfaces a thrown fetch", async () => {
    const live = session();
    // A backend that never settles on a plan is reported, not thrown: the
    // turn says why it stopped, and nothing ran.
    const looping = await runAgentHttpTurn(live, "Who?", {
      endpoint: "https://agent.example/turn",
      request: () =>
        Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          toolCalls: [
            { id: "d1", name: "describe", args: { keys: ["rows.read"] } },
          ],
        }),
    });
    expect(looping.unresolved?.code).toBe("discovery-exhausted");
    expect(looping.results).toEqual([]);
    // A transport that throws is a different fact, and still propagates.
    await expect(
      runAgentHttpTurn(live, "Hi", {
        endpoint: "https://agent.example/turn",
        fetch: () => Promise.reject(new Error("offline")),
      })
    ).rejects.toThrow(/offline/);
  });

  it("covers transport edges, parse failures and a failed read need", async () => {
    const live = session();
    expect(() => parseAgentHttpRequest(null)).toThrow(/object/);
    expect(() =>
      parseAgentHttpRequest({ schemaVersion: AGENT_SCHEMA_VERSION })
    ).toThrow(/kind/);
    expect(() =>
      parseAgentHttpRequest({
        schemaVersion: AGENT_SCHEMA_VERSION,
        kind: "hello",
        tableId: "",
        manifest: {},
        catalog: [],
      })
    ).toThrow(/tableId/);
    expect(() =>
      parseAgentHttpRequest({
        schemaVersion: AGENT_SCHEMA_VERSION,
        kind: "hello",
        tableId: "orders",
        manifest: "nope",
        catalog: [],
      })
    ).toThrow(/manifest/);
    expect(() =>
      parseAgentHttpRequest({
        schemaVersion: AGENT_SCHEMA_VERSION,
        kind: "hello",
        tableId: "orders",
        manifest: {},
        catalog: "nope",
      })
    ).toThrow(/manifest\.schemaVersion|catalog/);
    expect(() => parseAgentHttpResponse(null)).toThrow(/object/);
    expect(() =>
      parseAgentHttpResponse({
        schemaVersion: AGENT_SCHEMA_VERSION,
        toolCalls: ["nope"],
      })
    ).toThrow(/tool call must be an object/);
    const asked = parseAgentHttpResponse({
      schemaVersion: AGENT_SCHEMA_VERSION,
      toolCalls: [
        { id: "d1", name: "describe", args: { keys: ["rows.read"] } },
        {
          id: "r1",
          name: "read",
          args: { offset: 0, limit: 2, columns: ["name", 2], scope: "visible" },
        },
      ],
    });
    expect(asked.toolCalls?.[0]?.args).toEqual({ keys: ["rows.read"] });
    expect(asked.toolCalls?.[1]?.args).toMatchObject({
      scope: "visible",
      columns: ["name"],
    });
    expect(() =>
      parseAgentHttpResponse({
        schemaVersion: AGENT_SCHEMA_VERSION,
        toolCalls: [
          {
            id: "r1",
            name: "read",
            args: { offset: 0, limit: 1, scope: "nope" },
          },
        ],
      })
    ).toThrow(/read\.scope/);

    await expect(connectAgentHttp(live, { endpoint: "   " })).rejects.toThrow(
      /endpoint/
    );
    await expect(
      runAgentHttpTurn(live, "Hi", {
        endpoint: "https://agent.example/turn",
        fetch: 1 as unknown as typeof fetch,
      })
    ).rejects.toThrow(/requires fetch/);
    await expect(
      runAgentHttpTurn(live, "Hi", {
        endpoint: "https://agent.example/turn",
        headers: { "content-type": "application/json" },
        fetch: () => Promise.resolve(new Response("  ", { status: 502 })),
      })
    ).rejects.toThrow(/502/);

    const delayed = new AbortController();
    const hang = runAgentHttpTurn(
      live,
      "Hi",
      {
        endpoint: "https://agent.example/turn",
        request: (_body, signal) =>
          new Promise((_, reject) => {
            signal.addEventListener(
              "abort",
              () => reject(new Error("agent HTTP cancelled")),
              { once: true }
            );
          }),
      },
      { signal: delayed.signal }
    );
    delayed.abort("stop");
    await expect(hang).rejects.toThrow(/cancelled|stop/);

    const brokenRead = session({
      readRows: () => {
        throw new Error("read boom");
      },
    });
    // A read the host could not answer is reported back to the backend as
    // that call's error, not thrown: the turn is still a turn, and whatever
    // else it did is still reported. The backend here keeps asking, so the
    // turn ends unresolved rather than silently.
    const failedRead = await runAgentHttpTurn(brokenRead, "Who?", {
      endpoint: "https://agent.example/turn",
      request: () =>
        Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          toolCalls: [
            {
              id: "r1",
              name: "read",
              args: { offset: 0, limit: 1, columns: ["name"] },
            },
          ],
        }),
    });
    expect(failedRead.results).toEqual([]);
    expect(failedRead.unresolved?.code).toBeDefined();

    const already = new AbortController();
    already.abort();
    await expect(
      runAgentHttpTurn(
        live,
        "Hi",
        {
          endpoint: "https://agent.example/turn",
          fetch: () => new Promise<Response>(() => undefined),
        },
        { signal: already.signal }
      )
    ).rejects.toThrow(/cancelled|aborted/);

    const parsed = parseAgentHttpRequest({
      schemaVersion: AGENT_SCHEMA_VERSION,
      kind: "hello",
      tableId: "orders",
      manifest: live.manifest(),
      catalog: live.catalog(),
      conversation: [{ role: "user", text: "hi" }],
      descriptions: [],
      rows: [],
      results: [],
    });
    expect(parsed.conversation).toHaveLength(1);
    const client = createAgentHttpClient({
      endpoint: "https://agent.example/turn",
      request: () =>
        Promise.resolve({ schemaVersion: AGENT_SCHEMA_VERSION, text: "ok" }),
    });
    await expect(client.send(live, "Ping")).resolves.toMatchObject({
      text: "ok",
    });
  });

  it("keeps discovery going when only the view revision ticks mid-turn", async () => {
    let revision = 1;
    const live = createAgentSession({
      observe: () => observation({ viewRevision: revision }),
      apply: {
        readRows: vi.fn().mockResolvedValue({
          rows: [{ rowKey: "r1", cells: { name: "Ada" } }],
          offset: 0,
          limit: 10,
          redacted: [],
        }),
      },
    });
    let round = 0;
    const result = await runAgentHttpTurn(live, "Who is visible?", {
      endpoint: "https://agent.example/turn",
      request: (_body) => {
        round += 1;
        if (round === 1) {
          return Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            toolCalls: [
              {
                id: "r1",
                name: "read",
                args: { offset: 0, limit: 1, columns: ["name"] },
              },
            ],
          });
        }
        revision = 2;
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "done",
        });
      },
    });
    expect(result.text).toBe("done");
    expect(result.needsFulfilled.read).toBe(1);
  });
});

describe("a streamed reply", () => {
  const sse = (records: readonly string[]): Response =>
    new Response(`${records.join("\n\n")}\n\n`, {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    });

  const event = (name: string, data?: unknown): string =>
    data === undefined
      ? `event: ${name}`
      : `event: ${name}\ndata: ${JSON.stringify(data)}`;

  it("runs the calls it carried, once it is complete", async () => {
    const setPage = vi.fn();
    const live = session({ setPage });
    const result = await runAgentHttpTurn(live, "Page 2", {
      endpoint: "https://agent.example/turn",
      stream: true,
      fetch: () =>
        Promise.resolve(
          sse([
            event("text-delta", { text: "Showing " }),
            event("text-delta", { text: "page 2." }),
            event("tool-calls", {
              toolCalls: [
                { id: "c0", name: "view.setPage", args: { page: 2 } },
              ],
            }),
            event("done", { turnId: "t", phaseId: 0 }),
          ])
        ),
    });

    expect(result.text).toBe("Showing page 2.");
    expect(setPage).toHaveBeenCalledWith(2);
    expect(result.results[0]?.ok).toBe(true);
  });

  it("reports the text as it arrives", async () => {
    const live = session();
    const seen: string[] = [];
    await runAgentHttpTurn(live, "Hello", {
      endpoint: "https://agent.example/turn",
      stream: true,
      onStreamText: (text) => seen.push(text),
      fetch: () =>
        Promise.resolve(
          sse([
            event("text-delta", { text: "Hi" }),
            event("text-delta", { text: " there" }),
            event("done"),
          ])
        ),
    });

    expect(seen).toEqual(["Hi", "Hi there"]);
  });

  it("asks for a stream and accepts JSON without asking twice", async () => {
    const live = session();
    let accept = "";
    let calls = 0;
    const result = await runAgentHttpTurn(live, "Hello", {
      endpoint: "https://agent.example/turn",
      stream: true,
      fetch: (_url, init) => {
        calls += 1;
        accept = new Headers(init?.headers).get("accept") ?? "";
        return Promise.resolve(
          okResponse({ schemaVersion: AGENT_SCHEMA_VERSION, text: "plain" })
        );
      },
    });

    expect(accept).toContain("text/event-stream");
    // The response's own content type decides. A backend that answers JSON is
    // used as it is, not retried.
    expect(calls).toBe(1);
    expect(result.text).toBe("plain");
  });

  it("does not ask for a stream when nobody wanted one", async () => {
    const live = session();
    let accept = "";
    await runAgentHttpTurn(live, "Hello", {
      endpoint: "https://agent.example/turn",
      fetch: (_url, init) => {
        accept = new Headers(init?.headers).get("accept") ?? "";
        return Promise.resolve(
          okResponse({ schemaVersion: AGENT_SCHEMA_VERSION, text: "plain" })
        );
      },
    });

    expect(accept).toBe("application/json");
  });

  it("runs nothing when the stream stops before it is complete", async () => {
    const setPage = vi.fn();
    const live = session({ setPage });

    await expect(
      runAgentHttpTurn(live, "Page 2", {
        endpoint: "https://agent.example/turn",
        stream: true,
        fetch: () =>
          Promise.resolve(
            sse([
              event("text-delta", { text: "Showing" }),
              event("tool-calls", {
                toolCalls: [
                  { id: "c0", name: "view.setPage", args: { page: 2 } },
                ],
              }),
              // No `done`: the reply was cut off.
            ])
          ),
      })
    ).rejects.toThrow(/ended without done/);

    // The calls were carried but never final, so nothing ran.
    expect(setPage).not.toHaveBeenCalled();
  });

  it("surfaces a mid-stream failure and runs nothing", async () => {
    const setPage = vi.fn();
    const live = session({ setPage });

    await expect(
      runAgentHttpTurn(live, "Page 2", {
        endpoint: "https://agent.example/turn",
        stream: true,
        fetch: () =>
          Promise.resolve(
            sse([
              event("tool-calls", {
                toolCalls: [
                  { id: "c0", name: "view.setPage", args: { page: 2 } },
                ],
              }),
              event("error", { code: "provider-down", message: "upstream" }),
            ])
          ),
      })
    ).rejects.toThrow(/upstream/);

    expect(setPage).not.toHaveBeenCalled();
  });

  it("gives the same receipts as the same reply sent as JSON", async () => {
    const reply = {
      schemaVersion: AGENT_SCHEMA_VERSION,
      text: "Showing page 2.",
      toolCalls: [{ id: "c0", name: "view.setPage", args: { page: 2 } }],
    };
    const asJson = await runAgentHttpTurn(session(), "Page 2", {
      endpoint: "https://agent.example/turn",
      request: () => Promise.resolve(reply),
    });
    const asStream = await runAgentHttpTurn(session(), "Page 2", {
      endpoint: "https://agent.example/turn",
      stream: true,
      fetch: () =>
        Promise.resolve(
          sse([
            event("text-delta", { text: "Showing page 2." }),
            event("tool-calls", { toolCalls: reply.toolCalls }),
            event("done"),
          ])
        ),
    });

    expect(asStream.text).toBe(asJson.text);
    expect(asStream.keys).toEqual(asJson.keys);
    expect(asStream.results.map((entry) => entry.ok)).toEqual(
      asJson.results.map((entry) => entry.ok)
    );
  });
});

describe("discovery over the wire", () => {
  it("answers a family in one round rather than one per key", async () => {
    const live = session();
    let rounds = 0;
    const result = await runAgentHttpTurn(live, "Edit a cell", {
      endpoint: "https://agent.example/turn",
      request: (body) => {
        rounds += 1;
        if (!body.toolResults) {
          return Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            toolCalls: [
              { id: "d1", name: "describe", args: { bundle: "editing" } },
            ],
          });
        }
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "Got the guidance.",
        });
      },
    });

    // One describe call, one extra round — not one round per family member.
    expect(rounds).toBe(2);
    expect(result.text).toBe("Got the guidance.");
  });

  it("returns the family's guidance and names what it cannot give", async () => {
    const live = session();
    let answer: { guides?: unknown[]; unavailable?: string[] } | undefined;
    await runAgentHttpTurn(live, "Edit a cell", {
      endpoint: "https://agent.example/turn",
      request: (body) => {
        const result = toolValue<{ guides: unknown[]; unavailable: string[] }>(
          body,
          "d1"
        );
        if (result) answer = result;
        if (!body.toolResults) {
          return Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            toolCalls: [
              {
                id: "d1",
                name: "describe",
                args: { keys: ["edit.cells", "rows.delete"] },
              },
            ],
          });
        }
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "ok",
        });
      },
    });

    // edit.cells drags in rows.resolve; rows.delete is not wired here.
    expect(answer?.guides?.length).toBeGreaterThan(1);
    expect(answer?.unavailable).toEqual(["rows.delete"]);
  });

  it("carries a guide it already answered into the next turn", async () => {
    const live = session();
    const explained: (readonly string[] | undefined)[] = [];
    const options = {
      endpoint: "https://agent.example/turn",
      connectionId: "discovery-carry",
      context: { profile: "compact" as const },
      request: (body: Record<string, unknown>) => {
        const context = body.context as
          | {
              contract?: { capabilities?: { key: string; guide?: string }[] };
            }
          | undefined;
        // Which capabilities arrived with their whole guide attached.
        explained.push(
          context?.contract?.capabilities
            ?.filter((entry) => entry.guide !== undefined)
            .map((entry) => entry.key)
        );
        if (!body.toolResults) {
          return Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            toolCalls: [
              {
                id: "d1",
                name: "describe",
                args: { keys: ["edit.cells"] },
              },
            ],
          });
        }
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "ok",
        });
      },
    } as unknown as Parameters<typeof runAgentHttpTurn>[2];

    await runAgentHttpTurn(live, "Edit a cell", options);
    await runAgentHttpTurn(live, "Again", options);

    // The first request explained whatever the budget chose; the backend then
    // asked about `edit.cells`. On the next turn that guide travels with the
    // contract, so the model need not spend a round asking a second time.
    // This table is small enough that the compact budget explains everything,
    // so the before/after difference is not observable here — what is, and
    // what the cache promises, is that the guide travels on the next turn
    // rather than costing a second discovery round.
    expect(explained.at(-1)).toContain("edit.cells");
    expect(explained.at(-1)).toContain("rows.resolve");
  });
});

describe("carrying the context", () => {
  it("sends the contract and the view on a full request", async () => {
    const live = session();
    let body: Record<string, unknown> | undefined;
    await runAgentHttpTurn(live, "Page 2", {
      endpoint: "https://agent.example/turn",
      request: (sent) => {
        body = sent as unknown as Record<string, unknown>;
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "ok",
        });
      },
    });

    const context = body?.context as
      | { contract?: { version?: string }; selection?: { profile?: string } }
      | undefined;
    expect(context?.contract?.version).toBeTruthy();
    // Unbudgeted unless the host asks: what a backend's window costs is the
    // backend's business, and trimming on its behalf is a guess.
    expect(context?.selection?.profile).toBe("full");
    expect(body?.view).toBeDefined();
    expect(body?.contractVersion).toBeTruthy();
    expect(body?.selectionVersion).toBeTruthy();
  });

  it("sends the view every turn even when the contract is pinned", async () => {
    const live = session();
    const seen: { context: boolean; view: boolean }[] = [];
    const options = {
      endpoint: "https://agent.example/turn",
      request: (sent: Record<string, unknown>) => {
        seen.push({
          context: sent.context !== undefined,
          view: sent.view !== undefined,
        });
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "ok",
          pin: {
            status: "acknowledged" as const,
            contractVersion: sent.contractVersion as string,
          },
        });
      },
    } as unknown as Parameters<typeof runAgentHttpTurn>[2];
    await runAgentHttpTurn(live, "One", options);
    await runAgentHttpTurn(live, "Two", options);

    // The contract is the part worth pinning; the view is not, and never is.
    expect(seen[0]).toEqual({ context: true, view: true });
    expect(seen[1]).toEqual({ context: false, view: true });
  });

  it("attaches the whole context every request when pinning is off", async () => {
    const live = session();
    const sent: boolean[] = [];
    const options = {
      endpoint: "https://agent.example/turn",
      pinCatalog: false,
      request: (body: Record<string, unknown>) => {
        sent.push(body.context !== undefined);
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "ok",
        });
      },
    } as unknown as Parameters<typeof runAgentHttpTurn>[2];
    await runAgentHttpTurn(live, "One", options);
    await runAgentHttpTurn(live, "Two", options);

    expect(sent).toEqual([true, true]);
  });

  it("carries the profile the host asked for", async () => {
    const live = session();
    let profile: string | undefined;
    await runAgentHttpTurn(live, "One", {
      endpoint: "https://agent.example/turn",
      context: { profile: "full" },
      request: (body) => {
        profile = (
          body as unknown as { context?: { selection?: { profile?: string } } }
        ).context?.selection?.profile;
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "ok",
        });
      },
    });

    expect(profile).toBe("full");
  });

  it("never puts a row value in the request outside a tool result", async () => {
    const live = session();
    let serialized = "";
    await runAgentHttpTurn(live, "Who is visible?", {
      endpoint: "https://agent.example/turn",
      request: (body) => {
        serialized = JSON.stringify(body);
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "ok",
        });
      },
    });

    // The first request carries the contract and the view. Neither holds
    // anybody's data — values reach a model only inside a tool result.
    expect(serialized).not.toContain("Ada");
  });
});

describe("a spoken turn", () => {
  const clip = {
    mimeType: "audio/webm",
    base64: "AAAA",
    durationMs: 1_500,
  };

  it("is accepted in place of a message", () => {
    const parsed = parseAgentHttpRequest({
      schemaVersion: AGENT_SCHEMA_VERSION,
      kind: "turn",
      tableId: "orders",
      audio: clip,
    });

    expect(parsed.audio?.mimeType).toBe("audio/webm");
    expect(parsed.message).toBeUndefined();
  });

  it("still requires one or the other", () => {
    expect(() =>
      parseAgentHttpRequest({
        schemaVersion: AGENT_SCHEMA_VERSION,
        kind: "turn",
        tableId: "orders",
      })
    ).toThrow(/message string or audio/);
  });

  it("refuses a format no browser records", () => {
    expect(() =>
      parseAgentHttpRequest({
        schemaVersion: AGENT_SCHEMA_VERSION,
        kind: "turn",
        tableId: "orders",
        audio: { ...clip, mimeType: "application/octet-stream" },
      })
    ).toThrow(/audio.mimeType must be one of/);
  });

  it("refuses a clip nobody meant to send", () => {
    expect(() =>
      parseAgentHttpRequest({
        schemaVersion: AGENT_SCHEMA_VERSION,
        kind: "turn",
        tableId: "orders",
        audio: { ...clip, durationMs: 600_000 },
      })
    ).toThrow(/durationMs exceeds limit/);
    expect(() =>
      parseAgentHttpRequest({
        schemaVersion: AGENT_SCHEMA_VERSION,
        kind: "turn",
        tableId: "orders",
        audio: { ...clip, base64: "A".repeat(8_000_000) },
      })
    ).toThrow(/audio exceeds limit/);
    expect(() =>
      parseAgentHttpRequest({
        schemaVersion: AGENT_SCHEMA_VERSION,
        kind: "turn",
        tableId: "orders",
        audio: { ...clip, durationMs: 0 },
      })
    ).toThrow(/durationMs must be a positive number/);
  });

  it("reads a transcript back off the reply", () => {
    const parsed = parseAgentHttpResponse({
      schemaVersion: AGENT_SCHEMA_VERSION,
      text: "Paged.",
      transcript: "go to page two",
    });

    expect(parsed.transcript).toBe("go to page two");
  });
});

describe("the published wire", () => {
  it("says the same limits the parsers enforce", () => {
    const schema = agentHttpJsonSchema() as {
      limits: Record<string, number>;
      $defs: Record<string, { properties?: Record<string, unknown> }>;
    };

    expect(schema.limits.maxToolCalls).toBe(AGENT_HTTP_LIMITS.maxToolCalls);
    expect(schema.limits.maxAudioMs).toBe(AGENT_HTTP_LIMITS.maxAudioMs);
    expect(schema.$defs.request?.properties).toHaveProperty("context");
    expect(schema.$defs.request?.properties).toHaveProperty("view");
    expect(schema.$defs.reply?.properties).toHaveProperty("toolCalls");
  });
});

describe("pinning the contract on a backend", () => {
  const ack = (contractVersion?: string) => ({
    status: "acknowledged" as const,
    ...(contractVersion ? { contractVersion } : {}),
  });

  it("does not pin on a reply that says nothing about the contract", async () => {
    const live = session();
    const bodies: unknown[] = [];
    const options = {
      endpoint: "https://agent.example/turn",
      request: (body: { catalog?: unknown }) => {
        bodies.push(body.catalog);
        // An ordinary successful turn. It proves nothing about pinning.
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "ok",
        });
      },
    };
    await runAgentHttpTurn(live, "One", options);
    await runAgentHttpTurn(live, "Two", options);

    expect(bodies[0]).toBeDefined();
    expect(bodies[1]).toBeDefined();
  });

  it("stops sending the contract once a reply acknowledges it", async () => {
    const live = session();
    const bodies: unknown[] = [];
    const options = {
      endpoint: "https://agent.example/turn",
      request: (body: { catalog?: unknown; contractVersion?: string }) => {
        bodies.push(body.catalog);
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "ok",
          pin: ack(body.contractVersion),
        });
      },
    };
    await runAgentHttpTurn(live, "One", options);
    await runAgentHttpTurn(live, "Two", options);

    expect(bodies[0]).toBeDefined();
    expect(bodies[1]).toBeUndefined();
  });

  it("keeps two endpoints from using each other's pin", async () => {
    const live = session();
    const seen: Record<string, boolean[]> = { a: [], b: [] };
    const backend = (name: string) => ({
      endpoint: `https://${name}.example/turn`,
      request: (body: { catalog?: unknown; contractVersion?: string }) => {
        seen[name]?.push(body.catalog !== undefined);
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "ok",
          pin: ack(body.contractVersion),
        });
      },
    });
    await runAgentHttpTurn(live, "One", backend("a"));
    await runAgentHttpTurn(live, "Two", backend("a"));
    // A different backend has never been told anything about this table.
    await runAgentHttpTurn(live, "Three", backend("b"));

    expect(seen.a).toEqual([true, false]);
    expect(seen.b).toEqual([true]);
  });

  it("sends the contract again after the connection is reset", async () => {
    const live = session();
    const sent: boolean[] = [];
    const options = {
      endpoint: "https://agent.example/turn",
      connectionId: "conn-1",
      request: (body: { catalog?: unknown; contractVersion?: string }) => {
        sent.push(body.catalog !== undefined);
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "ok",
          pin: ack(body.contractVersion),
        });
      },
    };
    const client = createAgentHttpClient(options);
    await client.send(live, "One");
    await client.send(live, "Two");
    // The host's credentials changed under the same endpoint.
    client.reset(live);
    await client.send(live, "Three");

    expect(sent).toEqual([true, false, true]);
  });

  it("refuses an acknowledgement for a contract it did not send", async () => {
    const live = session();
    const sent: boolean[] = [];
    const options = {
      endpoint: "https://agent.example/turn",
      request: (body: { catalog?: unknown }) => {
        sent.push(body.catalog !== undefined);
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "ok",
          pin: ack("some-other-contract"),
        });
      },
    };
    await runAgentHttpTurn(live, "One", options);
    await runAgentHttpTurn(live, "Two", options);

    expect(sent).toEqual([true, true]);
  });

  it("goes back to sending the contract when the labels change", async () => {
    let label = "Name";
    const live = createAgentSession({
      observe: () =>
        observation({
          columns: [
            {
              id: "name",
              label,
              type: "string",
              readable: true,
              writable: true,
              sortable: true,
            },
          ],
        }),
      apply: { setPage: vi.fn() },
    });
    const sent: boolean[] = [];
    const kinds: string[] = [];
    const options = {
      endpoint: "https://agent.example/turn",
      request: (body: {
        kind: string;
        catalog?: unknown;
        contractVersion?: string;
      }) => {
        sent.push(body.catalog !== undefined);
        kinds.push(body.kind);
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "ok",
          pin: ack(body.contractVersion),
        });
      },
    };
    await runAgentHttpTurn(live, "One", options);
    await runAgentHttpTurn(live, "Two", options);
    // Same keys, different label: the backend would write the wrong prompt.
    label = "Full name";
    await runAgentHttpTurn(live, "Three", options);

    // The contract travels once, is pinned, and travels again when it moves —
    // in a schema round of its own, so the turn that follows is pinned too
    // rather than carrying the whole thing a second time.
    expect(sent).toEqual([true, false, true, false]);
    expect(kinds).toEqual(["turn", "turn", "schema", "turn"]);
  });

  it("resends the contract once when the backend lost its pin", async () => {
    const live = session();
    const sent: boolean[] = [];
    let pinned = true;
    const options = {
      endpoint: "https://agent.example/turn",
      request: (body: { catalog?: unknown; contractVersion?: string }) => {
        sent.push(body.catalog !== undefined);
        if (!body.catalog && pinned) {
          // The backend restarted between turns.
          pinned = false;
          return Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            pin: { status: "expired" as const },
            text: "send it again",
          });
        }
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "ok",
          pin: ack(body.contractVersion),
        });
      },
    };
    await runAgentHttpTurn(live, "One", options);
    const result = await runAgentHttpTurn(live, "Two", options);

    // Pinned, then a request that relied on the pin, then the recovery with
    // the contract attached — and a real answer at the end.
    expect(sent).toEqual([true, false, true]);
    expect(result.text).toBe("ok");
  });

  it("does not resend a call whose outcome is unknown", async () => {
    const setPage = vi.fn();
    const live = session({ setPage });
    let turns = 0;
    const options = {
      endpoint: "https://agent.example/turn",
      request: (body: { contractVersion?: string }) => {
        turns += 1;
        if (turns === 1) {
          return Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            text: "Paged.",
            toolCalls: [{ id: "p", name: "view.setPage", args: { page: 2 } }],
            pin: ack(body.contractVersion),
          });
        }
        // A pin answer arriving after work has run is not a reason to run it
        // again; recovery only ever resends context.
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          pin: { status: "expired" as const },
          text: "lost it",
        });
      },
    };
    await runAgentHttpTurn(live, "Page 2", options);
    await runAgentHttpTurn(live, "Again", options);

    expect(setPage).toHaveBeenCalledTimes(1);
  });

  it("attaches the contract every request when pinning is turned off", async () => {
    const live = session();
    const sent: boolean[] = [];
    const options = {
      endpoint: "https://agent.example/turn",
      pinCatalog: false,
      request: (body: { catalog?: unknown; contractVersion?: string }) => {
        sent.push(body.catalog !== undefined);
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "ok",
          pin: ack(body.contractVersion),
        });
      },
    };
    await runAgentHttpTurn(live, "One", options);
    await runAgentHttpTurn(live, "Two", options);

    expect(sent).toEqual([true, true]);
  });
});

describe("transport limits and cancellation", () => {
  it("never invokes a custom transport when the signal is already aborted", async () => {
    const live = session();
    const request = vi.fn().mockResolvedValue({
      schemaVersion: AGENT_SCHEMA_VERSION,
      text: "should never be produced",
    });
    const cancelled = new AbortController();
    cancelled.abort();
    await expect(
      runAgentHttpTurn(
        live,
        "Hi",
        { endpoint: "https://agent.example/turn", request },
        { signal: cancelled.signal }
      )
    ).rejects.toThrow(/cancelled/);
    expect(request).not.toHaveBeenCalled();
  });

  it("times out a custom transport that ignores its signal", async () => {
    const live = session();
    await expect(
      runAgentHttpTurn(live, "Hi", {
        endpoint: "https://agent.example/turn",
        timeoutMs: 5,
        // Deliberately ignores `signal` — the client must not hang on it.
        request: () => new Promise<unknown>(() => undefined),
      })
    ).rejects.toThrow(/timed out/);
  });

  it("rejects a response body larger than the client accepts", async () => {
    const live = session();
    const huge = "x".repeat(600_000);
    await expect(
      runAgentHttpTurn(live, "Hi", {
        endpoint: "https://agent.example/turn",
        fetch: () =>
          Promise.resolve(
            okResponse({ schemaVersion: AGENT_SCHEMA_VERSION, text: huge })
          ),
      })
    ).rejects.toThrow(/response exceeds/);
  });

  it("rejects an oversized response from a custom transport too", async () => {
    const live = session();
    await expect(
      runAgentHttpTurn(live, "Hi", {
        endpoint: "https://agent.example/turn",
        request: () =>
          Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            text: "y".repeat(600_000),
          }),
      })
    ).rejects.toThrow(/response exceeds/);
  });

  it("bounds the context accumulated across discovery rounds", async () => {
    const live = createAgentSession({
      observe: () => observation(),
      apply: {
        setPage: vi.fn(),
        // Every read returns a large window, so two rounds overflow the cap.
        readRows: (query) => ({
          offset: query.offset,
          limit: query.limit,
          redacted: [],
          rows: Array.from({ length: 40 }, (_, index) => ({
            rowKey: `r${String(index)}`,
            cells: { name: "z".repeat(4_000) },
          })),
        }),
        resolveRow: () => ({ rowKey: "r1", scope: "visible" as const }),
      },
    });
    await expect(
      runAgentHttpTurn(live, "Hi", {
        endpoint: "https://agent.example/turn",
        fetch: () =>
          Promise.resolve(
            okResponse({
              schemaVersion: AGENT_SCHEMA_VERSION,
              toolCalls: [
                {
                  id: "r1",
                  name: "read",
                  args: { offset: 0, limit: 40, scope: "visible" },
                },
              ],
            })
          ),
      })
    ).rejects.toThrow(/context exceeds/);
  });
});

describe("a reply the wire will not accept", () => {
  /** A well-formed reply, for a case to spoil one field of. */
  const reply = (patch: Record<string, unknown>): unknown => ({
    schemaVersion: AGENT_SCHEMA_VERSION,
    text: "ok",
    ...patch,
  });

  // Each case is one field a backend can get wrong. The refusal happens at the
  // boundary, before anything downstream reads a value nobody meant to send.
  const cases: readonly [string, unknown, RegExp][] = [
    ["a reply that is not an object", 7, /response must be an object/],
    [
      "a schema version this client does not speak",
      { schemaVersion: "nope" },
      /schemaVersion/,
    ],
    ["an empty session id", reply({ sessionId: "" }), /sessionId/],
    [
      "a question that is not an object",
      reply({ askUser: 7 }),
      /askUser must be an object/,
    ],
    [
      "a question with no id",
      reply({ askUser: { question: "Which?", allowFreeText: true } }),
      /askUser\.id is required/,
    ],
    [
      "a question nobody can answer",
      reply({
        askUser: { id: "q1", question: "Which?", allowFreeText: false },
      }),
      /options or allow free text/,
    ],
    [
      "a question option that is not an object",
      reply({
        askUser: { id: "q1", question: "Which?", options: [7] },
      }),
      /option must be an object/,
    ],
    ["a pin that is not an object", reply({ pin: 7 }), /pin must be an object/],
    [
      "a pin status this client does not know",
      reply({ pin: { status: "maybe" } }),
      /pin/,
    ],
    [
      "a pin lifetime that is not a number",
      reply({ pin: { status: "acknowledged", ttlMs: "soon" } }),
      /ttlMs must be a finite number/,
    ],
  ];

  for (const [name, input, message] of cases) {
    it(`refuses ${name}`, () => {
      expect(() => parseAgentHttpResponse(input)).toThrow(message);
    });
  }

  it("accepts a reply that carries only what it needs to", () => {
    // The other half of the contract: none of the above is over-strict.
    expect(
      parseAgentHttpResponse({ schemaVersion: AGENT_SCHEMA_VERSION })
    ).toMatchObject({ schemaVersion: AGENT_SCHEMA_VERSION });
  });
});

describe("a request the wire will not accept", () => {
  const turn = (patch: Record<string, unknown>): unknown => ({
    schemaVersion: AGENT_SCHEMA_VERSION,
    kind: "turn",
    tableId: "orders",
    message: "go",
    ...patch,
  });

  const cases: readonly [string, unknown, RegExp][] = [
    ["a request that is not an object", 7, /request must be an object/],
    [
      "a turn with neither words nor a recording",
      { schemaVersion: AGENT_SCHEMA_VERSION, kind: "turn", tableId: "orders" },
      /message string or audio/,
    ],
    [
      "a tool result that is not an object",
      turn({ toolResults: [7] }),
      /tool result must be an object/,
    ],
    [
      "a tool result with nothing to match it to",
      turn({ toolResults: [{ result: 1 }] }),
      /result\.id is required/,
    ],
    [
      "a recording that is not an object",
      turn({ audio: 7 }),
      /audio must be an object/,
    ],
  ];

  for (const [name, input, message] of cases) {
    it(`refuses ${name}`, () => {
      expect(() => parseAgentHttpRequest(input)).toThrow(message);
    });
  }
});

describe("every optional field the wire allows", () => {
  it("carries a request that fills in all of them", () => {
    // The other half of the refusals above: each optional field has to survive
    // the round trip untouched, or a backend that sends one loses it silently.
    const parsed = parseAgentHttpRequest({
      schemaVersion: AGENT_SCHEMA_VERSION,
      kind: "turn",
      tableId: "orders",
      message: "go",
      sessionId: "s1",
      turnId: "t1",
      phaseId: 2,
      contractVersion: "c1",
      selectionVersion: "v1",
      conversation: [{ role: "user", text: "hello" }],
      context: { contract: { tableId: "orders", version: "c1" } },
      view: { revision: 4, page: 2 },
      audio: { mimeType: "audio/webm", base64: "AA==", durationMs: 1200 },
      toolResults: [{ id: "r1", result: { ok: true } }],
      pendingCalls: [
        {
          id: "c1",
          name: "view.setPage",
          args: { page: 3 },
          expectedRevision: 4,
        },
      ],
    });

    expect(parsed).toMatchObject({
      sessionId: "s1",
      turnId: "t1",
      phaseId: 2,
      contractVersion: "c1",
      selectionVersion: "v1",
      audio: { mimeType: "audio/webm", durationMs: 1200 },
      toolResults: [{ id: "r1" }],
      pendingCalls: [{ id: "c1", name: "view.setPage", expectedRevision: 4 }],
    });
  });

  it("carries a reply that fills in all of them", () => {
    const parsed = parseAgentHttpResponse({
      schemaVersion: AGENT_SCHEMA_VERSION,
      ok: true,
      sessionId: "s1",
      text: "here you go",
      transcript: "here you go",
      continueWithResults: true,
      toolCalls: [{ id: "c1", name: "view.setPage", args: { page: 3 } }],
      askUser: {
        id: "q1",
        question: "Which quarter?",
        options: [{ id: "q4", label: "Q4" }],
        allowFreeText: false,
      },
      pin: {
        status: "acknowledged",
        contractVersion: "c1",
        ttlMs: 60_000,
      },
    });

    expect(parsed).toMatchObject({
      ok: true,
      sessionId: "s1",
      text: "here you go",
      transcript: "here you go",
      continueWithResults: true,
      askUser: { id: "q1", allowFreeText: false },
      pin: { status: "acknowledged", contractVersion: "c1", ttlMs: 60_000 },
    });
  });

  it("refuses a tool call with an expected revision that is not a number", () => {
    expect(() =>
      parseAgentHttpResponse({
        schemaVersion: AGENT_SCHEMA_VERSION,
        toolCalls: [
          { id: "c1", name: "view.setPage", expectedRevision: "soon" },
        ],
      })
    ).toThrow(/expectedRevision must be a finite number/);
  });

  it("refuses a tool call with no id or no name", () => {
    expect(() =>
      parseAgentHttpResponse({
        schemaVersion: AGENT_SCHEMA_VERSION,
        toolCalls: [{ name: "view.setPage" }],
      })
    ).toThrow(/call\.id is required/);
    expect(() =>
      parseAgentHttpResponse({
        schemaVersion: AGENT_SCHEMA_VERSION,
        toolCalls: [{ id: "c1" }],
      })
    ).toThrow(/call\.name is required/);
  });

  it("defaults a tool call's arguments to nothing rather than undefined", () => {
    const parsed = parseAgentHttpResponse({
      schemaVersion: AGENT_SCHEMA_VERSION,
      toolCalls: [{ id: "c1", name: "view.setPage" }],
    });

    expect(parsed.toolCalls?.[0]?.args).toEqual({});
  });
});

describe("telling a tool's value from its failure", () => {
  it("reads a result that carries one", () => {
    expect(isToolValue({ id: "r1", result: { rows: 2 } })).toBe(true);
  });

  it("reads a result that carries a failure instead", () => {
    expect(
      isToolValue({ id: "r1", error: { code: "refused", message: "no" } })
    ).toBe(false);
  });
});

describe("a recording the wire will not carry", () => {
  const turn = (audio: unknown): unknown => ({
    schemaVersion: AGENT_SCHEMA_VERSION,
    kind: "turn",
    tableId: "orders",
    audio,
  });
  const ok = { mimeType: "audio/webm", base64: "AAAA", durationMs: 1200 };

  it("refuses a media type this wire does not speak", () => {
    expect(() =>
      parseAgentHttpRequest(turn({ ...ok, mimeType: "audio/aiff" }))
    ).toThrow(/mimeType must be one of/);
  });

  it("takes a media type that carries its codec with it", () => {
    // What a browser's MediaRecorder actually reports.
    expect(
      parseAgentHttpRequest(turn({ ...ok, mimeType: "audio/webm;codecs=opus" }))
    ).toMatchObject({ audio: { durationMs: 1200 } });
  });

  it("refuses a recording with no audio in it", () => {
    expect(() => parseAgentHttpRequest(turn({ ...ok, base64: "" }))).toThrow(
      /base64 is required/
    );
  });

  it("refuses a recording that says it lasted no time", () => {
    expect(() => parseAgentHttpRequest(turn({ ...ok, durationMs: 0 }))).toThrow(
      /positive number/
    );
  });

  it("refuses a recording longer than the wire will carry", () => {
    expect(() =>
      parseAgentHttpRequest(turn({ ...ok, durationMs: 60 * 60 * 1000 }))
    ).toThrow(/exceeds limit/);
  });

  it("refuses a clip too large to send, without decoding it", () => {
    expect(() =>
      parseAgentHttpRequest(turn({ ...ok, base64: "A".repeat(40_000_000) }))
    ).toThrow(/exceeds limit/);
  });
});

describe("what a tool result may say went wrong", () => {
  const reply = (toolResults: unknown): unknown => ({
    schemaVersion: AGENT_SCHEMA_VERSION,
    kind: "turn",
    tableId: "orders",
    message: "go",
    toolResults,
  });

  it("carries the failure a backend named", () => {
    const parsed = parseAgentHttpRequest(
      reply([{ id: "r1", error: { code: "refused", message: "not today" } }])
    );

    expect(parsed.toolResults?.[0]).toMatchObject({
      id: "r1",
      error: { code: "refused", message: "not today" },
    });
  });

  it("names a failure the backend did not describe", () => {
    const parsed = parseAgentHttpRequest(reply([{ id: "r1", error: {} }]));

    expect(parsed.toolResults?.[0]).toMatchObject({
      error: { code: "error", message: "tool call failed" },
    });
  });

  it("refuses a question option missing its id or its label", () => {
    expect(() =>
      parseAgentHttpResponse({
        schemaVersion: AGENT_SCHEMA_VERSION,
        askUser: {
          id: "q1",
          question: "Which?",
          options: [{ id: "q4" }],
        },
      })
    ).toThrow(/needs an id and a label/);
  });
});
