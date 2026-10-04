import type { TableAgentControllerOptions } from "@adapttable/ai";
import type { TableRuntimeView } from "@adapttable/vue/adapter";
import { afterEach, describe, expect, it } from "vitest";
import { createApp, defineComponent, h, shallowRef } from "vue";

import QueuedChild from "./tableAgent.admission.fixture.vue";
const releases: (() => void)[] = [];
afterEach(() => releases.splice(0).forEach((release) => release()));
const view: TableRuntimeView = {
  rows: [{ id: "1", name: "Ada" }],
  getRowId: () => "1",
  rowLabel: () => "Ada",
};
const options: TableAgentControllerOptions = {
  tableId: "people",
  columns: { name: { type: "string", readable: true } },
  approval: "never",
};
describe("Vue queued-prop admission", () => {
  it("revalidates cached columns replay after queued SFC redaction", async () => {
    const input = shallowRef(options);
    const child = shallowRef<InstanceType<typeof QueuedChild>>();
    const app = createApp(
      defineComponent({
        setup: () => () =>
          h(QueuedChild, {
            options: input.value,
            view,
            asyncAdmission: true,
            ref: child,
          }),
      })
    );
    app.mount(document.createElement("div"));
    releases.push(() => app.unmount());
    if (!child.value) throw new Error("Child missing");
    const session = child.value.controller.session();
    const revision = session.manifest().viewRevision;
    const first = await session.execute(
      "columns.describe",
      {},
      revision,
      "cached"
    );
    expect(JSON.stringify(first.result)).toContain('"readable":true');
    input.value = {
      ...options,
      columns: { name: { type: "string", readable: false } },
    };
    const replay = await session.execute(
      "columns.describe",
      {},
      revision,
      "cached"
    );
    expect(JSON.stringify(replay.result)).toContain('"readable":false');
    expect(JSON.stringify(replay.result)).not.toContain('"readable":true');
  });
});
