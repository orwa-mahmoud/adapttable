import UApp from "@nuxt/ui/components/App.vue";
import ui from "@nuxt/ui/vue-plugin";
import { it } from "vitest";
import { createApp, h } from "vue";

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
    const app = createApp({
      render: () => h(UApp, { toaster: null }, render),
    }).use(ui);
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
