// @vitest-environment node
import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { columnMenu } from "../src/column-menu";
import DataTable from "../src/DataTable.vue";
interface Row {
  id: string;
  name: string;
}
describe("Element Plus Columns Node SSR", () => {
  for (const mobile of [false, true]) {
    it(`renders kit triggers without opening a portal or reading layout, mobile=${mobile}`, async () => {
      expect(typeof window).toBe("undefined");
      expect(typeof document).toBe("undefined");
      const renamed = vi.fn();
      const app = createSSRApp(() =>
        h(DataTable<Row>, {
          data: [{ id: "a", name: "Ada" }],
          columns: [{ key: "name", header: "Name", renameable: true }],
          rowKey: (row) => row.id,
          urlSync: false,
          searchable: false,
          forceMobile: mobile,
          dir: "rtl",
          onColumnRename: renamed,
          features: [columnMenu()],
        })
      );
      app.provide(ID_INJECTION_KEY, { prefix: 9700, current: 0 });
      app.provide(ZINDEX_INJECTION_KEY, { current: 0 });
      const html = await renderToString(app);
      expect(html).toContain('data-adapttable-part="column-menu-button"');
      expect(html).toContain("el-button");
      expect(html).toContain('aria-expanded="false"');
      expect(html).not.toContain('data-adapttable-part="column-menu-panel"');
      expect(html).toContain("Ada");
      expect(renamed).not.toHaveBeenCalled();
    });
  }
});
