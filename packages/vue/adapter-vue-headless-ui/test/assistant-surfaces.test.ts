import { it } from "vitest";
import { createApp } from "vue";

import { assistantSurfacesTests } from "../../vue/test/kit/assistantSurfaces";
import { DataTable } from "../src";
import {
  AgentApproval,
  agentApproval,
  TableAssistant,
  tableAssistant,
} from "../src/assistant";

for (const test of assistantSurfacesTests({
  DataTable,
  TableAssistant,
  tableAssistant,
  AgentApproval,
  agentApproval,
  mount: (render) => {
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({ render });
    app.mount(host);
    return {
      host,
      unmount: () => {
        app.unmount();
        host.remove();
      },
    };
  },
}))
  it(test.name, test.run);
