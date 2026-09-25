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

  it("drops custom capabilities when isEnabled returns false", () => {
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

  it("isolates custom capabilities between two sessions", () => {
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

const archiveGuide = {
  guide: "Archive an order through the host's own write path.",
  input: {
    type: "object",
    additionalProperties: false,
    properties: { rowKey: { type: "string" } },
    required: ["rowKey"],
  },
  output: {
    type: "object",
    additionalProperties: false,
    properties: { archived: { type: "string" } },
    required: ["archived"],
  },
} as const;

/**
 * A custom write whose handler never consults `onApprove`. Governance must
 * come from the session, not from the handler remembering to ask.
 */
function archiveCapability(
  handler: (rowKey: string) => void,
  patch: Partial<AgentCapabilityDefinition> = {}
): AgentCapabilityDefinition {
  return {
    key: "demo.archive",
    summary: "Archive an order.",
    guide: archiveGuide,
    kind: "write",
    isEnabled: () => true,
    execute: (_context, args) => {
      const rowKey = (args as { rowKey: string }).rowKey;
      handler(rowKey);
      return { archived: rowKey };
    },
    ...patch,
  };
}

describe("custom write governance", () => {
  it("returns pending and calls no handler when approval has no host chrome", async () => {
    const handler = vi.fn();
    const session = createAgentSession({
      observe: () => observation({ approval: "writes", commit: "immediate" }),
      apply: {},
      capabilities: [archiveCapability(handler)],
    });
    const result = await session.execute(
      "demo.archive",
      { rowKey: "r1" },
      1,
      "arch-pending"
    );
    expect(result.ok).toBe(true);
    expect((result.result as { approval: string }).approval).toBe("pending");
    expect(handler).not.toHaveBeenCalled();
  });

  it("calls no handler when the approver denies", async () => {
    const handler = vi.fn();
    const session = createAgentSession({
      observe: () => observation({ approval: "writes", commit: "immediate" }),
      apply: {},
      onApprove: () => Promise.resolve(false),
      capabilities: [archiveCapability(handler)],
    });
    const result = await session.execute(
      "demo.archive",
      { rowKey: "r1" },
      1,
      "arch-denied"
    );
    expect((result.result as { approval: string }).approval).toBe("rejected");
    expect(handler).not.toHaveBeenCalled();
  });

  it("executes exactly once when the approver allows", async () => {
    const handler = vi.fn();
    const onApprove = vi.fn().mockResolvedValue(true);
    const session = createAgentSession({
      observe: () => observation({ approval: "writes", commit: "immediate" }),
      apply: {},
      onApprove,
      capabilities: [archiveCapability(handler)],
    });
    const result = await session.execute(
      "demo.archive",
      { rowKey: "r1" },
      1,
      "arch-ok"
    );
    expect(result.ok).toBe(true);
    expect(result.result).toEqual({ archived: "r1" });
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("cancelling while approval is awaited prevents execution", async () => {
    const handler = vi.fn();
    const controller = new AbortController();
    const session = createAgentSession({
      observe: () => observation({ approval: "writes", commit: "immediate" }),
      apply: {},
      onApprove: () => new Promise<boolean>(() => undefined),
      capabilities: [archiveCapability(handler)],
    });
    const pending = session.execute(
      "demo.archive",
      { rowKey: "r1" },
      1,
      "arch-cancel",
      controller.signal
    );
    controller.abort();
    const result = await pending;
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("cancelled");
    expect(handler).not.toHaveBeenCalled();
  });

  it("revoking the write policy while approval is awaited prevents execution", async () => {
    const handler = vi.fn();
    let policy: "allow" | "deny" = "allow";
    let release!: (allowed: boolean) => void;
    const gate = new Promise<boolean>((resolve) => {
      release = resolve;
    });
    const session = createAgentSession({
      observe: () =>
        observation({
          approval: "writes",
          commit: "immediate",
          writePolicy: policy,
        }),
      apply: {},
      onApprove: () => gate,
      capabilities: [archiveCapability(handler)],
    });
    const pending = session.execute(
      "demo.archive",
      { rowKey: "r1" },
      1,
      "arch-revoked"
    );
    policy = "deny";
    release(true);
    const result = await pending;
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("write-denied");
    expect(handler).not.toHaveBeenCalled();
  });

  it("rejects stage mode before the handler runs when staging is unsupported", async () => {
    const handler = vi.fn();
    const session = createAgentSession({
      observe: () => observation({ approval: "never", commit: "stage" }),
      apply: {},
      capabilities: [archiveCapability(handler)],
    });
    const result = await session.execute(
      "demo.archive",
      { rowKey: "r1" },
      1,
      "arch-stage"
    );
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("commit-incompatible");
    expect(handler).not.toHaveBeenCalled();
  });

  it("runs a staging-capable custom write under commit: stage", async () => {
    const handler = vi.fn();
    const session = createAgentSession({
      observe: () => observation({ approval: "never", commit: "stage" }),
      apply: {},
      capabilities: [archiveCapability(handler, { staging: "supported" })],
    });
    const result = await session.execute(
      "demo.archive",
      { rowKey: "r1" },
      1,
      "arch-stage-ok"
    );
    expect(result.ok).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("treats a destructive custom capability as destructive under that policy", async () => {
    const handler = vi.fn();
    const session = createAgentSession({
      observe: () =>
        observation({ approval: "destructive", commit: "immediate" }),
      apply: {},
      capabilities: [archiveCapability(handler, { kind: "destructive" })],
    });
    const result = await session.execute(
      "demo.archive",
      { rowKey: "r1" },
      1,
      "arch-destructive"
    );
    expect((result.result as { approval: string }).approval).toBe("pending");
    expect(handler).not.toHaveBeenCalled();
  });

  it("does not impose write approval on a custom view capability", async () => {
    const ran = vi.fn();
    const session = createAgentSession({
      observe: () => observation({ approval: "writes", commit: "immediate" }),
      apply: {},
      capabilities: [
        {
          key: "demo.ping",
          summary: "Ping the host.",
          guide: echoGuide,
          kind: "view",
          isEnabled: () => true,
          execute: () => {
            ran();
            return { echo: "pong" };
          },
        },
      ],
    });
    const result = await session.execute(
      "demo.ping",
      { label: "x" },
      1,
      "ping"
    );
    expect(result.ok).toBe(true);
    expect(ran).toHaveBeenCalledTimes(1);
  });

  it("keeps two live sessions' governance independent", async () => {
    const handler = vi.fn();
    const governed = createAgentSession({
      observe: () => observation({ approval: "writes", commit: "immediate" }),
      apply: {},
      capabilities: [archiveCapability(handler)],
    });
    // Creating a second session must not rebind the first session's registry.
    const other = createAgentSession({
      observe: () => observation({ approval: "never", commit: "immediate" }),
      apply: {},
    });
    expect(other.catalog().map((entry) => entry.key)).not.toContain(
      "demo.archive"
    );
    const result = await governed.execute(
      "demo.archive",
      { rowKey: "r1" },
      1,
      "arch-isolated"
    );
    expect((result.result as { approval: string }).approval).toBe("pending");
    expect(handler).not.toHaveBeenCalled();
  });
});
