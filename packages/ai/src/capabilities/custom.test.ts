import { describe, expect, it, vi } from "vitest";

import { openAiToolNameMap } from "../capabilities/registry";
import { executeJsonTool, toJsonTools } from "../json";
import { executeMcpTool, toMcpTools } from "../mcp";
import { executeOpenAITool, toOpenAITools } from "../openai";
import { createAgentSession } from "../session";
import type { AgentCapabilityDefinition, AgentObservation } from "../types";

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
    columns: [],
    source: PAGE_ONLY,
    writePolicy: "allow",
    hasPagination: true,
    hasSearch: false,
    hasSort: false,
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

const echoGuide = {
  guide: "Return a host-provided label for diagnostics.",
  input: {
    type: "object",
    additionalProperties: false,
    properties: { label: { type: "string" } },
    required: ["label"],
  },
  output: {
    type: "object",
    additionalProperties: false,
    properties: { echo: { type: "string" } },
    required: ["echo"],
  },
} as const;

function echoCapability(enabled = true): AgentCapabilityDefinition {
  return {
    key: "demo.echo",
    summary: "Echo a label through the host.",
    guide: echoGuide,
    kind: "read",
    isEnabled: () => enabled,
    execute: (_context, args) => {
      const label = (args as { label?: string }).label ?? "";
      return { echo: label };
    },
  };
}

describe("custom capabilities", () => {
  it("registers, catalogs, describes and executes a custom capability", async () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: {},
      capabilities: [echoCapability()],
    });
    expect(session.catalog().map((entry) => entry.key)).toContain("demo.echo");
    const guide = session.describe("demo.echo");
    expect(guide.input.required).toEqual(["label"]);
    const result = await session.execute(
      "demo.echo",
      { label: "ready" },
      1,
      "echo-1"
    );
    expect(result.ok).toBe(true);
    expect(result.result).toEqual({ echo: "ready" });
  });

  it("drops custom capabilities when isEnabled returns false", async () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: {},
      capabilities: [echoCapability(false)],
    });
    expect(session.catalog().map((entry) => entry.key)).not.toContain(
      "demo.echo"
    );
    expect(() => session.describe("demo.echo")).toThrow(/not wired/);
  });

  it("rejects duplicate capability keys at registration time", () => {
    expect(() =>
      createAgentSession({
        observe: () => observation(),
        apply: {},
        capabilities: [echoCapability(), echoCapability()],
      })
    ).toThrow(/duplicate capability/);
  });

  it("isolates custom capabilities between two sessions", async () => {
    const left = createAgentSession({
      observe: () => observation({ tableId: "left" }),
      apply: {},
      capabilities: [echoCapability()],
    });
    const right = createAgentSession({
      observe: () => observation({ tableId: "right" }),
      apply: {},
    });
    expect(left.catalog().map((entry) => entry.key)).toContain("demo.echo");
    expect(right.catalog().map((entry) => entry.key)).not.toContain(
      "demo.echo"
    );
  });

  it("surfaces custom capabilities through JSON, OpenAI and MCP helpers", async () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: {},
      capabilities: [echoCapability()],
    });
    expect(toJsonTools(session).some((tool) => tool.name === "demo.echo")).toBe(
      true
    );
    expect(
      toOpenAITools(session).some((tool) => tool.function.name === "demo_echo")
    ).toBe(true);
    expect(toMcpTools(session).some((tool) => tool.name === "demo.echo")).toBe(
      true
    );
    const json = await executeJsonTool(session, {
      name: "demo.echo",
      arguments: { label: "json" },
      expectedRevision: 1,
      idempotencyKey: "json-echo",
    });
    expect(json.result).toEqual({ echo: "json" });
    const openai = await executeOpenAITool(
      session,
      { function: { name: "demo_echo", arguments: { label: "openai" } } },
      1,
      "openai-echo"
    );
    expect(openai.result).toEqual({ echo: "openai" });
    const mcp = await executeMcpTool(
      session,
      "demo.echo",
      { label: "mcp" },
      1,
      "mcp-echo"
    );
    expect(mcp.result).toEqual({ echo: "mcp" });
  });

  it("detects OpenAI dot/underscore name collisions", () => {
    expect(() => openAiToolNameMap(["demo.echo", "demo_echo"])).toThrow(
      /collision/
    );
  });
});

describe("custom write capability", () => {
  it("honours governed replay and idempotency for a custom view mutation", async () => {
    const setFlag = vi.fn();
    const flagCapability: AgentCapabilityDefinition = {
      key: "demo.setFlag",
      summary: "Toggle a host flag.",
      kind: "view",
      guide: {
        guide: "Set a boolean host flag.",
        input: {
          type: "object",
          additionalProperties: false,
          properties: { on: { type: "boolean" } },
          required: ["on"],
        },
        output: {
          type: "object",
          additionalProperties: false,
          properties: { ok: { type: "boolean", const: true } },
          required: ["ok"],
        },
      },
      isEnabled: () => true,
      execute: (_context, args) => {
        setFlag((args as { on: boolean }).on);
        return { ok: true };
      },
    };
    const session = createAgentSession({
      observe: () => observation(),
      apply: {},
      capabilities: [flagCapability],
    });
    await session.execute("demo.setFlag", { on: true }, 1, "flag");
    await session.execute("demo.setFlag", { on: false }, 1, "flag");
    expect(setFlag).toHaveBeenCalledTimes(1);
    expect(setFlag).toHaveBeenCalledWith(true);
  });
});
