import { it } from "vitest";

import { assistantSurfacesTests } from "../../vue/test/kit/assistantSurfaces";
import { DataTable } from "../src";
import {
  AgentApproval,
  agentApproval,
  TableAssistant,
  tableAssistant,
} from "../src/assistant";
import { mount as mountApp } from "./filter-helpers";

for (const test of assistantSurfacesTests({
  DataTable,
  TableAssistant,
  tableAssistant,
  AgentApproval,
  agentApproval,
  mount: (render) => {
    const view = mountApp(render);
    return { host: view.host, unmount: view.stop };
  },
}))
  it(test.name, test.run);
