import { describe, expect, it, vi } from "vitest";

import {
  connectAgentHttp,
  createAgentHttpClient,
  parseAgentHttpRequest,
  parseAgentHttpResponse,
  runAgentHttpTurn,
} from "./http";
import { AGENT_SCHEMA_VERSION } from "./keys";
import { createAgentSession } from "./session";
import type { AgentObservation, ExecuteResult } from "./types";

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
    expect(parsed.catalog.some((entry) => entry.key === "view.setPage")).toBe(
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

  it("requires action idempotency keys", () => {
    expect(() =>
      parseAgentHttpResponse({
        schemaVersion: AGENT_SCHEMA_VERSION,
        actions: [{ key: "view.setPage", args: { page: 2 } }],
      })
    ).toThrow(/idempotencyKey/);
    const parsed = parseAgentHttpResponse({
      schemaVersion: AGENT_SCHEMA_VERSION,
      text: "Moved.",
      actions: [
        {
          key: "view.setPage",
          args: { page: 2 },
          idempotencyKey: "page-2",
        },
      ],
    });
    expect(parsed.actions?.[0]?.idempotencyKey).toBe("page-2");
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
        expect(body.manifest.capabilities).toContain("view.setPage");
        expect(body.manifest.capabilities).not.toContain("rows.add");
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
          actions: [
            {
              key: "view.setPage",
              args: { page: 2 },
              idempotencyKey: "page-2",
            },
          ],
        });
      },
    });
    expect(result.text).toBe("Showing page 2.");
    expect(result.results[0]?.ok).toBe(true);
    expect(setPage).toHaveBeenCalledWith(2);
    expect(posts).toEqual(["turn"]);
  });

  it("answers describe and read needs without sending the whole dataset", async () => {
    const live = session();
    const bodies: { describe?: number; rows?: number }[] = [];
    const result = await runAgentHttpTurn(live, "Who is visible?", {
      endpoint: "https://agent.example/turn",
      request: (body) => {
        bodies.push({
          describe: body.descriptions?.length,
          rows: body.rows?.[0]?.rows.length,
        });
        if (!body.descriptions) {
          return Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            needs: {
              describe: ["rows.read"],
              read: [{ offset: 0, limit: 1, columns: ["name"] }],
            },
          });
        }
        expect(body.rows?.[0]?.redacted).toContain("ssn");
        expect(body.rows?.[0]?.rows[0]?.cells).not.toHaveProperty("ssn");
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "Ada is visible.",
        });
      },
    });
    expect(result.text).toBe("Ada is visible.");
    expect(result.needsFulfilled).toEqual({ describe: 1, read: 1 });
    expect(bodies[0]).toEqual({});
    expect(bodies[1]?.describe).toBe(1);
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
        firstBodies.push({
          guides: body.descriptions?.map((guide) => guide.key),
          columns: body.rows?.[0]
            ? Object.keys(body.rows[0].rows[0]?.cells ?? {})
            : undefined,
        });
        if (!body.descriptions?.length) {
          return Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            needs: { describe: ["rows.read"] },
          });
        }
        if (!body.rows?.length) {
          expect(
            body.descriptions?.some((guide) => guide.key === "rows.read")
          ).toBe(true);
          return Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            needs: { read: [{ offset: 0, limit: 1, columns: ["name"] }] },
          });
        }
        expect(
          body.descriptions?.some((guide) => guide.key === "rows.read")
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
        if (!body.rows?.length) {
          return Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            needs: { read: [{ offset: 0, limit: 1, columns: ["name"] }] },
          });
        }
        expect(body.rows?.[0]?.rows[0]?.rowKey).toBe("r2");
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          text: "Again.",
        });
      },
    });
    expect(reads).toBe(2);
  });

  it("binds omitted expectedRevision to the request snapshot", async () => {
    let revision = 1;
    const setPage = vi.fn();
    const live = createAgentSession({
      observe: () => observation({ viewRevision: revision, approval: "never" }),
      apply: { setPage },
    });
    const result = await runAgentHttpTurn(live, "Page 2", {
      endpoint: "https://agent.example/turn",
      request: () => {
        revision = 2;
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          actions: [
            {
              key: "view.setPage",
              args: { page: 2 },
              idempotencyKey: "page-2",
            },
          ],
        });
      },
    });
    expect(result.results[0]?.error?.code).toBe("revision-mismatch");
    expect(setPage).not.toHaveBeenCalled();
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
            actions: [
              {
                key: "view.setPage",
                args: { page: 2 },
                idempotencyKey: "page-done",
              },
              {
                key: "edit.cells",
                args: {
                  edits: [{ rowKey: "r1", column: "name", value: "Ada" }],
                },
                idempotencyKey: "edit-pending",
              },
              {
                key: "view.setPage",
                args: { page: 3 },
                idempotencyKey: "page-skip",
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
    expect(result.results[1]?.result).toMatchObject({
      approval: "rejected",
      applied: false,
    });
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
          actions: [
            {
              key: "edit.cells",
              args: {
                edits: [
                  { rowKey: "r1", column: "name", value: "Ada Lovelace" },
                ],
              },
              expectedRevision: 9,
              idempotencyKey: "edit-ada-stale",
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
          actions: [
            {
              key: "edit.cells",
              args: {
                edits: [
                  { rowKey: "r1", column: "name", value: "Ada Lovelace" },
                ],
              },
              idempotencyKey: "edit-ada",
            },
          ],
        }),
    });
    const again = await runAgentHttpTurn(live, "Edit Ada again", {
      endpoint: "https://agent.example/turn",
      request: () =>
        Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          actions: [
            {
              key: "edit.cells",
              args: {
                edits: [{ rowKey: "r1", column: "name", value: "Other" }],
              },
              idempotencyKey: "edit-ada",
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
    const seen: (readonly ExecuteResult[] | undefined)[] = [];
    await runAgentHttpTurn(
      live,
      "Page 2",
      {
        endpoint: "https://agent.example/turn",
        request: (body) => {
          seen.push(body.results);
          if (!body.results) {
            return Promise.resolve({
              schemaVersion: AGENT_SCHEMA_VERSION,
              text: "Moved.",
              continueWithResults: true,
              actions: [
                {
                  key: "view.setPage",
                  args: { page: 2 },
                  idempotencyKey: "p2",
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
    expect(seen[1]?.[0]?.ok).toBe(true);
    const text = await runAgentHttpTurn(
      live,
      "Page 2",
      {
        endpoint: "https://agent.example/turn",
        request: (body) => {
          if (!body.results) {
            return Promise.resolve({
              schemaVersion: AGENT_SCHEMA_VERSION,
              text: "Moved.",
              continueWithResults: true,
              actions: [
                {
                  key: "view.setPage",
                  args: { page: 2 },
                  idempotencyKey: "p2-text",
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
            needs: { describe: ["rows.read"] },
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
    ).toThrow(/catalog/);
    expect(() => parseAgentHttpResponse(null)).toThrow(/object/);
    expect(() =>
      parseAgentHttpResponse({
        schemaVersion: AGENT_SCHEMA_VERSION,
        actions: ["nope"],
      })
    ).toThrow(/action/);
    const withNeeds = parseAgentHttpResponse({
      schemaVersion: AGENT_SCHEMA_VERSION,
      needs: {
        describe: ["rows.read", 1],
        read: [
          { offset: 0, limit: 2, columns: ["name", 2], scope: "visible" },
          { scope: "nope" },
        ],
      },
    });
    expect(withNeeds.needs?.describe).toEqual(["rows.read"]);
    expect(withNeeds.needs?.read?.[0]?.scope).toBe("visible");
    expect(withNeeds.needs?.read?.[1]?.scope).toBeUndefined();

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
            needs: { read: [{ offset: 0, limit: 1, columns: ["name"] }] },
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
});

describe("example backend protocol", () => {
  it("speaks the same hello and text-plus-actions contract as the bridge", async () => {
    const { createServer } = await import("node:http");
    const { handleExampleHttp } =
      await import("../../../examples/ai-http-backend.ts");
    const complete = vi.fn(() =>
      Promise.resolve(
        JSON.stringify({
          text: "Showing page 2.",
          actions: [
            {
              key: "view.setPage",
              args: { page: 2 },
              idempotencyKey: "page-2",
            },
          ],
        })
      )
    );
    const server = createServer((req, res) => {
      void handleExampleHttp(req, res, complete);
    });
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    const port = address && typeof address === "object" ? address.port : 0;
    const live = session();
    const client = createAgentHttpClient({
      endpoint: `http://127.0.0.1:${String(port)}`,
      timeoutMs: 2_000,
    });
    try {
      const hello = await client.connect(live);
      expect(hello.ok).toBe(true);
      expect(complete).not.toHaveBeenCalled();
      const result = await client.send(live, "Go to page 2");
      expect(result.text).toBe("Showing page 2.");
      expect(result.results[0]?.ok).toBe(true);
      expect(complete).toHaveBeenCalledTimes(1);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});
