// @vitest-environment node
import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import {
  cellNavigation,
  columnSelectionCheckbox,
} from "../src/cell-navigation";
import DataTable from "../src/DataTable.vue";
import { selectionStats, statusBar } from "../src/status-bar";
interface Row {
  id: string;
  score: number;
}
describe("Element Plus grid/status Node SSR", () => {
  for (const mobile of [false, true]) {
    it(`renders kit status text and data without native listeners or callbacks, mobile=${mobile}`, async () => {
      expect(typeof window).toBe("undefined");
      expect(typeof document).toBe("undefined");
      const changed = vi.fn();
      const fill = vi.fn();
      const app = createSSRApp(() =>
        h(DataTable<Row>, {
          data: [
            { id: "a", score: 10 },
            { id: "b", score: 30 },
          ],
          columns: [{ key: "score", editable: true, editor: "number" }],
          rowKey: (row) => row.id,
          forceMobile: mobile,
          searchable: false,
          urlSync: false,
          dir: "rtl",
          locale: "ar",
          onCellFill: fill,
          features: [
            cellNavigation({ onRangeChange: changed }),
            columnSelectionCheckbox(),
            statusBar(),
            selectionStats(),
          ],
        })
      );
      app.provide(ID_INJECTION_KEY, { prefix: 9400, current: 0 });
      app.provide(ZINDEX_INJECTION_KEY, { current: 0 });
      const html = await renderToString(app);
      expect(html).toContain('data-adapttable-part="status-bar"');
      expect(html).toMatch(
        /<span[^>]*class="el-text[^>]*data-adapttable-part="status-item"/
      );
      expect(html).toContain("30");
      expect(html).toContain('dir="rtl"');
      expect(html).not.toContain('data-adapttable-part="fill-handle"');
      expect(changed).not.toHaveBeenCalled();
      expect(fill).not.toHaveBeenCalled();
    });
  }
});
