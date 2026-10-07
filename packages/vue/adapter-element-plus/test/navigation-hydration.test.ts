import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import { expect, it, vi } from "vitest";
import { createSSRApp, h, nextTick } from "vue";
import { renderToString, type SSRContext } from "vue/server-renderer";

import {
  cellNavigation,
  columnSelectionCheckbox,
} from "../src/cell-navigation";
import DataTable from "../src/DataTable.vue";
import { statusBar } from "../src/status-bar";
import { node } from "./mount";
import { installSsrTeleports } from "./ssr-teleports";
interface Row {
  id: string;
  score: number;
}
it("hydrates the same semantic cell and kit status node before activating native column selection", async () => {
  function app() {
    const result = createSSRApp(() =>
      h(DataTable<Row>, {
        data: [
          { id: "a", score: 10 },
          { id: "b", score: 30 },
        ],
        columns: [{ key: "score" }],
        rowKey: (row) => row.id,
        forceMobile: false,
        searchable: false,
        urlSync: false,
        features: [cellNavigation(), columnSelectionCheckbox(), statusBar()],
      })
    );
    result.provide(ID_INJECTION_KEY, { prefix: 9500, current: 0 });
    result.provide(ZINDEX_INJECTION_KEY, { current: 0 });
    return result;
  }
  const context: SSRContext = {};
  const root = document.createElement("div");
  root.innerHTML = await renderToString(app(), context);
  const cleanup = installSsrTeleports(context);
  document.body.append(root);
  const cell = node<HTMLElement>(root, "tbody td");
  const item = node<HTMLElement>(root, '[data-adapttable-part="status-item"]');
  const client = app();
  const warnings: string[] = [];
  client.config.warnHandler = (message) => warnings.push(message);
  const errors = vi.spyOn(console, "error");
  try {
    client.mount(root);
    await nextTick();
    await nextTick();
    expect(node(root, "tbody td")).toBe(cell);
    expect(node(root, '[data-adapttable-part="status-item"]')).toBe(item);
    expect(cell.getAttribute("role")).toBe("gridcell");
    const checkbox = node<HTMLInputElement>(
      root,
      '[data-adapttable-part="column-select"] input'
    );
    checkbox.click();
    await nextTick();
    expect(checkbox.checked).toBe(true);
    expect(document.activeElement).toBe(cell);
    expect(root.querySelectorAll('td[aria-selected="true"]')).toHaveLength(2);
    expect(warnings).toEqual([]);
    expect(errors).not.toHaveBeenCalled();
  } finally {
    client.unmount();
    root.remove();
    cleanup();
  }
});
