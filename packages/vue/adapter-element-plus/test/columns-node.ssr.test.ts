// @vitest-environment node
import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { collapsibleColumnGroups, fitColumns } from "../src/columns";
import DataTable from "../src/DataTable.vue";
interface Row {
  id: string;
  name: string;
  age: number;
}
describe("Element Plus column Node SSR", () => {
  for (const collapsed of [false, true]) {
    it(`serializes genuine localized group controls and native spans, collapsed=${collapsed}`, async () => {
      expect(typeof window).toBe("undefined");
      expect(typeof document).toBe("undefined");
      const app = createSSRApp(() =>
        h(DataTable<Row>, {
          data: [{ id: "a", name: "Ada", age: 36 }],
          columns: [
            {
              header: "Person",
              collapsedKey: "name",
              children: [{ key: "name" }, { key: "age" }],
            },
          ],
          rowKey: (row) => row.id,
          urlSync: false,
          searchable: false,
          forceMobile: false,
          dir: "rtl",
          defaultColumnLayout: { collapsedGroups: collapsed ? ["Person"] : [] },
          labels: {
            collapseColumnGroup: "طي الأعمدة",
            expandColumnGroup: "توسيع الأعمدة",
          },
          features: [collapsibleColumnGroups(), fitColumns()],
        })
      );
      app.provide(ID_INJECTION_KEY, { prefix: 6700, current: 0 });
      app.provide(ZINDEX_INJECTION_KEY, { current: 0 });
      const html = await renderToString(app);
      expect(html).toMatch(
        /<button[^>]*data-adapttable-part="column-group-toggle"/
      );
      expect(html).toContain(`aria-expanded="${String(!collapsed)}"`);
      expect(html).toContain(
        `aria-label="${collapsed ? "توسيع الأعمدة" : "طي الأعمدة"}: Person"`
      );
      expect(html).toContain('class="el-button');
      expect(html.match(/<td(?:\s|>)/g)).toHaveLength(collapsed ? 1 : 2);
      expect(html).toContain("Ada");
    });
  }
});
