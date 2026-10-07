// @vitest-environment node
import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import { expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { commandPalette } from "../src/command-palette";
import { contextMenu } from "../src/context-menu";
import DataTable from "../src/DataTable.vue";
import { exportCsv } from "../src/export";
import { groupingPanel } from "../src/grouping-panel";
import { rowReorder } from "../src/row-reorder";
import { savedViews } from "../src/saved-views";
import { sidePanel } from "../src/side-panel";
interface Row {
  id: string;
  team: string;
}
it.each([false, true])(
  "renders all seven factories on the server without host writes, mobile=%s",
  async (mobile) => {
    expect(typeof document).toBe("undefined");
    const changed = vi.fn();
    const app = createSSRApp(() =>
      h(DataTable<Row>, {
        data: [{ id: "a", team: "Core" }],
        columns: [{ key: "team", groupable: true }],
        rowKey: (row) => row.id,
        forceMobile: mobile,
        urlSync: false,
        searchable: false,
        features: [
          commandPalette({ button: true }),
          contextMenu<Row>(),
          exportCsv(),
          groupingPanel("team"),
          rowReorder<Row>(changed),
          savedViews({
            storage: null,
            storageKey: "ssr-remaining",
            urlSync: false,
          }),
          sidePanel({
            panels: [{ key: "one", label: "First", content: "Side content" }],
            open: "one",
            onOpenChange: changed,
          }),
        ],
      })
    );
    app.provide(ID_INJECTION_KEY, { prefix: 33000, current: 0 });
    app.provide(ZINDEX_INJECTION_KEY, { current: 0 });
    const html = await renderToString(app);
    for (const part of [
      "command-palette-button",
      "export-csv-button",
      "grouping-panel",
      "views-button",
    ])
      expect(html).toContain(`data-adapttable-part="${part}"`);
    expect(html).toContain("el-button");
    expect(html).toContain("el-card");
    expect(changed).not.toHaveBeenCalled();
  }
);
