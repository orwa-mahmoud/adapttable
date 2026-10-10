// @vitest-environment node
import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { collapsibleColumnGroups } from "../src/column-groups";
import { virtualize } from "../src/virtualize";
interface Row {
  id: string;
  name: string;
  score: number;
}
describe("Element Plus canonical feature entry SSR", () => {
  for (const mobile of [false, true]) {
    it(`renders the semantic table/card without a browser measurement, mobile=${mobile}`, async () => {
      expect(typeof document).toBe("undefined");
      expect(typeof window).toBe("undefined");
      const app = createSSRApp(() =>
        h(DataTable<Row>, {
          data: [{ id: "a", name: "Ada", score: 10 }],
          columns: [
            {
              header: "Person",
              collapsedKey: "name",
              children: [{ key: "name" }, { key: "score" }],
            },
          ],
          rowKey: (row) => row.id,
          forceMobile: mobile,
          urlSync: false,
          searchable: false,
          features: [collapsibleColumnGroups(), virtualize({ maxHeight: 240 })],
        })
      );
      app.provide(ID_INJECTION_KEY, { prefix: 9600, current: 0 });
      app.provide(ZINDEX_INJECTION_KEY, { current: 0 });
      const html = await renderToString(app);
      expect(html).toContain("Ada");
      expect(html).toContain(
        `data-adapttable-part="${mobile ? "card" : "table"}"`
      );
      expect(html).toContain("el-card");
      if (!mobile) {
        expect(html).toContain('data-adapttable-part="column-group-toggle"');
        expect(html).toContain("el-button");
      }
    });
  }
});
