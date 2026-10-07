// @vitest-environment node
import ui from "@nuxt/ui/vue-plugin";
import { expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { bulkActions } from "../src/bulk-actions";
import { exportCsv } from "../src/export";
import { print } from "../src/print";
it.each([false, true])(
  "renders native action controls without invoking host actions (mobile=%s)",
  async (mobile) => {
    expect(typeof window).toBe("undefined");
    const run = vi.fn();
    const app = createSSRApp({
      render: () =>
        h(DataTable<{ id: string; name: string }>, {
          data: [{ id: "a", name: "Ada" }],
          columns: [{ key: "name" }],
          rowKey: (row) => row.id,
          urlSync: false,
          forceMobile: mobile,
          dir: "rtl",
          selectable: true,
          defaultSelectedIds: ["a"],
          features: [
            bulkActions([{ key: "run", label: "Run", onClick: run }]),
            print(run, true),
            exportCsv<{ id: string; name: string }>({ request: run }),
          ],
        }),
    }).use(ui);
    const html = await renderToString(app);
    expect(html).toContain('data-adapttable-part="print-button"');
    expect(html).toContain('data-adapttable-part="export-csv-button"');
    expect(html).toContain('data-adapttable-part="bulk-button"');
    expect(html).toContain('dir="rtl"');
    expect(run).not.toHaveBeenCalled();
  }
);
