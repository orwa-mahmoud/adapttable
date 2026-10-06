// @vitest-environment node
import {
  ElMessageBox,
  ID_INJECTION_KEY,
  ZINDEX_INJECTION_KEY,
} from "element-plus";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import DataTable from "../src/DataTable.vue";
import { rowActions } from "../src/row-actions";

interface Row {
  id: string;
  name: string;
}

describe("Element Plus actions Node SSR", () => {
  for (const mobile of [false, true]) {
    it(`keeps action resources inactive without opening a dialog, mobile=${mobile}`, async () => {
      expect(typeof window).toBe("undefined");
      expect(typeof document).toBe("undefined");
      const confirm = vi.spyOn(ElMessageBox, "confirm");
      const onClick = vi.fn();
      const app = createSSRApp(() =>
        h(DataTable<Row>, {
          data: [{ id: "a", name: "Ada" }],
          columns: [{ key: "name" }],
          rowKey: (row) => row.id,
          urlSync: false,
          forceMobile: mobile,
          features: [
            rowActions<Row>([
              {
                key: "remove",
                label: "Remove row",
                onClick,
                confirm: {
                  title: "Remove?",
                  confirmLabel: "Remove",
                  message: (row) => row.name,
                },
              },
            ]),
          ],
        })
      );
      app.provide(ID_INJECTION_KEY, { prefix: 6200, current: 0 });
      app.provide(ZINDEX_INJECTION_KEY, { current: 0 });
      const html = await renderToString(app);
      expect(html).not.toContain('data-adapttable-part="action-button"');
      expect(html).toContain("Ada");
      expect(html).not.toContain("el-message-box");
      expect(confirm).not.toHaveBeenCalled();
      expect(onClick).not.toHaveBeenCalled();
    });
  }
});
