/** MCP tools/resources read the same live Angular contract as the table UI. */
import {
  executeMcpTool,
  mcpToolResult,
  toMcpResources,
  toMcpTools,
} from "@adapttable/ai/mcp";
import { Component } from "@angular/core";

import { type AngularAgentRun, AngularAgentTable } from "./angular-ai-table";

@Component({
  selector: "angular-mcp-host-example",
  imports: [AngularAgentTable],
  template: `<angular-agent-table [run]="run" />`,
})
export class AngularMcpHostExample {
  readonly run: AngularAgentRun = async (session) => {
    const tools = toMcpTools(session);
    const resources = toMcpResources(session);
    const result = await executeMcpTool(
      session,
      "view.setSort",
      { key: "total", dir: "desc" },
      session.manifest().viewRevision,
      crypto.randomUUID()
    );
    // This content is the tools/call reply your MCP host sends to the model.
    return { tools, resources, result: mcpToolResult(result) };
  };
}
