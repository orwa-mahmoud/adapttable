/** The AG-UI connection seam drives a mounted Angular frontend tool host. */
import {
  type AgUiEvent,
  aguiToolName,
  aguiTransport,
} from "@adapttable/ai/ag-ui";
import { Component } from "@angular/core";

import { type AngularAgentRun, AngularAgentTable } from "./angular-ai-table";

@Component({
  selector: "angular-agui-host-example",
  imports: [AngularAgentTable],
  template: `<angular-agent-table [run]="run" />`,
})
export class AngularAgUiHostExample {
  readonly run: AngularAgentRun = async (session, destroy) => {
    const events: AgUiEvent[] = [];
    const transport = aguiTransport({
      connection: {
        // Replace with a CopilotKit, Mastra or other AG-UI host connection.
        run: function* (input) {
          yield {
            type: "RUN_STARTED",
            threadId: input.threadId,
            runId: input.runId,
          };
          yield {
            type: "TOOL_CALL_START",
            toolCallId: "sort",
            toolCallName: aguiToolName(
              session.manifest().tableId,
              "view.setSort"
            ),
          };
          yield {
            type: "TOOL_CALL_ARGS",
            toolCallId: "sort",
            delta: '{"key":"total","dir":"desc"}',
          };
          yield { type: "TOOL_CALL_END", toolCallId: "sort" };
          yield {
            type: "TEXT_MESSAGE_CONTENT",
            messageId: "reply",
            delta: "Highest total first.",
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
    const unregister = destroy.onDestroy(() => transport.disconnect?.());
    try {
      await transport.connect?.({ session });
      const result = await transport.send({
        session,
        text: "Highest total first",
        conversation: [],
      });
      return { result, events };
    } finally {
      transport.disconnect?.();
      unregister();
    }
  };
}
