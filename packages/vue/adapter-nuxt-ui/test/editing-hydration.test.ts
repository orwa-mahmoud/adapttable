import ui from "@nuxt/ui/vue-plugin";
import { expect, it } from "vitest";
import { createSSRApp, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { batchEditing, editing } from "../src/editing";
interface Row {
  id: string;
  name: string;
}
it.each([false, true])(
  "hydrates genuine editing controls without replacement (batch=%s)",
  async (batch) => {
    const app = () =>
      createSSRApp({
        render: () =>
          h(DataTable<Row>, {
            data: [{ id: "a", name: "Ada" }],
            columns: [{ key: "name", editable: true }],
            rowKey: (row) => row.id,
            urlSync: false,
            forceMobile: false,
            features: [
              batch
                ? batchEditing<Row>(() => undefined)
                : editing<Row>(() => undefined),
            ],
          }),
      }).use(ui);
    const root = document.createElement("div");
    root.innerHTML = await renderToString(app());
    document.body.append(root);
    const selector = `[data-adapttable-part="${batch ? "edit-cell-editor" : "edit-cell-activate"}"]`;
    const original = root.querySelector(selector);
    expect(original).not.toBeNull();
    const client = app();
    try {
      client.mount(root);
      await nextTick();
      await nextTick();
      expect(root.querySelector(selector)).toBe(original);
    } finally {
      client.unmount();
      root.remove();
    }
  }
);
