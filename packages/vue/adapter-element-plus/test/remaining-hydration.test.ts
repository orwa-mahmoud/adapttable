import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import { expect, it, vi } from "vitest";
import { createSSRApp, h, nextTick } from "vue";
import { renderToString, type SSRContext } from "vue/server-renderer";

import { commandPalette } from "../src/command-palette";
import { contextMenu } from "../src/context-menu";
import DataTable from "../src/DataTable.vue";
import { exportCsv } from "../src/export";
import { groupingPanel } from "../src/grouping-panel";
import { rowReorder } from "../src/row-reorder";
import { savedViews } from "../src/saved-views";
import { sidePanel } from "../src/side-panel";
import { installSsrTeleports } from "./ssr-teleports";
interface Row {
  id: string;
  team: string;
}
it.each([false, true])(
  "hydrates all seven factories without replacing native controls, mobile=%s",
  async (mobile) => {
    const changed = vi.fn();
    const app = () => {
      const created = createSSRApp(() =>
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
              storageKey: "hydrate-remaining",
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
      created.provide(ID_INJECTION_KEY, { prefix: 33000, current: 0 });
      created.provide(ZINDEX_INJECTION_KEY, { current: 0 });
      return created;
    };
    const context: SSRContext = {};
    const root = document.createElement("div");
    root.innerHTML = await renderToString(app(), context);
    const cleanup = installSsrTeleports(context);
    document.body.append(root);
    const selectors = [
      "command-palette-button",
      "export-csv-button",
      "grouping-panel",
      "views-button",
    ].map((name) => `[data-adapttable-part="${name}"]`);
    const originals = selectors.map((selector) => root.querySelector(selector));
    const client = app();
    try {
      client.mount(root);
      await nextTick();
      await nextTick();
      selectors.forEach((selector, i) =>
        expect(root.querySelector(selector)).toBe(originals[i])
      );
      expect(changed).not.toHaveBeenCalled();
    } finally {
      client.unmount();
      root.remove();
      cleanup();
    }
  }
);
