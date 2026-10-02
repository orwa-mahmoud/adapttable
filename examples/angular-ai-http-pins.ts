/** Pin the contract once; every turn still carries the live table revision. */
import {
  AGENT_SCHEMA_VERSION,
  type AgentHttpClientOptions,
  type AgentHttpRequest,
  connectAgentHttp,
  runAgentHttpTurn,
} from "@adapttable/ai/http";
import { Component } from "@angular/core";

import { type AngularAgentRun, AngularAgentTable } from "./angular-ai-table";

@Component({
  selector: "angular-http-pins-example",
  imports: [AngularAgentTable],
  template: `<angular-agent-table [run]="run" />`,
})
export class AngularHttpPinsExample {
  readonly run: AngularAgentRun = async (session) => {
    const sent: AgentHttpRequest[] = [];
    const options: AgentHttpClientOptions = {
      endpoint: "/api/table-agent",
      connectionId: "angular-orders",
      // Replace this recorded host with your backend. Pin acknowledgement
      // echoes the exact contract version, never just an HTTP success code.
      request: (request) => {
        sent.push(request);
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          sessionId: "example-session",
          pin: {
            status: "acknowledged",
            contractVersion: request.contractVersion,
          },
          ...(request.kind === "turn"
            ? {
                text: "Showing Grace.",
                toolCalls: [
                  {
                    id: crypto.randomUUID(),
                    name: "view.setSearch",
                    args: { search: "Grace" },
                  },
                ],
              }
            : {}),
        });
      },
    };
    await connectAgentHttp(session, options);
    const result = await runAgentHttpTurn(session, "Show Grace", options);
    return { requests: sent, result };
  };
}
