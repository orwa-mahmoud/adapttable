import { describe, expect, it, vi } from "vitest";

import { AGENT_SCHEMA_VERSION } from "./keys";
import {
  executeMcpTool,
  mcpListChanged,
  mcpToolResult,
  toMcpResourceList,
  toMcpResources,
  toMcpToolList,
  toMcpTools,
} from "./mcp";
import { createAgentSession } from "./session";
import type { AgentManifest, AgentObservation } from "./types";

const PAGE_ONLY = {
  fullDataset: false,
  grouping: false as const,
  selectAcrossPages: false,
  exportScope: "page" as const,
  totalCount: "loaded" as const,
};

function observation(patch: Partial<AgentObservation> = {}): AgentObservation {
  return {
    tableId: "employees",
    viewRevision: 1,
    featureIds: [],
    columns: [
      {
        id: "salary",
        label: "Salary",
        type: "number",
        readable: true,
        writable: true,
        sortable: true,
      },
    ],
    source: PAGE_ONLY,
    writePolicy: "allow",
    hasPagination: true,
    hasSearch: true,
    hasSort: true,
    hasFilters: false,
    hasExport: false,
    hasEdit: false,
    hasReorder: false,
    page: 1,
    limit: 10,
    search: "",
    pageMax: 50,
    rowAddressScope: "visible",
    ...patch,
  };
}

function stubManifest(
  capabilities: AgentManifest["capabilities"]
): AgentManifest {
  return {
    schemaVersion: AGENT_SCHEMA_VERSION,
    tableId: "employees",
    viewRevision: 1,
    capabilities,
    columns: [],
    rowAddressing: { scope: "visible", key: "rowKey" },
    limits: { pageMax: 10, readMax: 50 },
    policy: { write: "allow", approval: "writes", commit: "stage" },
    source: PAGE_ONLY,
  };
}

describe("toMcpTools", () => {
  it("lists enabled tools in catalog order with describe() schemas", () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: {},
    });
    const tools = toMcpTools(session);
    expect(tools.map((tool) => tool.name)).toEqual(
      session.catalog().map((entry) => entry.key)
    );
    const page = tools.find((tool) => tool.name === "view.setPage");
    expect(page?.inputSchema).toEqual(session.describe("view.setPage").input);
    expect(page?.description).toBe(session.describe("view.setPage").guide);
  });
});

describe("toMcpResources", () => {
  it("exposes one guide resource per enabled capability", () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: {},
    });
    const resources = toMcpResources(session);
    expect(resources.map((resource) => resource.name)).toEqual(
      session.catalog().map((entry) => entry.key)
    );
    const page = resources.find((resource) => resource.name === "view.setPage");
    expect(page?.uri).toBe(
      "adapttable://table/employees/capability/view.setPage"
    );
    expect(page?.mimeType).toBe("application/json");
    expect(JSON.parse(page?.text ?? "{}")).toEqual(
      session.describe("view.setPage")
    );
  });
});

describe("mcpListChanged", () => {
  it("is true when capabilities grow, shrink or reorder", () => {
    const base = stubManifest(["columns.describe", "view.describe"]);
    expect(mcpListChanged(base, base)).toBe(false);
    expect(
      mcpListChanged(
        base,
        stubManifest(["columns.describe", "view.describe", "edit.cells"])
      )
    ).toBe(true);
    expect(
      mcpListChanged(stubManifest(["edit.cells", "view.describe"]), base)
    ).toBe(true);
    expect(
      mcpListChanged(
        stubManifest(["columns.describe", "view.describe"]),
        stubManifest(["view.describe", "columns.describe"])
      )
    ).toBe(true);
  });
});

describe("executeMcpTool", () => {
  it("forwards the capability key to session.execute", async () => {
    const apply = { setPage: vi.fn() };
    const session = createAgentSession({
      observe: () => observation(),
      apply,
    });
    const result = await executeMcpTool(
      session,
      "view.setPage",
      { page: 2 },
      1,
      "mcp-page"
    );
    expect(result.ok).toBe(true);
    expect(apply.setPage).toHaveBeenCalledWith(2);
  });
});

