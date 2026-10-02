/** One model response, executed by the mounted Angular table's session. */
import { executeEnvelope, parseEnvelope } from "@adapttable/ai/json";
import { Component } from "@angular/core";

import { type AngularAgentRun, AngularAgentTable } from "./angular-ai-table";

@Component({
  selector: "angular-one-call-example",
  imports: [AngularAgentTable],
  template: `<angular-agent-table [run]="run" />`,
})
export class AngularOneCallExample {
  readonly run: AngularAgentRun = (session) =>
    executeEnvelope(
      session,
      parseEnvelope({
        schemaVersion: "adapttable.agent.v1",
        tableId: session.manifest().tableId,
        key: "view.setSearch",
        args: { search: "Ada" },
        expectedRevision: session.manifest().viewRevision,
        idempotencyKey: crypto.randomUUID(),
      })
    );
}
