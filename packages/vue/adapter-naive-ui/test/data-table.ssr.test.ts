// @vitest-environment node
import type { ColumnDef } from "@adapttable/vue";
import { setup } from "@css-render/vue3-ssr";
import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";

interface Row {
  id: string;
  name: string;
}
const columns: readonly ColumnDef<Row>[] = [{ key: "name", sortable: true }];

describe("Naive DataTable Node SSR", () => {
  it.each([false, true])(
    "renders real kit surfaces and collects styles without a DOM (mobile=%s)",
    async (mobile) => {
      expect(typeof document).toBe("undefined");
      const app = createSSRApp({
        render: () =>
          h(DataTable<Row>, {
            data: [{ id: "ada", name: "Ada" }],
            columns,
            rowKey: (row) => row.id,
            urlSync: false,
            forceMobile: mobile,
            dir: "rtl",
            selectable: true,
          }),
      });
      const { collect } = setup(app);
      const html = await renderToString(app);
      const styles = collect();
      expect(html).toContain("Ada");
      expect(html).toContain('data-adapttable-part="root"');
      expect(html).toContain('role="checkbox"');
      expect(html).toContain(mobile ? "n-card" : "n-table");
      expect(html).not.toContain("n-data-table");
      expect(styles).toContain("cssr-id=");
    }
  );
});
