import { describe, expect, it, vi } from "vitest";

import { createAgentSession } from "./session";
import type { AgentObservation, AgentSession } from "./types";
import {
  type ModelContextLike,
  registerWebMcpTools,
  type WebMcpTool,
} from "./webmcp";

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
    viewRevision: 3,
    featureIds: ["editing"],
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
    hasSearch: false,
    hasSort: false,
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

/** A table whose host wires paging, editing and a row window. */
function tableSession(
  observe: () => AgentObservation = () => observation(),
  apply: Parameters<typeof createAgentSession>[0]["apply"] = {}
): AgentSession {
  return createAgentSession({
    observe,
    apply: {
      setPage: () => undefined,
      editCells: () => undefined,
      readRows: () => ({
        offset: 0,
        limit: 1,
        redacted: [],
        rows: [{ rowKey: "r1", cells: { name: "Ada", ssn: "111-22-3333" } }],
      }),
      ...apply,
    },
  });
}

/** A tool surface the test can read back. */
function fakeContext(): {
  context: ModelContextLike;
  tools: Map<string, WebMcpTool>;
  removed: string[];
} {
  const tools = new Map<string, WebMcpTool>();
  const removed: string[] = [];
  return {
    tools,
    removed,
    context: {
      registerTool: (tool) => {
        tools.set(tool.name, tool);
        return () => {
          tools.delete(tool.name);
          removed.push(tool.name);
        };
      },
    },
  };
}

/** What a tool handed back, read out of its text content. */
function payload(result: {
  content: readonly { text: string }[];
}): Record<string, unknown> {
  return JSON.parse(result.content[0]?.text ?? "{}") as Record<string, unknown>;
}

describe("offering the table as tools", () => {
  it("registers one tool per permitted capability, namespaced by table", () => {
    const fake = fakeContext();
    const session = tableSession();
    const registration = registerWebMcpTools(session, {
      modelContext: fake.context,
    });

    expect(registration.active).toBe(true);
    expect(registration.names).toEqual(
      session.catalog().map((entry) => `adapttable.orders.${entry.key}`)
    );
    expect([...fake.tools.keys()]).toEqual(registration.names);
  });

  it("describes a tool from the short summary the contract already has", () => {
    const fake = fakeContext();
    registerWebMcpTools(tableSession(), { modelContext: fake.context });
    const tool = fake.tools.get("adapttable.orders.view.setPage");

    expect(tool?.description).toBe("Change the current page.");
    expect(tool?.inputSchema).toMatchObject({ type: "object" });
  });

  it("never offers a capability the host excluded", () => {
    const fake = fakeContext();
    const session = createAgentSession({
      observe: () => observation(),
      apply: { setPage: () => undefined, editCells: () => undefined },
      excludeCapabilities: ["edit.cells"],
    });
    registerWebMcpTools(session, { modelContext: fake.context });

    expect([...fake.tools.keys()]).not.toContain(
      "adapttable.orders.edit.cells"
    );
  });

  it("narrows to what the host chose to expose", () => {
    const fake = fakeContext();
    registerWebMcpTools(tableSession(), {
      modelContext: fake.context,
      exposedTo: ["view.setPage"],
    });

    expect([...fake.tools.keys()]).toEqual(["adapttable.orders.view.setPage"]);
  });

  it("cannot re-open an excluded capability by naming it", () => {
    const fake = fakeContext();
    const session = createAgentSession({
      observe: () => observation(),
      apply: { setPage: () => undefined, editCells: () => undefined },
      excludeCapabilities: ["edit.cells"],
    });
    registerWebMcpTools(session, {
      modelContext: fake.context,
      exposedTo: ["edit.cells", "view.setPage"],
    });

    // The exclusion list is the authority; `exposedTo` only ever narrows.
    expect([...fake.tools.keys()]).toEqual(["adapttable.orders.view.setPage"]);
  });

  it("registers nothing where the browser has no such surface", () => {
    const registration = registerWebMcpTools(tableSession());

    // Most browsers have none. A page that works without it must not fail.
    expect(registration.active).toBe(false);
    expect(registration.names).toEqual([]);
    expect(() => {
      registration.dispose();
    }).not.toThrow();
  });

  it("reports a policy refusal once instead of throwing into a render", () => {
    const onWarning = vi.fn();
    const registration = registerWebMcpTools(tableSession(), {
      onWarning,
      modelContext: {
        registerTool: () => {
          const error = new Error("model context is disallowed by policy");
          error.name = "NotAllowedError";
          throw error;
        },
      },
    });

    expect(registration.active).toBe(false);
    expect(onWarning).toHaveBeenCalledTimes(1);
    expect(onWarning.mock.calls[0]?.[0]).toMatchObject({
      code: "NotAllowedError",
      message: "model context is disallowed by policy",
    });
  });
});

