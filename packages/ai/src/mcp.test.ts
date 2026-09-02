import { describe, expect, it, vi } from "vitest";

import { AGENT_SCHEMA_VERSION } from "./keys";
import {
  executeMcpTool,
  mcpListChanged,
  toMcpResources,
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
