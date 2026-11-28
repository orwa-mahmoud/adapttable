import { describe, expect, it } from "vitest";
import { createSSRApp, h, nextTick } from "vue";
import { renderToString, type SSRContext } from "vue/server-renderer";

import DataTable from "../src/DataTable.vue";
import { grouping } from "../src/grouping";
import { rowDetail } from "../src/row-detail";
import { selection } from "../src/selection";
import { node } from "./mount";
import { installSsrTeleports } from "./ssr-teleports";
interface Row {
  id: string;
  name: string;
  team: string;
}
function app(mobile: boolean) {
  const value = createSSRApp(() =>
    h(DataTable<Row>, {
      data: [
        { id: "a", name: "Ada", team: "Core" },
        { id: "b", name: "Bea", team: "Core" },
      ],
      columns: [{ key: "name" }, { key: "team" }],
      rowKey: (row) => row.id,
      urlSync: false,
      forceMobile: mobile,
      features: [
        selection({ selectedIds: ["a"] }),
        grouping("team"),
        rowDetail<Row>((row) => h("p", `Details for ${row.name}`)),
      ],
    })
  );
  return value;
}
describe("Ant Design Vue hierarchy hydration", () => {
  for (const mobile of [false, true]) {
    it(`hydrates actual group controls and keeps them interactive, mobile=${mobile}`, async () => {
      const context: SSRContext = {};
      const root = document.createElement("div");
      root.innerHTML = await renderToString(app(mobile), context);
      const cleanup = installSsrTeleports(context);
      document.body.append(root);
      const client = app(mobile);
      const warnings: string[] = [];
      client.config.warnHandler = (message) => warnings.push(message);
      try {
        client.mount(root);
        await nextTick();
        await new Promise((resolve) => setTimeout(resolve, 40));
        await nextTick();
        const input = node<HTMLInputElement>(
          root,
          '[data-adapttable-part="group-select"]'
        );
        expect(input.closest("label")?.control).toBe(input);
        expect(input.indeterminate).toBe(true);
        const toggle = node<HTMLButtonElement>(
          root,
          '[data-adapttable-part="group-toggle"]'
        );
        expect(toggle.classList.contains("ant-btn")).toBe(true);
        toggle.click();
        await nextTick();
        expect(root.textContent).not.toContain("Ada");
        expect(warnings).toEqual([]);
      } finally {
        client.unmount();
        root.remove();
        cleanup();
      }
    });
  }
});