describe("a contract that moves", () => {
  it("offers the capability a newly wired feature brought with it", () => {
    const fake = fakeContext();
    const state = { hasSearch: false };
    const session = tableSession(() =>
      observation({ hasSearch: state.hasSearch })
    );
    const first = registerWebMcpTools(session, { modelContext: fake.context });

    expect(first.names).not.toContain("adapttable.orders.view.setSearch");

    // A table whose capabilities moved is a different set of tools: the
    // binding disposes the registration and registers the new contract.
    state.hasSearch = true;
    first.dispose();
    const second = registerWebMcpTools(session, { modelContext: fake.context });

    expect(second.names).toContain("adapttable.orders.view.setSearch");
    expect([...fake.tools.keys()]).toEqual(second.names);
  });

  it("leaves nothing registered from the contract it replaced", () => {
    const fake = fakeContext();
    const state = { hasPagination: true };
    const session = tableSession(() =>
      observation({ hasPagination: state.hasPagination })
    );
    const first = registerWebMcpTools(session, { modelContext: fake.context });

    state.hasPagination = false;
    first.dispose();
    registerWebMcpTools(session, { modelContext: fake.context });

    expect([...fake.tools.keys()]).not.toContain(
      "adapttable.orders.view.setPage"
    );
  });
});

describe("what a host is told about a call", () => {
  it("marks a view capability read-only and a write consequential", () => {
    const fake = fakeContext();
    registerWebMcpTools(tableSession(), { modelContext: fake.context });

    expect(
      fake.tools.get("adapttable.orders.view.setPage")?.annotations
    ).toMatchObject({ readOnlyHint: true, consequentialHint: false });
    expect(
      fake.tools.get("adapttable.orders.edit.cells")?.annotations
    ).toMatchObject({ readOnlyHint: false, consequentialHint: true });
  });

  it("marks a destructive capability consequential too", () => {
    const fake = fakeContext();
    registerWebMcpTools(
      tableSession(() => observation({ hasDelete: true }), {
        deleteRows: () => undefined,
      }),
      { modelContext: fake.context }
    );

    expect(
      fake.tools.get("adapttable.orders.rows.delete")?.annotations
    ).toMatchObject({ readOnlyHint: false, consequentialHint: true });
  });

  it("marks every read as carrying untrusted content", () => {
    const fake = fakeContext();
    registerWebMcpTools(tableSession(), { modelContext: fake.context });

    // A row is somebody's data, and an agent reading one is reading input
    // from outside the system.
    expect(
      fake.tools.get("adapttable.orders.rows.read")?.annotations
        .untrustedContentHint
    ).toBe(true);
    expect(
      fake.tools.get("adapttable.orders.view.setPage")?.annotations
        .untrustedContentHint
    ).toBeUndefined();
  });
});

