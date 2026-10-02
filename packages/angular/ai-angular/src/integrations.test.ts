/** Every transport drives the mounted kit, never a second test executor. */
import type { AgentSession } from "@adapttable/ai";
import {
  type AgUiEvent,
  aguiToolName,
  aguiTransport,
} from "@adapttable/ai/ag-ui";
import {
  AI_SDK_STREAM_VERSION,
  type AiSdkRequest,
  aiSdkToolName,
  aiSdkTools,
  aiSdkTransport,
} from "@adapttable/ai/ai-sdk";
import {
  AGENT_SCHEMA_VERSION,
  type AgentHttpClientOptions,
  type AgentHttpRequest,
  connectAgentHttp,
  runAgentHttpTurn,
} from "@adapttable/ai/http";
import {
  executeEnvelope,
  executeJsonTool,
  parseEnvelope,
  toJsonTools,
} from "@adapttable/ai/json";
import {
  executeMcpTool,
  mcpToolResult,
  toMcpResources,
  toMcpTools,
} from "@adapttable/ai/mcp";
import {
  createMcpAppBridge,
  MCP_APP_MIME,
  type McpAppChannel,
  mcpAppResource,
  withMcpAppMeta,
} from "@adapttable/ai/mcp-apps";
import { executeOpenAITool, toOpenAITools } from "@adapttable/ai/openai";
import type { ModelContextLike, WebMcpTool } from "@adapttable/ai/webmcp";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { Component, computed, DestroyRef, inject, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { tableAgent, type TableAgentOptions } from "./tableAgent";

interface Person {
  id: string;
  name: string;
  salary: number;
}

const TABLE_ID = "angular-integrations";
const PEOPLE: Person[] = [
  { id: "ada", name: "Ada", salary: 120 },
  { id: "grace", name: "Grace", salary: 140 },
  { id: "katherine", name: "Katherine", salary: 130 },
];

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      tableLabel="Integration people"
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [defaults]="{ limit: 10 }"
      [features]="features"
    />
    <output data-host-event>{{ hostEvent() }}</output>
  `,
})
class IntegrationHost {
  readonly destroyRef = inject(DestroyRef);
  readonly rows = PEOPLE;
  readonly rowKey = (row: Person) => row.id;
  readonly columns: readonly ColumnDef<Person>[] = [
    { key: "name", header: "Name", sortable: true },
    { key: "salary", header: "Salary", sortable: true },
  ];
  readonly options = signal<Partial<TableAgentOptions>>({});
  readonly hostEvent = signal("");
  session: AgentSession | undefined;
  readonly features = [
    tableAgent(
      computed(() => ({
        tableId: TABLE_ID,
        approval: "never" as const,
        columns: {
          name: { type: "string" as const, sortable: true },
          salary: { type: "number" as const, sortable: true },
        },
        ...this.options(),
        bridge: {
          attach: (session: AgentSession) => {
            this.session = session;
          },
        },
      }))
    ),
  ];
}

async function mount(options: Partial<TableAgentOptions> = {}) {
  const fixture = TestBed.createComponent(IntegrationHost);
  fixture.componentInstance.options.set(options);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const session = fixture.componentInstance.session;
  if (!session)
    throw new Error("The mounted Angular table did not attach its agent");
  const element = fixture.nativeElement as HTMLElement;
  const ids = () =>
    [
      ...element.querySelectorAll<HTMLElement>('[data-adapttable-part="row"]'),
    ].map((row) => row.dataset.rowId);
  expect(ids()).toEqual(["ada", "grace", "katherine"]);
  return { fixture, element, session, ids, settle: () => fixture.whenStable() };
}

function sse(records: readonly [string, unknown][]) {
  return new Response(
    records
      .map(
        ([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
      )
      .join(""),
    { headers: { "content-type": "text/event-stream" } }
  );
}

function content(result: { content: readonly { text: string }[] }): unknown {
  return JSON.parse(result.content[0]?.text ?? "null") as unknown;
}

function sortedNames(values: readonly string[]): string[] {
  const sorted = [...values];
  sorted.sort((a, b) => a.localeCompare(b));
  return sorted;
}

afterEach(() => {
  TestBed.resetTestingModule();
  Reflect.deleteProperty(document, "modelContext");
});

describe("unchanged AI integrations over a mounted Angular table", () => {
  it("streams an HTTP reply, applies its ordered actions, and reports real revisions", async () => {
    const table = await mount();
    const partial: string[] = [];
    const revision = table.session.manifest().viewRevision;
    const result = await runAgentHttpTurn(table.session, "Ada, salary first", {
      endpoint: "https://agent.example/turn",
      stream: true,
      onStreamText: (text) => partial.push(text),
      fetch: () =>
        Promise.resolve(
          sse([
            ["text-delta", { text: "Showing " }],
            ["text-delta", { text: "Ada." }],
            [
              "tool-calls",
              {
                toolCalls: [
                  {
                    id: "search",
                    name: "view.setSearch",
                    args: { search: "Ada" },
                  },
                  {
                    id: "sort",
                    name: "view.setSort",
                    args: { key: "salary", dir: "desc" },
                  },
                ],
              },
            ],
            ["done", {}],
          ])
        ),
    });
    await table.settle();
    expect(partial).toEqual(["Showing ", "Showing Ada."]);
    expect(result.results.map((entry) => entry.ok)).toEqual([true, true]);
    expect(result.results[0]?.revision).toBeGreaterThan(revision);
    expect(result.results[1]?.revision).toBeGreaterThan(
      result.results[0]?.revision ?? revision
    );
    expect(table.ids()).toEqual(["ada"]);
    expect(
      table.element.querySelector('[aria-sort="descending"]')?.textContent
    ).toContain("Salary");
  });

  it("negotiates an HTTP contract pin while carrying the mounted table's fresh revision", async () => {
    const table = await mount();
    const requests: AgentHttpRequest[] = [];
    const options: AgentHttpClientOptions = {
      endpoint: "https://agent.example/pinned",
      connectionId: "angular-pins",
      request: (body) => {
        requests.push(body);
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          sessionId: "angular-session",
          pin: {
            status: "acknowledged",
            contractVersion: body.contractVersion,
          },
          ...(body.kind === "turn"
            ? {
                text: "Sorted.",
                toolCalls: [
                  {
                    id: `sort-${String(requests.length)}`,
                    name: "view.setSort",
                    args: {
                      key: "salary",
                      dir: body.message === "Highest first" ? "desc" : "asc",
                    },
                  },
                ],
              }
            : {}),
        });
      },
    };
    await connectAgentHttp(table.session, options);
    await runAgentHttpTurn(table.session, "Highest first", options);
    await table.settle();
    expect(table.ids()).toEqual(["grace", "katherine", "ada"]);
    const revision = table.session.manifest().viewRevision;
    await runAgentHttpTurn(table.session, "Lowest first", options);
    await table.settle();
    expect(table.ids()).toEqual(["ada", "katherine", "grace"]);
    expect(requests.map((body) => body.kind)).toEqual([
      "hello",
      "turn",
      "turn",
    ]);
    expect(requests[0]?.catalog?.map((entry) => entry.key)).toContain(
      "view.setSort"
    );
    expect(requests[1]).toMatchObject({ sessionId: "angular-session" });
    expect(requests[1]?.catalog).toBeUndefined();
    expect(requests[1]?.manifest).toBeUndefined();
    expect(requests[2]?.viewRevision).toBe(revision);
  });

  it("never changes mounted rows for an incomplete HTTP stream", async () => {
    const table = await mount();
    await expect(
      runAgentHttpTurn(table.session, "Only Ada", {
        endpoint: "https://agent.example/interrupted",
        stream: true,
        fetch: () =>
          Promise.resolve(
            sse([
              [
                "tool-calls",
                {
                  toolCalls: [
                    {
                      id: "cut",
                      name: "view.setSearch",
                      args: { search: "Ada" },
                    },
                  ],
                },
              ],
            ])
          ),
      })
    ).rejects.toThrow(/done/);
    await table.settle();
    expect(table.ids()).toEqual(["ada", "grace", "katherine"]);
  });

  it("offers JSON tools and applies both tool calls and application envelopes", async () => {
    const table = await mount();
    expect(toJsonTools(table.session).map((tool) => tool.name)).toContain(
      "view.setSearch"
    );
    const searched = await executeJsonTool(table.session, {
      name: "view.setSearch",
      arguments: { search: "Grace" },
      expectedRevision: table.session.manifest().viewRevision,
      idempotencyKey: "json-search",
    });
    await table.settle();
    expect(searched.ok).toBe(true);
    expect(table.ids()).toEqual(["grace"]);
    const cleared = await executeEnvelope(
      table.session,
      parseEnvelope({
        schemaVersion: AGENT_SCHEMA_VERSION,
        tableId: TABLE_ID,
        key: "view.setSearch",
        args: { search: "" },
        expectedRevision: table.session.manifest().viewRevision,
        idempotencyKey: "json-envelope",
      })
    );
    await table.settle();
    expect(cleared.ok).toBe(true);
    expect(table.ids()).toEqual(["ada", "grace", "katherine"]);
  });

  it("runs eager and deferred OpenAI calls against the same mounted session", async () => {
    const table = await mount();
    const eager = toOpenAITools(table.session);
    expect(
      eager.find((tool) => tool.function.name === "view_setSort")?.function
        .strict
    ).toBe(true);
    const result = await executeOpenAITool(
      table.session,
      {
        id: "openai-sort",
        function: {
          name: "view_setSort",
          arguments: '{"key":"salary","dir":"desc"}',
        },
      },
      table.session.manifest().viewRevision,
      "openai-sort"
    );
    await table.settle();
    expect(result.ok).toBe(true);
    expect(table.ids()).toEqual(["grace", "katherine", "ada"]);
    expect(
      toOpenAITools(table.session, { deferred: true }).map(
        (tool) => tool.function.name
      )
    ).toEqual(["catalog", "describe", "execute"]);
    const deferred = await executeOpenAITool(
      table.session,
      {
        function: {
          name: "execute",
          arguments: JSON.stringify({
            key: "view.setSearch",
            args: '{"query":"Katherine"}',
          }),
        },
      },
      table.session.manifest().viewRevision,
      "openai-deferred"
    );
    await table.settle();
    expect(deferred.ok).toBe(true);
    expect(table.ids()).toEqual(["katherine"]);
  });

  it("serves MCP tools and resources, returning the actual table outcome to its host", async () => {
    const table = await mount();
    const tool = toMcpTools(table.session).find(
      (entry) => entry.name === "view.setSort"
    );
    expect(tool?.annotations.openWorldHint).toBe(false);
    const resource = toMcpResources(table.session).find(
      (entry) => entry.name === "view.setSort"
    );
    expect(resource?.uri).toBe(
      `adapttable://table/${TABLE_ID}/capability/view.setSort`
    );
    expect(JSON.parse(resource?.text ?? "null")).toEqual(
      table.session.describe("view.setSort")
    );
    const result = await executeMcpTool(
      table.session,
      "view.setSort",
      { key: "salary", dir: "desc" },
      table.session.manifest().viewRevision,
      "mcp-sort"
    );
    await table.settle();
    expect(table.ids()).toEqual(["grace", "katherine", "ada"]);
    expect(content(mcpToolResult(result))).toMatchObject({
      ok: true,
      revision: table.session.manifest().viewRevision,
    });
  });

  it("embeds the mounted table as an MCP App with host calls, notifications, and teardown", async () => {
    const table = await mount();
    const origin = "https://host.example";
    const listeners = new Set<(message: unknown, origin: string) => void>();
    const sent: { method: string; targetOrigin: string }[] = [];
    const push = (message: unknown, from = origin) => {
      for (const listener of listeners) listener(message, from);
    };
    const channel: McpAppChannel = {
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      post: (message, targetOrigin) => {
        const rpc = message as {
          id: number;
          method: string;
          params?: { name: string; arguments: unknown };
        };
        sent.push({ method: rpc.method, targetOrigin });
        if (rpc.method === "ui/initialize") {
          queueMicrotask(() =>
            push({
              jsonrpc: "2.0",
              id: rpc.id,
              result: { capabilities: { tools: true } },
            })
          );
          return;
        }
        if (rpc.method !== "tools/call" || !rpc.params)
          throw new Error("Unexpected host request");
        const params = rpc.params;
        push({
          jsonrpc: "2.0",
          method: "ui/notifications/tool-input",
          params: {
            toolCallId: "app-sort",
            toolName: params.name,
            input: params.arguments,
          },
        });
        void executeMcpTool(
          table.session,
          params.name,
          params.arguments,
          table.session.manifest().viewRevision,
          "app-sort"
        ).then((result) => {
          push({
            jsonrpc: "2.0",
            method: "ui/notifications/tool-result",
            params: {
              toolCallId: "app-sort",
              toolName: params.name,
              result,
            },
          });
          push({ jsonrpc: "2.0", id: rpc.id, result: mcpToolResult(result) });
        });
      },
    };
    const inputs = vi.fn();
    const bridge = createMcpAppBridge({
      hostOrigin: origin,
      channel,
      onToolInput: inputs,
      onToolResult: (outcome) =>
        table.fixture.componentInstance.hostEvent.set(
          `${outcome.toolName} completed`
        ),
    });
    table.fixture.componentInstance.destroyRef.onDestroy(bridge.dispose);
    const resource = mcpAppResource(table.session, {
      src: "https://view.example/angular/",
      security: { frameAncestors: [origin] },
    });
    expect(resource).toMatchObject({
      uri: `ui://adapttable/table/${TABLE_ID}`,
      mimeType: MCP_APP_MIME,
    });
    expect(
      withMcpAppMeta(toMcpTools(table.session), table.session)[0]?._meta
    ).toMatchObject({ ui: { resourceUri: resource.uri } });
    expect(await bridge.initialize()).toEqual({ tools: true });
    push(
      {
        jsonrpc: "2.0",
        method: "ui/notifications/tool-input",
        params: { toolName: "forged" },
      },
      "https://wrong.example"
    );
    expect(inputs).not.toHaveBeenCalled();
    const result = await bridge.callTool("view.setSort", {
      key: "salary",
      dir: "desc",
    });
    await table.settle();
    expect(table.ids()).toEqual(["grace", "katherine", "ada"]);
    expect(content(result)).toMatchObject({ ok: true });
    expect(inputs).toHaveBeenCalledWith({
      toolCallId: "app-sort",
      toolName: "view.setSort",
      input: { key: "salary", dir: "desc" },
    });
    expect(table.element.querySelector("[data-host-event]")?.textContent).toBe(
      "view.setSort completed"
    );
    expect(sent).toEqual([
      { method: "ui/initialize", targetOrigin: origin },
      { method: "tools/call", targetOrigin: origin },
    ]);
    table.fixture.destroy();
    expect(listeners.size).toBe(0);
  });

  it("registers WebMCP on mount, executes its real table tool, and unregisters on destroy", async () => {
    const tools = new Map<string, WebMcpTool>();
    const removed: string[] = [];
    const modelContext: ModelContextLike = {
      registerTool: (tool) => {
        tools.set(tool.name, tool);
        return () => {
          tools.delete(tool.name);
          removed.push(tool.name);
        };
      },
    };
    Object.defineProperty(document, "modelContext", {
      value: modelContext,
      configurable: true,
    });
    const table = await mount({
      webmcp: { exposedTo: ["view.setSort", "view.setSearch"] },
    });
    const names = [
      `adapttable.${TABLE_ID}.view.setSort`,
      `adapttable.${TABLE_ID}.view.setSearch`,
    ];
    expect(sortedNames([...tools.keys()])).toEqual(sortedNames(names));
    const tool = tools.get(names[0]!);
    if (!tool)
      throw new Error("The mounted feature did not register its sort tool");
    const result = await tool.execute({ key: "salary", dir: "desc" });
    await table.settle();
    expect(table.ids()).toEqual(["grace", "katherine", "ada"]);
    expect(content(result)).toMatchObject({ ok: true });
    table.fixture.destroy();
    expect(tools.size).toBe(0);
    expect(sortedNames(removed)).toEqual(sortedNames(names));
  });

  it("executes AG-UI frontend calls and emits a host tool result", async () => {
    const table = await mount();
    const events: AgUiEvent[] = [];
    const close = vi.fn();
    const transport = aguiTransport({
      connection: {
        close,
        run: function* (input) {
          yield {
            type: "RUN_STARTED",
            threadId: input.threadId,
            runId: input.runId,
          };
          yield {
            type: "TOOL_CALL_START",
            toolCallId: "agui-sort",
            toolCallName: aguiToolName(TABLE_ID, "view.setSort"),
          };
          yield {
            type: "TOOL_CALL_ARGS",
            toolCallId: "agui-sort",
            delta: '{"key":"salary",',
          };
          yield {
            type: "TOOL_CALL_ARGS",
            toolCallId: "agui-sort",
            delta: '"dir":"desc"}',
          };
          yield { type: "TOOL_CALL_END", toolCallId: "agui-sort" };
          yield {
            type: "TEXT_MESSAGE_CONTENT",
            messageId: "answer",
            delta: "Highest salary first.",
          };
          yield {
            type: "RUN_FINISHED",
            threadId: input.threadId,
            runId: input.runId,
          };
        },
      },
      onEvent: (event) => events.push(event),
    });
    await transport.connect?.({ session: table.session });
    const result = await transport.send({
      session: table.session,
      text: "Salary descending",
      conversation: [],
    });
    await table.settle();
    expect(table.ids()).toEqual(["grace", "katherine", "ada"]);
    expect(result.keys).toEqual(["view.setSort"]);
    expect(result.text).toBe("Highest salary first.");
    const receipt = events.find((event) => event.type === "TOOL_CALL_RESULT");
    expect(receipt?.toolCallId).toBe("agui-sort");
    expect(JSON.parse(String(receipt?.content))).toMatchObject({ ok: true });
    transport.disconnect?.();
    expect(close).toHaveBeenCalledOnce();
  });

  it("returns mounted-table outcomes to the AI SDK route and finishes its continuation", async () => {
    const table = await mount();
    const requests: AiSdkRequest[] = [];
    const close = vi.fn();
    const transport = aiSdkTransport({
      connection: {
        close,
        run: function* (request) {
          requests.push(request);
          yield {
            type: "start",
            messageId: `sdk-${String(requests.length)}`,
            version: AI_SDK_STREAM_VERSION,
          };
          if (!request.toolOutputs) {
            yield {
              type: "tool-input-available",
              toolCallId: "sdk-search",
              toolName: aiSdkToolName(TABLE_ID, "view.setSearch"),
              input: { search: "Grace" },
            };
          } else {
            yield { type: "text-start", id: "answer" };
            yield { type: "text-delta", id: "answer", delta: "Showing Grace." };
            yield { type: "text-end", id: "answer" };
          }
          yield { type: "finish" };
        },
      },
    });
    const declared = aiSdkTools(table.session);
    expect(declared[aiSdkToolName(TABLE_ID, "view.setSearch")]).toBeDefined();
    expect(Object.values(declared).every((tool) => !("execute" in tool))).toBe(
      true
    );
    const reply = await transport.send({
      session: table.session,
      text: "Only Grace",
      conversation: [],
    });
    await table.settle();
    expect(table.ids()).toEqual(["grace"]);
    expect(reply.text).toBe("Showing Grace.");
    expect(reply.keys).toEqual(["view.setSearch"]);
    expect(requests).toHaveLength(2);
    expect(requests[1]?.toolOutputs).toMatchObject([
      { toolCallId: "sdk-search", output: { ok: true } },
    ]);
    transport.disconnect?.();
    expect(close).toHaveBeenCalledOnce();
  });
});
