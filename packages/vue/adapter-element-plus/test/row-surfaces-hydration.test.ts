import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h, nextTick } from "vue";
import { renderToString, type SSRContext } from "vue/server-renderer";

import DataTable from "../src/DataTable.vue";
import { extraRows, pinnedSummaryRows, rowPinning } from "../src/rows";
import { node } from "./mount";
import { installSsrTeleports } from "./ssr-teleports";
interface Row {
  id: string;
  name: string;
}
const rows: Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Bea" },
];
function app(mobile: boolean) {
  const instance = createSSRApp(() =>
    h(DataTable<Row>, {
      data: rows,
      columns: [{ key: "name" }],
      rowKey: (row) => row.id,
      urlSync: false,
      forceMobile: mobile,
      features: [
        rowPinning({ pinnedRowIds: { top: ["b"], bottom: [] } }),
        pinnedSummaryRows<Row>({ bottom: [{ id: "sum", name: "Total" }] }),
        extraRows([
          {
            key: "note",
            kind: "fullWidth",
            beforeRowId: "a",
            render: () => "Note",
          },
        ]),
      ],
    })
  );
  instance.provide(ID_INJECTION_KEY, { prefix: 6650, current: 0 });
  instance.provide(ZINDEX_INJECTION_KEY, { current: 0 });
  return instance;
}
describe("Element Plus row surface hydration", () => {
  for (const mobile of [false, true]) {
    it(`adopts the native rows and reorders accepted pins only after activation, mobile=${mobile}`, async () => {
      const context: SSRContext = {};
      const root = document.createElement("div");
      root.innerHTML = await renderToString(app(mobile), context);
      const cleanup = installSsrTeleports(context);
      document.body.append(root);
      const first = node<HTMLElement>(root, '[data-row-id="a"]');
      const pinned = node<HTMLElement>(root, '[data-row-id="b"]');
      expect(root.querySelector("[data-row-id]")).toBe(first);
      const client = app(mobile);
      const warnings: string[] = [];
      client.config.warnHandler = (message) => warnings.push(message);
      const errors = vi.spyOn(console, "error");
      try {
        client.mount(root);
        await nextTick();
        await new Promise((resolve) => setTimeout(resolve, 0));
        await nextTick();
        expect(node(root, '[data-row-id="a"]')).toBe(first);
        expect(node(root, '[data-row-id="b"]')).toBe(pinned);
        expect(root.querySelector("[data-row-id]")).toBe(pinned);
        expect(pinned.getAttribute("data-adapttable-part")).toBe("pinned-top");
        expect(
          node<HTMLButtonElement>(
            pinned,
            '[data-adapttable-part="action-button"]'
          ).classList.contains("el-button")
        ).toBe(true);
        expect(root.textContent).toContain("Total");
        expect(root.textContent).toContain("Note");
        expect(warnings).toEqual([]);
        expect(errors).not.toHaveBeenCalled();
      } finally {
        client.unmount();
        root.remove();
        cleanup();
      }
    });
  }
});
