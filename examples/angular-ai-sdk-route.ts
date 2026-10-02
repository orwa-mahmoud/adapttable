/** AI SDK client tools, their Angular execution, and the result continuation. */
import { buildAgentContext } from "@adapttable/ai";
import {
  AI_SDK_STREAM_VERSION,
  type AiSdkRequest,
  aiSdkToolName,
  aiSdkTools,
  aiSdkTransport,
} from "@adapttable/ai/ai-sdk";
import { agentSystemPrompt } from "@adapttable/ai/http";
import { Component } from "@angular/core";

import { type AngularAgentRun, AngularAgentTable } from "./angular-ai-table";

@Component({
  selector: "angular-ai-sdk-example",
  imports: [AngularAgentTable],
  template: `<angular-agent-table [run]="run" />`,
})
export class AngularAiSdkExample {
  readonly run: AngularAgentRun = async (session, destroy) => {
    // Your route spreads these tools into streamText. They intentionally have
    // no execute: the Angular client, which owns the table, executes them.
    const route = {
      tools: aiSdkTools(session),
      system: agentSystemPrompt({ context: buildAgentContext(session) }),
    };
    const requests: AiSdkRequest[] = [];
    const transport = aiSdkTransport({
      connection: {
        run: function* (request) {
          requests.push(request);
          yield {
            type: "start",
            messageId: crypto.randomUUID(),
            version: AI_SDK_STREAM_VERSION,
          };
          if (!request.toolOutputs) {
            yield {
              type: "tool-input-available",
              toolCallId: "search",
              toolName: aiSdkToolName(
                session.manifest().tableId,
                "view.setSearch"
              ),
              input: { search: "Ada" },
            };
          } else {
            yield { type: "text-start", id: "reply" };
            yield { type: "text-delta", id: "reply", delta: "Showing Ada." };
            yield { type: "text-end", id: "reply" };
          }
          yield { type: "finish" };
        },
      },
    });
    const unregister = destroy.onDestroy(() => transport.disconnect?.());
    try {
      const result = await transport.send({
        session,
        text: "Only Ada",
        conversation: [],
      });
      return { route, result, requests };
    } finally {
      transport.disconnect?.();
      unregister();
    }
  };
}
