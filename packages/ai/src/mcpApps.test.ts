import { describe, expect, it, vi } from "vitest";

import { toMcpTools } from "./mcp";
import {
  approveThroughHost,
  askThroughHost,
  createMcpAppBridge,
  MCP_APP_MIME,
  type McpAppChannel,
  mcpAppCsp,
  mcpAppResource,
  mcpAppToolMeta,
  mcpAppUri,
  withMcpAppMeta,
} from "./mcpApps";
import { createAgentSession } from "./session";
import type { AgentObservation, AgentSession } from "./types";

const HOST = "https://host.example";

const PAGE_ONLY = {
  fullDataset: false,
  grouping: false as const,
  selectAcrossPages: false,
  exportScope: "page" as const,
  totalCount: "loaded" as const,
};

function tableSession(): AgentSession {
  const observation = (): AgentObservation => ({
    tableId: "orders",
    viewRevision: 1,
    featureIds: [],
    columns: [
      {
        id: "total",
        label: "Total",
        type: "number",
        readable: true,
        writable: false,
        sortable: true,
      },
    ],
    source: PAGE_ONLY,
    writePolicy: "deny",
    hasPagination: true,
    hasSearch: false,
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
  });
  return createAgentSession({
    observe: observation,
    apply: { setPage: () => undefined, setSort: () => undefined },
  });
}

