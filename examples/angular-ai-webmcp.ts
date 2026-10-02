/** Register browser tools and release them when Angular destroys the view. */
import { registerWebMcpTools } from "@adapttable/ai/webmcp";
import { Component } from "@angular/core";

import { type AngularAgentRun, AngularAgentTable } from "./angular-ai-table";

@Component({
  selector: "angular-webmcp-example",
  imports: [AngularAgentTable],
  template: `<angular-agent-table [run]="run" />`,
})
export class AngularWebMcpExample {
  private dispose: (() => void) | undefined;
  readonly run: AngularAgentRun = (session, destroy) => {
    this.dispose?.();
    const registration = registerWebMcpTools(session, {
      exposedTo: ["view.setSort", "view.setSearch", "rows.read"],
    });
    this.dispose = registration.dispose;
    destroy.onDestroy(registration.dispose);
    // A browser without document.modelContext reports inactive honestly.
    // tableAgent({ webmcp: true }) is the automatic lifecycle alternative.
    return Promise.resolve({
      active: registration.active,
      names: registration.names,
    });
  };
}
