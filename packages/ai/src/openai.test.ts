import { describe, expect, it, vi } from "vitest";

import { AGENT_SCHEMA_VERSION } from "./keys";
import { executeOpenAITool, toOpenAITools } from "./openai";
import { createAgentSession } from "./session";
import type {
  AgentManifest,
  AgentObservation,
  AgentSession,
  CapabilityGuide,
} from "./types";

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

function manifest(): AgentManifest {
  return {
    schemaVersion: AGENT_SCHEMA_VERSION,
    tableId: "employees",
    viewRevision: 1,
    capabilities: [],
    columns: [],
    rowAddressing: { scope: "visible", key: "rowKey" },
    limits: { pageMax: 10 },
    policy: { write: "allow" },
    source: PAGE_ONLY,
  };
}

describe("toOpenAITools", () => {
  it("defaults to strict function tools in catalog order", () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: {},
    });
    const tools = toOpenAITools(session);
    expect(tools.every((tool) => tool.type === "function")).toBe(true);
    expect(tools.map((tool) => tool.function.name)).toEqual(
      session.catalog().map((entry) => entry.key)
    );
    expect(tools.every((tool) => tool.function.strict === true)).toBe(true);
    expect(
      tools.every(
        (tool) => tool.function.parameters.additionalProperties === false
      )
    ).toBe(true);
  });

  it("sets additionalProperties: false only when the schema omits it", () => {
    const guide: CapabilityGuide = {
      key: "view.setPage",
      schemaVersion: AGENT_SCHEMA_VERSION,
      guide: "page",
      input: {
        type: "object",
        properties: { page: { type: "integer" } },
        required: ["page"],
      },
      output: { type: "object" },
    };
    const session: AgentSession = {
      catalog: () => [{ key: "view.setPage", summary: "page" }],
      describe: () => guide,
      execute: vi.fn(),
      manifest,
    };
    const strict = toOpenAITools(session);
    expect(strict[0]?.function.parameters.additionalProperties).toBe(false);
    const loose = toOpenAITools(session, { strict: false });
    expect(loose[0]?.function.strict).toBeUndefined();
    expect(loose[0]?.function.parameters.additionalProperties).toBeUndefined();
  });

  it("returns only the portable trio when deferred", () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: {},
    });
    const tools = toOpenAITools(session, { deferred: true });
    expect(tools.map((tool) => tool.function.name)).toEqual([
      "catalog",
      "describe",
      "execute",
    ]);
  });
});

describe("executeOpenAITool", () => {
  it("parses JSON string arguments and object arguments", async () => {
    const apply = { setPage: vi.fn() };
    const session = createAgentSession({
      observe: () => observation(),
      apply,
    });
    const fromString = await executeOpenAITool(
      session,
      { function: { name: "view.setPage", arguments: '{"page":2}' } },
      1,
      "s"
    );
    expect(fromString.ok).toBe(true);
    const fromObject = await executeOpenAITool(
      session,
      {
        id: "call-1",
        function: { name: "view.setPage", arguments: { page: 3 } },
      },
      1,
      "o"
    );
    expect(fromObject.ok).toBe(true);
    expect(apply.setPage).toHaveBeenCalledWith(2);
    expect(apply.setPage).toHaveBeenCalledWith(3);
  });

  it("treats an empty argument string as {} and reports invalid JSON", async () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: {},
    });
    const empty = await executeOpenAITool(
      session,
      { function: { name: "columns.describe", arguments: "  " } },
      1,
      "empty"
    );
    expect(empty.ok).toBe(true);
    const bad = await executeOpenAITool(
      session,
      { function: { name: "view.setPage", arguments: "{not-json" } },
      1,
      "bad-json"
    );
    expect(bad.ok).toBe(false);
    expect(bad.error?.code).toBe("invalid-arguments");
  });

  it("dispatches the deferred trio onto catalog, describe and execute", async () => {
    const apply = { setPage: vi.fn() };
    const session = createAgentSession({
      observe: () => observation(),
      apply,
    });
    const listed = await executeOpenAITool(
      session,
      { function: { name: "catalog", arguments: {} } },
      1,
      "cat"
    );
    expect(listed.ok).toBe(true);
    expect(listed.result).toEqual(session.catalog());
    const guide = await executeOpenAITool(
      session,
      { function: { name: "describe", arguments: '{"key":"view.setPage"}' } },
      1,
      "desc"
    );
    expect(guide.ok).toBe(true);
    expect((guide.result as { key: string } | undefined)?.key).toBe(
      "view.setPage"
    );
    const ran = await executeOpenAITool(
      session,
      {
        function: {
          name: "execute",
          arguments: { key: "view.setPage", args: { page: 2 } },
        },
      },
      1,
      "ex"
    );
    expect(ran.ok).toBe(true);
    expect(apply.setPage).toHaveBeenCalledWith(2);
  });

  it("returns errors for a bad deferred describe or execute payload", async () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: {},
    });
    const noKey = await executeOpenAITool(
      session,
      { function: { name: "describe", arguments: {} } },
      1,
      "d0"
    );
    expect(noKey.error?.code).toBe("invalid-arguments");
    const unknown = await executeOpenAITool(
      session,
      { function: { name: "describe", arguments: { key: "nope" } } },
      1,
      "d1"
    );
    expect(unknown.error?.code).toBe("describe-failed");
    const executeNoKey = await executeOpenAITool(
      session,
      { function: { name: "execute", arguments: { args: {} } } },
      1,
      "e0"
    );
    expect(executeNoKey.error?.code).toBe("invalid-arguments");
    const executeNotObject = await executeOpenAITool(
      session,
      { function: { name: "execute", arguments: 4 } },
      1,
      "e1"
    );
    expect(executeNotObject.error?.code).toBe("invalid-arguments");
    const describeNotObject = await executeOpenAITool(
      session,
      { function: { name: "describe", arguments: 4 } },
      1,
      "d2"
    );
    expect(describeNotObject.error?.code).toBe("invalid-arguments");
  });
});
