import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import { expect, it, vi } from "vitest";
import { createSSRApp, h, nextTick } from "vue";
import { renderToString, type SSRContext } from "vue/server-renderer";

import { columnMenu } from "../src/column-menu";
import DataTable from "../src/DataTable.vue";
import { node } from "./mount";
import { installSsrTeleports } from "./ssr-teleports";
interface Row {
  id: string;
  name: string;
}
it("hydrates the same native Columns trigger and connects it to the real dialog content", async () => {
  function app() {
    const result = createSSRApp(() =>
      h(DataTable<Row>, {
        data: [{ id: "a", name: "Ada" }],
        columns: [{ key: "name", header: "Name", renameable: true }],
        rowKey: (row) => row.id,
        urlSync: false,
        searchable: false,
        forceMobile: false,
        features: [columnMenu()],
      })
    );
    result.provide(ID_INJECTION_KEY, { prefix: 9800, current: 0 });
    result.provide(ZINDEX_INJECTION_KEY, { current: 0 });
    return result;
  }
  const context: SSRContext = {};
  const root = document.createElement("div");
  root.innerHTML = await renderToString(app(), context);
  const cleanup = installSsrTeleports(context);
  document.body.append(root);
  const trigger = node<HTMLButtonElement>(
    root,
    '[data-adapttable-part="column-menu-button"]'
  );
  const client = app();
  const warnings: string[] = [];
  client.config.warnHandler = (message) => warnings.push(message);
  const errors = vi.spyOn(console, "error");
  try {
    client.mount(root);
    await nextTick();
    await nextTick();
    expect(node(root, '[data-adapttable-part="column-menu-button"]')).toBe(
      trigger
    );
    trigger.focus();
    trigger.click();
    await nextTick();
    await vi.waitFor(() =>
      expect(
        document.querySelector('[data-adapttable-part="column-menu-panel"]')
      ).not.toBeNull()
    );
    const panel = node<HTMLElement>(
      document,
      '[data-adapttable-part="column-menu-panel"]'
    );
    expect(panel.getAttribute("role")).toBe("dialog");
    expect(trigger.getAttribute("aria-controls")).toBe(panel.id);
    await vi.waitFor(() =>
      expect(document.activeElement).toBe(
        node(panel, '[data-adapttable-part="column-menu-search"]')
      )
    );
    expect(warnings).toEqual([]);
    expect(errors).not.toHaveBeenCalled();
  } finally {
    client.unmount();
    root.remove();
    cleanup();
  }
});
