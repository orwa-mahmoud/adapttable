import { describe, expect, it, vi } from "vitest";

import {
  executeEnvelope,
  executeJsonTool,
  parseEnvelope,
  toJsonTools,
} from "./json";
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
    tableId: "employees",
    viewRevision: 1,
    featureIds: [],
    columns: [
      {
        id: "name",
        label: "Name",
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

describe("toJsonTools", () => {
  it("emits catalog keys in catalog order with describe() schemas", () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: {},
    });
    const tools = toJsonTools(session);
    const keys = session.catalog().map((entry) => entry.key);
    expect(tools.map((tool) => tool.name)).toEqual(keys);
    for (const tool of tools) {
      const guide = session.describe(tool.name);
      expect(tool.description).toBe(guide.guide);
      expect(tool.parameters).toEqual(guide.input);
    }
    expect(tools.some((tool) => tool.name === "view.setPage")).toBe(true);
    expect(tools.some((tool) => tool.name === "edit.cells")).toBe(false);
  });
});

describe("executeJsonTool", () => {
  it("forwards to session.execute without rewriting the key", async () => {
    const apply = { setPage: vi.fn() };
    const session = createAgentSession({
      observe: () => observation(),
      apply,
    });
    const result = await executeJsonTool(session, {
      name: "view.setPage",
      arguments: { page: 3 },
      expectedRevision: 1,
      idempotencyKey: "p3",
    });
    expect(result.ok).toBe(true);
    expect(apply.setPage).toHaveBeenCalledWith(3);
  });
});

describe("json envelope re-exports", () => {
  it("parseEnvelope and executeEnvelope stay the same functions", async () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: { setPage: vi.fn() },
    });
    const envelope = parseEnvelope({
      schemaVersion: AGENT_SCHEMA_VERSION,
      tableId: "employees",
      key: "view.setPage",
      args: { page: 2 },
      expectedRevision: 1,
      idempotencyKey: "via-json",
    });
    const result = await executeEnvelope(session, envelope);
    expect(result.ok).toBe(true);
  });
});
