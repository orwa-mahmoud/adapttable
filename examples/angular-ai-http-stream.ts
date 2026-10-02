/** A real HTTP/SSE response is decoded before the mounted table executes it. */
import { runAgentHttpTurn } from "@adapttable/ai/http";
import { Component, signal } from "@angular/core";

import { type AngularAgentRun, AngularAgentTable } from "./angular-ai-table";

@Component({
  selector: "angular-http-stream-example",
  imports: [AngularAgentTable],
  template: `<p aria-live="polite">{{ partial() }}</p>
    <angular-agent-table [run]="run" />`,
})
export class AngularHttpStreamExample {
  readonly partial = signal("");
  readonly run: AngularAgentRun = (session, destroy) => {
    const controller = new AbortController();
    const unregister = destroy.onDestroy(() => controller.abort());
    return runAgentHttpTurn(
      session,
      "Highest total first",
      {
        endpoint: "/api/table-agent",
        stream: true,
        onStreamText: (text) => this.partial.set(text),
        // Remove this local response to use your own ai-http-backend.ts server.
        fetch: () =>
          Promise.resolve(
            new Response(
              [
                'event: text-delta\ndata: {"text":"Sorting by total."}\n\n',
                'event: tool-calls\ndata: {"toolCalls":[{"id":"sort","name":"view.setSort","args":{"key":"total","dir":"desc"}}]}\n\n',
                "event: done\ndata: {}\n\n",
              ].join(""),
              { headers: { "content-type": "text/event-stream" } }
            )
          ),
      },
      { signal: controller.signal }
    ).finally(unregister);
  };
}
