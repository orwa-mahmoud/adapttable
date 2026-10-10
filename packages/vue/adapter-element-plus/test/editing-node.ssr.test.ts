// @vitest-environment node
import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
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
  "server-renders %s editing with genuine Element Plus controls",
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
    });
    app.provide(ID_INJECTION_KEY, { prefix: 17000, current: 0 });
    app.provide(ZINDEX_INJECTION_KEY, { current: 0 });
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
