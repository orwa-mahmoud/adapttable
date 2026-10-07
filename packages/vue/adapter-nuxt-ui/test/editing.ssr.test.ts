// @vitest-environment node
import ui from "@nuxt/ui/vue-plugin";
import { expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { batchEditing, editing, rowEditing } from "../src/editing";
interface Row {
  id: string;
  name: string;
}
it.each(["cell", "row", "batch"] as const)(
  "server-renders %s editing with genuine Nuxt controls",
  async (mode) => {
    expect(typeof document).toBe("undefined");
    const features = {
      cell: editing<Row>(() => undefined),
      row: rowEditing<Row>(() => undefined),
      batch: batchEditing<Row>(() => undefined),
    };
    const feature = features[mode];
    const app = createSSRApp({
      render: () =>
        h(DataTable<Row>, {
          data: [{ id: "a", name: "Ada" }],
          columns: [{ key: "name", editable: true }],
          rowKey: (row) => row.id,
          urlSync: false,
          forceMobile: false,
          dir: "rtl",
          features: [feature],
        }),
    }).use(ui);
    const html = await renderToString(app);
    expect(html).toContain('data-row-id="a"');
    expect(html).toContain('dir="rtl"');
    const parts = {
      cell: "edit-cell-activate",
      row: "row-edit-begin",
      batch: "edit-cell-editor",
    };
    expect(html).toContain(`data-adapttable-part="${parts[mode]}"`);
  }
);