describe("calling a tool", () => {
  it("runs through the session and reports the receipt", async () => {
    const setPage = vi.fn();
    const fake = fakeContext();
    registerWebMcpTools(tableSession(undefined, { setPage }), {
      modelContext: fake.context,
    });

    const result = await fake.tools
      .get("adapttable.orders.view.setPage")
      ?.execute({ page: 2 });

    expect(setPage).toHaveBeenCalledWith(2);
    expect(result?.isError).toBeUndefined();
    expect(payload(result!)).toMatchObject({ ok: true, revision: 3 });
  });

  it("issues the replay identity itself, one per call", async () => {
    const executed: string[] = [];
    const fake = fakeContext();
    const session = tableSession();
    const execute = session.execute.bind(session);
    const spied: AgentSession = {
      ...session,
      execute: (key, args, revision, idempotencyKey, signal) => {
        executed.push(idempotencyKey);
        return execute(key, args, revision, idempotencyKey, signal);
      },
    };
    registerWebMcpTools(spied, { modelContext: fake.context });
    const tool = fake.tools.get("adapttable.orders.view.setPage");

    await tool?.execute({ page: 2 });
    await tool?.execute({ page: 2 });

    // The page issues the key, never the agent — so the same arguments twice
    // are two calls, not a replay of one.
    expect(executed).toHaveLength(2);
    expect(executed[0]).not.toBe(executed[1]);
    for (const key of executed) expect(key.startsWith("webmcp:")).toBe(true);
  });

  it("judges the call against the table as it is now", async () => {
    const state = { revision: 3 };
    const setPage = vi.fn();
    const fake = fakeContext();
    registerWebMcpTools(
      tableSession(() => observation({ viewRevision: state.revision }), {
        setPage,
      }),
      { modelContext: fake.context }
    );

    // The table moved after registration; the call is still judged current.
    state.revision = 9;
    const result = await fake.tools
      .get("adapttable.orders.view.setPage")
      ?.execute({ page: 2 });

    expect(result?.isError).toBeUndefined();
    expect(payload(result!)).toMatchObject({ revision: 9 });
    expect(setPage).toHaveBeenCalledWith(2);
  });

  it("hands a read back inside its provenance envelope", async () => {
    const fake = fakeContext();
    registerWebMcpTools(tableSession(), { modelContext: fake.context });

    const result = await fake.tools
      .get("adapttable.orders.rows.read")
      ?.execute({ offset: 0, limit: 1 });
    const body = payload(result!);

    expect(body).toMatchObject({
      source: "table-rows",
      untrusted: true,
      revision: 3,
    });
    expect(body.rows).toMatchObject({
      redacted: ["ssn"],
      rows: [{ rowKey: "r1", cells: { name: "Ada" } }],
    });
    // An unreadable column does not come back through a browser tool either.
    expect(JSON.stringify(body)).not.toContain("111-22-3333");
  });

  it("reports a refusal as an error rather than a success", async () => {
    const fake = fakeContext();
    registerWebMcpTools(tableSession(), { modelContext: fake.context });

    const result = await fake.tools
      .get("adapttable.orders.view.setPage")
      ?.execute({ page: "not a page" });

    expect(result?.isError).toBe(true);
    expect(payload(result!).error).toMatchObject({
      code: "invalid-arguments",
    });
  });

  it("refuses once the registration is gone", async () => {
    const setPage = vi.fn();
    const fake = fakeContext();
    const registration = registerWebMcpTools(
      tableSession(undefined, { setPage }),
      { modelContext: fake.context }
    );
    const tool = fake.tools.get("adapttable.orders.view.setPage");
    registration.dispose();

    const result = await tool?.execute({ page: 2 });

    expect(result?.isError).toBe(true);
    expect(setPage).not.toHaveBeenCalled();
  });
});

describe("disposal", () => {
  it("removes what it registered, and is idempotent", () => {
    const fake = fakeContext();
    const registration = registerWebMcpTools(tableSession(), {
      modelContext: fake.context,
    });
    const count = registration.names.length;

    registration.dispose();

    expect(count).toBeGreaterThan(0);
    expect(fake.removed).toHaveLength(count);
    expect(fake.tools.size).toBe(0);
    expect(() => {
      registration.dispose();
    }).not.toThrow();
    expect(fake.removed).toHaveLength(count);
  });

  it("also calls an unregister the surface offers", () => {
    const unregisterTool = vi.fn();
    const registration = registerWebMcpTools(tableSession(), {
      modelContext: {
        registerTool: () => undefined,
        unregisterTool,
      },
    });

    registration.dispose();

    expect(unregisterTool).toHaveBeenCalledTimes(registration.names.length);
    expect(unregisterTool).toHaveBeenCalledWith(
      "adapttable.orders.view.setPage"
    );
  });
});
