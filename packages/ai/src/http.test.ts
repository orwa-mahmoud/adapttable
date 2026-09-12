import { describe, expect, it, vi } from "vitest";

import {
  AGENT_HTTP_LIMITS,
  agentHttpJsonSchema,
  connectAgentHttp,
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

interface RowWindowResult {
  readonly rows: readonly {
    readonly rowKey: string;
    readonly cells: unknown;
  }[];
  readonly redacted?: readonly string[];
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
          text: body.kind === "turn" ? "Done" : "Ready",
        });
      },
    };
    await connectAgentHttp(live, options);
    await runAgentHttpTurn(live, "Show page 2", options);
    expect(kinds).toEqual(["hello", "turn"]);
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
      request: (body: { kind: string }) => {
        kinds.push(body.kind);
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          ok: true,
          sessionId: "sess-2",
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
    await expect(
      runAgentHttpTurn(live, "Filter it", {
        endpoint: "https://agent.example/turn",
        request: () => {
          rounds += 1;
          return Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            toolCalls: [
              { id: "d1", name: "describe", args: { keys: ["nope"] } },
            ],
          });
        },
      })
    ).rejects.toThrow(/discovery too many times/);

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
          rows: window?.rows.length,
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
        expect(window?.redacted).toContain("ssn");
        expect(window?.rows[0]?.cells).not.toHaveProperty("ssn");
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
            ? Object.keys((window.rows[0]?.cells as object | undefined) ?? {})
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
        expect(window.rows[0]?.rowKey).toBe("r2");
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
              args: { key: "salary", dir: "desc" },
              id: "sort-salary",
            },
          ],
        }),
    });
    expect(result.results.map((entry) => entry.ok)).toEqual([true, true]);
    expect(setFilters).toHaveBeenCalledTimes(1);
    expect(setSort).toHaveBeenCalledWith("salary", "desc");
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
    expect(again.results[0]).toEqual(first.results[0]);
    expect(editCells).toHaveBeenCalledTimes(1);
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
    await expect(
      runAgentHttpTurn(live, "Who?", {
        endpoint: "https://agent.example/turn",
        request: () =>
          Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            toolCalls: [
              { id: "d1", name: "describe", args: { keys: ["rows.read"] } },
            ],
          }),
      })
    ).rejects.toThrow(/too many times/);
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
    await expect(
      runAgentHttpTurn(brokenRead, "Who?", {
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
      })
    ).rejects.toThrow(/read boom/);

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
    const priorities: (readonly string[] | undefined)[] = [];
    const options = {
      endpoint: "https://agent.example/turn",
      context: { profile: "full" as const },
      request: (body: Record<string, unknown>) => {
        const context = body.context as
          { contract?: { capabilities?: { key: string }[] } } | undefined;
        priorities.push(
          context?.contract?.capabilities?.map((entry) => entry.key)
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

    // The guide the model asked for on the first turn leads the contract on
    // the next one, so it need not spend a round asking a second time.
    expect(priorities.at(-1)?.[0]).toBe("edit.cells");
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
    expect(context?.selection?.profile).toBe("compact");
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
    const bodies: (unknown | undefined)[] = [];
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
    const bodies: (unknown | undefined)[] = [];
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
    const options = {
      endpoint: "https://agent.example/turn",
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
    // Same keys, different label: the backend would write the wrong prompt.
    label = "Full name";
    await runAgentHttpTurn(live, "Three", options);

    expect(sent).toEqual([true, false, true]);
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
