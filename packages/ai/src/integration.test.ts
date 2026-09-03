import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

import { executeEnvelope, parseEnvelope } from "./envelope";
import { executeJsonTool, toJsonTools } from "./json";
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
    featureIds: [],
    columns: [
      {
        id: "team",
        label: "Team",
        type: "string",
        readable: true,
        writable: false,
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

describe("live-table catalog omission", () => {
  it("does not advertise editing, grouping or pivoting when only filters and pagination are wired", () => {
    const session = createAgentSession({
      observe: () =>
        observation({
          featureIds: ["filters"],
          hasFilters: true,
          hasPagination: true,
        }),
      apply: { setFilters: vi.fn(), setPage: vi.fn() },
    });
    const keys = session.catalog().map((entry) => entry.key);
    expect(keys).toContain("view.setFilters");
    expect(keys).toContain("view.setPage");
    expect(keys).not.toContain("edit.cells");
    expect(keys).not.toContain("view.setGroupBy");
    expect(keys).not.toContain("rows.reorder");
    expect(keys).not.toContain("rows.add");
    expect(keys).not.toContain("rows.delete");
    expect(keys.join(" ")).not.toMatch(/pivot/i);
  });
});

describe("deferred catalog → describe → execute", () => {
  it("keeps schemas off the compact catalog until describe runs", async () => {
    const setFilters = vi.fn();
    const session = createAgentSession({
      observe: () =>
        observation({
          featureIds: ["filters"],
          hasFilters: true,
        }),
      apply: { setFilters },
    });
    const catalog = session.catalog();
    expect(catalog[0]).not.toHaveProperty("input");
    expect(catalog[0]?.summary).toBeTruthy();
    const guide = session.describe("view.setFilters");
    expect(guide.input.properties).toBeDefined();
    const result = await session.execute(
      "view.setFilters",
      { filters: { team: ["Core"] } },
      1,
      "deferred-filter"
    );
    expect(result.ok).toBe(true);
    expect(setFilters).toHaveBeenCalledWith({ team: ["Core"] });
  });
});

describe("custom frontend bridge", () => {
  it("maps an arbitrary agent action onto session.execute", async () => {
    const setPage = vi.fn();
    const session = createAgentSession({
      observe: () => observation(),
      apply: { setPage },
    });
    const agentSaid = { name: "view.setPage", arguments: { page: 3 } };
    const result = await session.execute(
      agentSaid.name,
      agentSaid.arguments,
      session.manifest().viewRevision,
      "custom-bridge-1"
    );
    expect(result.ok).toBe(true);
    expect(setPage).toHaveBeenCalledWith(3);
  });
});

describe("envelope without a result round trip", () => {
  it("executes and stops at application UI — no model reply is required", async () => {
    const replyToModel = vi.fn();
    const setSearch = vi.fn();
    const session = createAgentSession({
      observe: () => observation({ hasSearch: true }),
      apply: { setSearch },
    });
    const envelope = parseEnvelope({
      schemaVersion: "adapttable.agent.v1",
      tableId: "orders",
      key: "view.setSearch",
      args: { query: "Core" },
      expectedRevision: 1,
      idempotencyKey: "one-call-search",
    });
    const result = await executeEnvelope(session, envelope);
    expect(result.ok).toBe(true);
    expect(setSearch).toHaveBeenCalledWith("Core");
    expect(replyToModel).not.toHaveBeenCalled();
  });
});

describe("optional JSON helpers stay framework-free", () => {
  it("lets any runtime consume JSON tools without a model SDK", async () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: { setPage: vi.fn() },
    });
    const tools = toJsonTools(session);
    expect(tools.some((tool) => tool.name === "view.setPage")).toBe(true);
    const result = await executeJsonTool(session, {
      name: "view.setPage",
      arguments: { page: 2 },
      expectedRevision: 1,
      idempotencyKey: "json-page",
    });
    expect(result.ok).toBe(true);
  });
});

describe("dependency boundaries", () => {
  it("keeps the provider-neutral root free of model and agent-framework SDKs", () => {
    const pkg = JSON.parse(
      readFileSync(
        join(dirname(fileURLToPath(import.meta.url)), "../package.json"),
        "utf8"
      )
    ) as {
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    for (const name of [
      "openai",
      "langchain",
      "@langchain/core",
      "@anthropic-ai/sdk",
      "@modelcontextprotocol/sdk",
    ]) {
      expect(pkg.dependencies ?? {}).not.toHaveProperty(name);
      expect(pkg.peerDependencies ?? {}).not.toHaveProperty(name);
    }
    expect(pkg.dependencies).toMatchObject({
      "@adapttable/core": "workspace:^",
    });
  });
});
