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
    const live = session();
    const rows = [
      { offset: 0, limit: 1, redacted: [], rows: [] as never[] },
    ] as const;
    const parsed = parseAgentHttpRequest({
      ...base,
      kind: "turn",
      message: "page 2",
      conversation: [{ role: "user", content: "page 2" }],
      descriptions: [live.describe("view.setPage")],
      rows,
    });
    expect(parsed.message).toBe("page 2");
    expect(parsed.conversation).toHaveLength(1);
    expect(parsed.descriptions?.[0]?.key).toBe("view.setPage");
    expect(parsed.rows).toEqual(rows);
  });
});

describe("parseAgentHttpResponse holds the ceilings", () => {
  it("refuses a response that is not an object", () => {
    expect(() => parseAgentHttpResponse(["ok"])).toThrow(/must be an object/);
  });

  it("refuses an action with no key", () => {
    expect(() =>
      parseAgentHttpResponse(
        response({ actions: [{ idempotencyKey: "a1", args: {} }] })
      )
    ).toThrow(/action.key is required/);
  });

  it("refuses more actions than one turn may carry", () => {
    const actions = Array.from({ length: 33 }, (_, index) => ({
      key: "view.setPage",
      args: { page: index + 1 },
      idempotencyKey: `page-${String(index)}`,
    }));
    expect(() => parseAgentHttpResponse(response({ actions }))).toThrow(
      /actions exceed limit of 32/
    );
  });

  it("refuses more describe asks than one turn may carry", () => {
    const describe = Array.from({ length: 17 }, (_, i) => `view.k${String(i)}`);
    expect(() =>
      parseAgentHttpResponse(response({ needs: { describe } }))
    ).toThrow(/needs.describe exceeds limit of 16/);
  });

  it("refuses more row windows than one turn may carry", () => {
    const read = Array.from({ length: 17 }, (_, i) => ({
      offset: i,
      limit: 1,
    }));
    expect(() => parseAgentHttpResponse(response({ needs: { read } }))).toThrow(
      /needs.read exceeds limit of 16/
    );
  });

  it("refuses a row window it cannot address", () => {
    expect(() =>
      parseAgentHttpResponse(
        response({ needs: { read: [{ offset: 0, limit: 1, scope: "all" }] } })
      )
    ).toThrow(/read.scope must be "visible", "page", or "full"/);
    expect(() =>
      parseAgentHttpResponse(
        response({ needs: { read: [{ offset: "0", limit: 1 }] } })
      )
    ).toThrow(/read.offset must be a finite number/);
    expect(() =>
      parseAgentHttpResponse(
        response({ needs: { read: [{ offset: 0, limit: Infinity }] } })
      )
    ).toThrow(/read.limit must be a finite number/);
  });

  it("defaults a window the model left open, and keeps what it named", () => {
    const parsed = parseAgentHttpResponse(
      response({
        needs: {
          describe: ["view.setPage"],
          read: [{ scope: "page", columns: ["name", 7] }],
        },
      })
    );
    expect(parsed.needs?.read?.[0]).toEqual({
      offset: 0,
      limit: 10,
      columns: ["name"],
      scope: "page",
    });
    expect(parsed.needs?.describe).toEqual(["view.setPage"]);
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
        actions: [
          { key: "view.setPage", args: { page: 2 }, idempotencyKey: "p2" },
        ],
        text: "Moved.",
        continueWithResults: true,
      },
      {
        schemaVersion: AGENT_SCHEMA_VERSION,
        needs: { read: [{ offset: 0, limit: 1 }] },
      },
      {
        schemaVersion: AGENT_SCHEMA_VERSION,
        actions: [
          { key: "view.setPage", args: { page: 3 }, idempotencyKey: "p3" },
        ],
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
