import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h, nextTick } from "vue";
import { renderToString, type SSRContext } from "vue/server-renderer";

import DataTable from "../src/DataTable.vue";
import { rowActions } from "../src/row-actions";
import { node } from "./mount";
import { installSsrTeleports } from "./ssr-teleports";

interface Row {
  id: string;
  name: string;
}
const rows: readonly Row[] = [{ id: "a", name: "Ada" }];
function app(mobile: boolean, onClick: (row: Row) => void) {
  const value = createSSRApp(() =>
    h(DataTable<Row>, {
      data: rows,
      columns: [{ key: "name" }],
      rowKey: (row) => row.id,
      urlSync: false,
      forceMobile: mobile,
      features: [
        rowActions<Row>([{ key: "open", label: "Open row", onClick }]),
      ],
    })
  );
  value.provide(ID_INJECTION_KEY, { prefix: 6250, current: 0 });
  value.provide(ZINDEX_INJECTION_KEY, { current: 0 });
  return value;
}

describe("Element Plus row action hydration", () => {
  for (const mobile of [false, true]) {
    it(`retains the server row and activates one genuine action after mount, mobile=${mobile}`, async () => {
      const run = vi.fn();
      const context: SSRContext = {};
      const root = document.createElement("div");
      root.innerHTML = await renderToString(app(mobile, run), context);
      const cleanup = installSsrTeleports(context);
      document.body.append(root);
      const row = node<HTMLElement>(
        root,
        `[data-adapttable-part="${mobile ? "card" : "row"}"][data-row-id="a"]`
      );
      expect(
        root.querySelector('[data-adapttable-part="action-button"]')
      ).toBeNull();
      const client = app(mobile, run);
      const warnings: string[] = [];
      client.config.warnHandler = (message) => warnings.push(message);
      const errors = vi.spyOn(console, "error");
      try {
        client.mount(root);
        await nextTick();
        await new Promise((resolve) => setTimeout(resolve, 0));
        await nextTick();
        expect(
          node(
            root,
            `[data-adapttable-part="${mobile ? "card" : "row"}"][data-row-id="a"]`
          )
        ).toBe(row);
        expect(row.isConnected).toBe(true);
        const action = node<HTMLButtonElement>(
          row,
          '[data-adapttable-part="action-button"]'
        );
        expect(action.tagName).toBe("BUTTON");
        expect(action.classList.contains("el-button")).toBe(true);
        expect(action.getAttribute("aria-label")).toBe("Open row");
        expect(action.disabled).toBe(false);
        action.click();
        await nextTick();
        expect(run).toHaveBeenCalledExactlyOnceWith(rows[0]);
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
