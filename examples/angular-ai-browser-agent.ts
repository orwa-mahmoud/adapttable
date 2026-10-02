/** JSON discovery and OpenAI's tool-call format need no React or provider SDK. */
import { toJsonTools } from "@adapttable/ai/json";
import { executeOpenAITool, toOpenAITools } from "@adapttable/ai/openai";
import { Component } from "@angular/core";

import { type AngularAgentRun, AngularAgentTable } from "./angular-ai-table";

@Component({
  selector: "angular-browser-agent-example",
  imports: [AngularAgentTable],
  template: `<angular-agent-table [run]="run" />`,
})
export class AngularBrowserAgentExample {
  readonly run: AngularAgentRun = async (session) => {
    // Send these tools to your own model backend. A recorded call keeps this
    // copy-paste example runnable without putting API keys in the browser.
    const tools = toOpenAITools(session);
    const result = await executeOpenAITool(
      session,
      {
        function: {
          name: "view_setSort",
          arguments: '{"key":"total","dir":"desc"}',
        },
      },
      session.manifest().viewRevision,
      crypto.randomUUID()
    );
    return { jsonTools: toJsonTools(session), tools, result };
  };
}
