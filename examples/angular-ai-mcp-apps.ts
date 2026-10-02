/** An embedded Angular view, its MCP resource, and its origin-checked bridge. */
import { executeMcpTool, mcpToolResult, toMcpTools } from "@adapttable/ai/mcp";
import {
  createMcpAppBridge,
  type McpAppChannel,
  mcpAppResource,
  withMcpAppMeta,
} from "@adapttable/ai/mcp-apps";
import { Component } from "@angular/core";

import { type AngularAgentRun, AngularAgentTable } from "./angular-ai-table";

@Component({
  selector: "angular-mcp-app-example",
  imports: [AngularAgentTable],
  template: `<angular-agent-table [run]="run" />`,
})
export class AngularMcpAppExample {
  readonly run: AngularAgentRun = async (session, destroy) => {
    const hostOrigin = "https://host.example";
    const resource = mcpAppResource(session, {
      src: "https://view.example/angular-orders/",
      security: { frameAncestors: [hostOrigin] },
    });
    const events: string[] = [];
    const listeners = new Set<(message: unknown, origin: string) => void>();
    const reply = (message: unknown) => {
      for (const listener of listeners) listener(message, hostOrigin);
    };
    // A local host makes the example deterministic. In an actual iframe omit
    // channel: the bridge uses window.parent and checks this exact origin.
    const channel: McpAppChannel = {
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      post: (message) => {
        const rpc = message as {
          id: number;
          method: string;
          params?: { name: string; arguments: unknown };
        };
        if (rpc.method === "ui/initialize") {
          queueMicrotask(() =>
            reply({
              jsonrpc: "2.0",
              id: rpc.id,
              result: { capabilities: { tools: true } },
            })
          );
        } else if (rpc.method === "tools/call" && rpc.params) {
          const params = rpc.params;
          void executeMcpTool(
            session,
            params.name,
            params.arguments,
            session.manifest().viewRevision,
            crypto.randomUUID()
          ).then((result) => {
            reply({
              jsonrpc: "2.0",
              method: "ui/notifications/tool-result",
              params: { toolCallId: "sort", toolName: params.name, result },
            });
            reply({
              jsonrpc: "2.0",
              id: rpc.id,
              result: mcpToolResult(result),
            });
          });
        }
      },
    };
    const bridge = createMcpAppBridge({
      hostOrigin,
      channel,
      onToolResult: (event) => events.push(event.toolName),
    });
    const unregister = destroy.onDestroy(bridge.dispose);
    try {
      await bridge.initialize();
      const result = await bridge.callTool("view.setSort", {
        key: "total",
        dir: "desc",
      });
      return {
        resource,
        tools: withMcpAppMeta(toMcpTools(session), session),
        result,
        events,
      };
    } finally {
      bridge.dispose();
      unregister();
    }
  };
}