/** A host the view can talk to, with everything it said recorded. */
function fakeHost(
  answer: (message: Record<string, unknown>) => unknown = () => ({})
): {
  channel: McpAppChannel;
  sent: Record<string, unknown>[];
  origins: string[];
  push: (message: unknown, origin?: string) => void;
} {
  const sent: Record<string, unknown>[] = [];
  const origins: string[] = [];
  const listeners = new Set<(message: unknown, origin: string) => void>();
  const push = (message: unknown, origin = HOST): void => {
    for (const listener of listeners) listener(message, origin);
  };
  return {
    sent,
    origins,
    push,
    channel: {
      post: (message, targetOrigin) => {
        const record = message as Record<string, unknown>;
        sent.push(record);
        origins.push(targetOrigin);
        const result = answer(record);
        if (result === undefined) return;
        queueMicrotask(() => {
          push({ jsonrpc: "2.0", id: record.id, result });
        });
      },
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
  };
}

describe("publishing the view", () => {
  it("names one resource per table, as an app view", () => {
    const resource = mcpAppResource(tableSession(), {
      src: "https://view.example/table/",
    });

    expect(resource.uri).toBe("ui://adapttable/table/orders");
    expect(resource.uri).toBe(mcpAppUri("orders"));
    expect(resource.mimeType).toBe(MCP_APP_MIME);
    expect(resource.uriTemplate).toBe("https://view.example/table/");
    expect(resource.text).toBeUndefined();
  });

  it("carries the bundle when the server ships one", () => {
    const resource = mcpAppResource(tableSession(), {
      html: "<!doctype html><title>t</title>",
      preferredSize: { width: 720, height: 480 },
    });

    expect(resource.text).toBe("<!doctype html><title>t</title>");
    expect(resource._meta["ui/preferredSize"]).toEqual({
      width: 720,
      height: 480,
    });
  });

  it("refuses a resource that names no view", () => {
    expect(() => mcpAppResource(tableSession(), {})).toThrow(/html or src/);
  });

  it("builds the policy from what the host declared, and nothing else", () => {
    const csp = mcpAppCsp({
      connectDomains: ["https://api.example"],
      resourceDomains: ["https://cdn.example"],
    });

    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("connect-src 'self' https://api.example");
    expect(csp).toContain("img-src 'self' https://cdn.example data:");
    expect(csp).toContain("form-action 'none'");
    // A domain nobody declared is not in the policy, so the browser refuses it.
    expect(csp).not.toContain("https://elsewhere.example");
  });

  it("closes the policy completely when nothing was declared", () => {
    const csp = mcpAppCsp();

    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toMatch(/connect-src[^;]*https/);
  });

  it("points every tool at the view without losing its own meta", () => {
    const session = tableSession();
    const tools = toMcpTools(session).map((tool) => ({
      ...tool,
      _meta: { "vendor/x": 1 },
    }));

    const pointed = withMcpAppMeta(tools, session, {
      preferredSize: { width: 640 },
    });

    expect(pointed[0]?._meta).toEqual({
      "vendor/x": 1,
      ui: {
        resourceUri: "ui://adapttable/table/orders",
        preferredSize: { width: 640 },
      },
    });
    expect(mcpAppToolMeta(session)).toEqual({
      ui: { resourceUri: "ui://adapttable/table/orders" },
    });
  });
});

describe("the view's side of the handshake", () => {
  it("refuses to start without the host's exact origin", () => {
    expect(() => createMcpAppBridge({ hostOrigin: "" })).toThrow(/origin/);
    expect(() => createMcpAppBridge({ hostOrigin: "*" })).toThrow(/broadcast/);
  });

  it("initializes and reports what the host advertised", async () => {
    const host = fakeHost(() => ({ capabilities: { elicitation: true } }));
    const bridge = createMcpAppBridge({
      hostOrigin: HOST,
      channel: host.channel,
    });

    expect(bridge.capabilities()).toBeUndefined();
    const advertised = await bridge.initialize();

    expect(advertised).toEqual({ elicitation: true });
    expect(bridge.capabilities()).toEqual({ elicitation: true });
    expect(host.sent[0]).toMatchObject({
      jsonrpc: "2.0",
      method: "ui/initialize",
    });
    // Posted to the host and to nothing else.
    expect(host.origins).toEqual([HOST]);
  });

  it("sends a reader action as tools/call and returns what came back", async () => {
    const host = fakeHost(() => ({
      content: [{ type: "text", text: '{"ok":true}' }],
    }));
    const bridge = createMcpAppBridge({
      hostOrigin: HOST,
      channel: host.channel,
    });

    const result = await bridge.callTool("view.setSort", {
      key: "total",
      dir: "desc",
    });

    expect(host.sent[0]).toMatchObject({
      method: "tools/call",
      params: {
        name: "view.setSort",
        arguments: { key: "total", dir: "desc" },
      },
    });
    expect(result.content[0]?.text).toBe('{"ok":true}');
  });

  it("reports a refusal as a rejection rather than a result", async () => {
    const host = fakeHost(() => undefined);
    const bridge = createMcpAppBridge({
      hostOrigin: HOST,
      channel: host.channel,
    });
    const call = bridge.callTool("edit.cells", {});
    host.push({
      jsonrpc: "2.0",
      id: host.sent[0]?.id,
      error: { code: -32_000, message: "this table does not offer edit.cells" },
    });

    await expect(call).rejects.toThrow(/does not offer/);
  });

  it("hands a tool the host is running to the view as it happens", () => {
    const onToolInput = vi.fn();
    const onToolResult = vi.fn();
    const host = fakeHost();
    createMcpAppBridge({
      hostOrigin: HOST,
      channel: host.channel,
      onToolInput,
      onToolResult,
    });

    host.push({
      jsonrpc: "2.0",
      method: "ui/notifications/tool-input",
      params: {
        toolCallId: "c1",
        toolName: "view.setPage",
        input: { page: 2 },
      },
    });
    host.push({
      jsonrpc: "2.0",
      method: "ui/notifications/tool-result",
      params: {
        toolCallId: "c1",
        toolName: "view.setPage",
        result: { ok: true },
      },
    });

    expect(onToolInput).toHaveBeenCalledWith({
      toolCallId: "c1",
      toolName: "view.setPage",
      input: { page: 2 },
    });
    expect(onToolResult).toHaveBeenCalledWith({
      toolCallId: "c1",
      toolName: "view.setPage",
      result: { ok: true },
    });
  });

  it("ignores anything that did not come from the host", () => {
    const onToolInput = vi.fn();
    const onWarning = vi.fn();
    const host = fakeHost();
    createMcpAppBridge({
      hostOrigin: HOST,
      channel: host.channel,
      onToolInput,
      onWarning,
    });

    host.push(
      {
        jsonrpc: "2.0",
        method: "ui/notifications/tool-input",
        params: { toolCallId: "x", toolName: "edit.cells", input: {} },
      },
      "https://attacker.example"
    );

    expect(onToolInput).not.toHaveBeenCalled();
    expect(onWarning).not.toHaveBeenCalled();
  });

  it("ignores a message that is not JSON-RPC", () => {
    const onToolInput = vi.fn();
    const host = fakeHost();
    createMcpAppBridge({
      hostOrigin: HOST,
      channel: host.channel,
      onToolInput,
    });

    host.push({ method: "ui/notifications/tool-input", params: {} });
    host.push("hello");
    host.push(null);

    expect(onToolInput).not.toHaveBeenCalled();
  });

  it("fails everything in flight when it is disposed", async () => {
    const host = fakeHost(() => undefined);
    const bridge = createMcpAppBridge({
      hostOrigin: HOST,
      channel: host.channel,
    });
    const call = bridge.callTool("view.setPage", { page: 2 });

    bridge.dispose();

    await expect(call).rejects.toThrow(/disposed/);
    await expect(bridge.callTool("view.setPage", { page: 3 })).rejects.toThrow(
      /disposed/
    );
    // A late message from the host reaches nothing.
    expect(() => {
      host.push({ jsonrpc: "2.0", id: 1, result: {} });
    }).not.toThrow();
  });
});

describe("asking the person", () => {
  it("says nothing rather than guessing when the host cannot ask", async () => {
    const host = fakeHost(() => ({ capabilities: {} }));
    const bridge = createMcpAppBridge({
      hostOrigin: HOST,
      channel: host.channel,
    });
    await bridge.initialize();

    const decided = await approveThroughHost(bridge, {
      kind: "operation",
      capability: "edit.cells",
      arguments: {},
      presentation: "widget",
    });

    // Undefined means "nobody was asked", so the session's pending result and
    // the table's own approval chrome stay in charge.
    expect(decided).toBeUndefined();
    expect(host.sent.filter((m) => m.method === "elicitation/create")).toEqual(
      []
    );
  });

  it("puts a write through the host's own chrome when it can ask", async () => {
    const host = fakeHost((message) =>
      message.method === "ui/initialize"
        ? { capabilities: { elicitation: true } }
        : { action: "accept", content: { optionId: "approve" } }
    );
    const bridge = createMcpAppBridge({
      hostOrigin: HOST,
      channel: host.channel,
    });
    await bridge.initialize();

    const decided = await approveThroughHost(bridge, {
      kind: "rows",
      proposals: [
        { rowKey: "r1", column: "total", before: 1, after: 2 },
        { rowKey: "r2", column: "total", before: 3, after: 4 },
      ],
      perItem: true,
      presentation: "widget",
    });

    expect(decided).toBe(true);
    expect(host.sent[1]).toMatchObject({
      method: "elicitation/create",
      params: { message: "Apply 2 changes to the table?" },
    });
  });

  it("puts a structured question through the host and returns the choice", async () => {
    const host = fakeHost((message) =>
      message.method === "ui/initialize"
        ? { capabilities: { elicitation: true } }
        : { action: "accept", content: { optionId: "q4" } }
    );
    const bridge = createMcpAppBridge({
      hostOrigin: HOST,
      channel: host.channel,
    });
    await bridge.initialize();

    const answered = await askThroughHost(bridge, {
      id: "q-1",
      question: "Which quarter?",
      options: [
        { id: "q3", label: "Q3" },
        { id: "q4", label: "Q4" },
      ],
      allowFreeText: false,
    });

    expect(answered).toEqual({ optionId: "q4" });
    expect(host.sent[1]).toMatchObject({
      method: "elicitation/create",
      params: { message: "Which quarter?", allowFreeText: false },
    });
  });

  it("reports a declined question as unanswered rather than as empty text", async () => {
    const host = fakeHost((message) =>
      message.method === "ui/initialize"
        ? { capabilities: { elicitation: true } }
        : { action: "decline" }
    );
    const bridge = createMcpAppBridge({
      hostOrigin: HOST,
      channel: host.channel,
    });
    await bridge.initialize();

    const answered = await askThroughHost(bridge, {
      id: "q-1",
      question: "Which quarter?",
      allowFreeText: true,
    });

    expect(answered).toBeUndefined();
  });

  it("treats a dismissed question as a refusal, never as consent", async () => {
    const host = fakeHost((message) =>
      message.method === "ui/initialize"
        ? { capabilities: { elicitation: true } }
        : { action: "cancel" }
    );
    const bridge = createMcpAppBridge({
      hostOrigin: HOST,
      channel: host.channel,
    });
    await bridge.initialize();

    const decided = await approveThroughHost(bridge, {
      kind: "operation",
      capability: "rows.delete",
      title: "Delete the archived orders",
      arguments: {},
      presentation: "widget",
    });

    expect(decided).toBe(false);
    expect(host.sent[1]).toMatchObject({
      params: { message: "Run Delete the archived orders on this table?" },
    });
  });
});
