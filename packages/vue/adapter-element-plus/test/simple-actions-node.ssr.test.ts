// @vitest-environment node
import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { bulkActions } from "../src/bulk-actions";
import DataTable from "../src/DataTable.vue";
import { print } from "../src/print";
interface Row {
  id: string;
  name: string;
}
describe("Element bulk and print Node SSR", () => {
  for (const mobile of [false, true])
    it(`renders native kit actions without invoking commands or browser state, mobile=${mobile}`, async () => {
      expect(typeof document).toBe("undefined");
      const action = vi.fn();
      const printed = vi.fn();
      const app = createSSRApp(() =>
        h(DataTable<Row>, {
          data: [{ id: "a", name: "Ada" }],
          columns: [{ key: "name" }],
          rowKey: (row) => row.id,
          selectedIds: ["a"],
          selectable: true,
          urlSync: false,
          searchable: false,
          forceMobile: mobile,
          features: [
            bulkActions([
              { key: "archive", label: "Archive", onClick: action },
            ]),
            print(printed, true),
          ],
        })
      );
      app.provide(ID_INJECTION_KEY, { prefix: 13000, current: 0 });
      app.provide(ZINDEX_INJECTION_KEY, { current: 0 });
      const html = await renderToString(app);
      expect(html).toContain('data-adapttable-part="bulk-button"');
      expect(html).toContain('data-adapttable-part="print-button"');
      expect(html).toContain("el-button");
      expect(action).not.toHaveBeenCalled();
      expect(printed).not.toHaveBeenCalled();
    });
});