/** Everything wired, so every annotation has a tool to sit on. */
function fullTable() {
  return createAgentSession({
    observe: () =>
      observation({
        featureIds: ["editing", "export-csv"],
        hasEdit: true,
        hasExport: true,
        hasAdd: true,
        hasDelete: true,
        approval: "never",
      }),
    apply: {
      setPage: vi.fn(),
      editCells: vi.fn(),
      addRows: vi.fn(),
      deleteRows: vi.fn(),
      runExport: vi.fn(),
      readRows: () => ({
        offset: 0,
        limit: 1,
        redacted: [],
        rows: [{ rowKey: "r1", cells: { salary: 1 } }],
      }),
    },
  });
}

function annotationsOf(name: string) {
  return toMcpTools(fullTable()).find((tool) => tool.name === name)
    ?.annotations;
}

describe("what a host is told about a call", () => {
  it("marks a view and a read as changing nothing", () => {
    expect(annotationsOf("view.setPage")).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
    expect(annotationsOf("rows.read")?.readOnlyHint).toBe(true);
  });

  it("marks only a destructive capability destructive, and says so for the rest", () => {
    expect(annotationsOf("rows.delete")?.destructiveHint).toBe(true);
    for (const name of ["edit.cells", "rows.add", "view.setPage"]) {
      // Explicitly false, not absent: a host reading an absent hint has to
      // guess, and the cautious guess is the expensive one.
      expect(annotationsOf(name)?.destructiveHint).toBe(false);
    }
  });

  it("marks a repeat safe only where it lands in the same place", () => {
    // Assignment: the same page, the same cell value, the same deleted keys.
    expect(annotationsOf("view.setPage")?.idempotentHint).toBe(true);
    expect(annotationsOf("edit.cells")?.idempotentHint).toBe(true);
    expect(annotationsOf("rows.delete")?.idempotentHint).toBe(true);
    // Accumulation: another row, another file.
    expect(annotationsOf("rows.add")?.idempotentHint).toBe(false);
    expect(annotationsOf("export.run")?.idempotentHint).toBe(false);
  });

  it("never claims a capability reaches outside this table", () => {
    for (const tool of toMcpTools(fullTable())) {
      expect(tool.annotations.openWorldHint).toBe(false);
    }
  });
});

describe("caching a list", () => {
  it("stamps a list with the contract it describes", () => {
    const session = fullTable();
    const tools = toMcpToolList(session);

    expect(tools.tools).toEqual(toMcpTools(session));
    expect(tools._meta.cacheScope).toMatch(
      /^adapttable\.contract\.[0-9a-f]{8}$/
    );
    expect(tools._meta.ttlMs).toBeGreaterThan(0);
    expect(toMcpResourceList(session)._meta).toEqual(tools._meta);
  });

  it("stamps a table whose capabilities moved differently", () => {
    const before = createAgentSession({
      observe: () => observation(),
      apply: {},
    });

    expect(toMcpToolList(before)._meta.cacheScope).not.toBe(
      toMcpToolList(fullTable())._meta.cacheScope
    );
  });
});

describe("mcpToolResult", () => {
  it("reports a receipt for anything that is not row data", async () => {
    const session = fullTable();
    const result = mcpToolResult(
      await executeMcpTool(session, "view.setPage", { page: 2 }, 1, "k1")
    );

    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0]?.text ?? "{}")).toMatchObject({
      ok: true,
    });
  });

  it("keeps the provenance envelope the session put on rows", async () => {
    const session = fullTable();
    const result = mcpToolResult(
      await executeMcpTool(
        session,
        "rows.read",
        { offset: 0, limit: 1 },
        1,
        "k2"
      )
    );

    // Rows are somebody's data on this path too, and the label is what says so.
    expect(JSON.parse(result.content[0]?.text ?? "{}")).toMatchObject({
      source: "table-rows",
      untrusted: true,
    });
  });

  it("marks a refusal as an error and names it", async () => {
    const session = fullTable();
    const result = mcpToolResult(
      await executeMcpTool(session, "view.setPage", { page: "no" }, 1, "k3")
    );

    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0]?.text ?? "{}").error).toMatchObject({
      code: "invalid-arguments",
    });
  });
});
