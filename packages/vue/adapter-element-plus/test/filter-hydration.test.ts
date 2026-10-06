import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import { describe, expect, it } from "vitest";
import { createSSRApp, h, nextTick } from "vue";
import { renderToString, type SSRContext } from "vue/server-renderer";

import DataTable from "../src/DataTable.vue";
import { filters } from "../src/filters";
import { node } from "./mount";
import { installSsrTeleports } from "./ssr-teleports";

interface Row {
  id: string;
  name: string;
}
function app(mode: "popover" | "drawer") {
  const value = createSSRApp(() =>
    h(DataTable<Row>, {
      data: [{ id: "a", name: "Ada" }],
      columns: [{ key: "name" }],
      rowKey: (row) => row.id,
      urlSync: false,
      forceMobile: false,
      features: [filters<Row>([{ key: "name", type: "text" }], { mode })],
    })
  );
  value.provide(ID_INJECTION_KEY, { prefix: 4950, current: 0 });
  value.provide(ZINDEX_INJECTION_KEY, { current: 0 });
  return value;
}
describe("Element Plus filter hydration", () => {
  for (const mode of ["popover", "drawer"] as const) {
    it(`hydrates ${mode} without mismatches and opens the real named dialog`, async () => {
      const root = document.createElement("div");
      const context: SSRContext = {};
      root.innerHTML = await renderToString(app(mode), context);
      const removeTeleports = installSsrTeleports(context);
      document.body.append(root);
      const warnings: string[] = [];
      const client = app(mode);
      client.config.warnHandler = (message) => warnings.push(message);
      try {
        client.mount(root);
        await nextTick();
        const trigger = node<HTMLButtonElement>(
          root,
          'button[data-adapttable-part="filters-button"]'
        );
        trigger.focus();
        trigger.click();
        await nextTick();
        await new Promise((resolve) => setTimeout(resolve, 0));
        await nextTick();
        const dialog = node(document, '[role="dialog"]');
        expect(dialog.getAttribute("aria-label")).toBe("Filters");
        expect(trigger.getAttribute("aria-expanded")).toBe("true");
        expect(warnings).toEqual([]);
      } finally {
        client.unmount();
        root.remove();
        removeTeleports();
      }
    });
  }
});
