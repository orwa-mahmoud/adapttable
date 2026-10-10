import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import { expect, it } from "vitest";
import { createSSRApp, h, nextTick } from "vue";
import { renderToString, type SSRContext } from "vue/server-renderer";

import { DataTable } from "../src";
import { batchEditing, editing } from "../src/editing";
import { installSsrTeleports } from "./ssr-teleports";
interface Row {
  id: string;
  name: string;
}
it.each([false, true])(
  "hydrates genuine editing controls without replacement (batch=%s)",
  async (batch) => {
    const app = () => {
      const created = createSSRApp({
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
      });
      created.provide(ID_INJECTION_KEY, { prefix: 17000, current: 0 });
      created.provide(ZINDEX_INJECTION_KEY, { current: 0 });
      return created;
    };
    const context: SSRContext = {};
    const root = document.createElement("div");
    root.innerHTML = await renderToString(app(), context);
    const cleanup = installSsrTeleports(context);
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
      cleanup();
    }
  }
);
