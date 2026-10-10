import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import { expect, it, vi } from "vitest";
import { createSSRApp, h, nextTick } from "vue";
import { renderToString, type SSRContext } from "vue/server-renderer";

import { collapsibleColumnGroups, resizableColumns } from "../src/columns";
import DataTable from "../src/DataTable.vue";
import { node } from "./mount";
import { installSsrTeleports } from "./ssr-teleports";
interface Row {
  id: string;
  name: string;
  age: number;
}
function app() {
  const result = createSSRApp(() =>
    h(DataTable<Row>, {
      data: [{ id: "a", name: "Ada", age: 36 }],
      columns: [
        {
          header: "Person",
          collapsedKey: "name",
          children: [{ key: "name" }, { key: "age" }],
        },
      ],
      rowKey: (row) => row.id,
      forceMobile: false,
      urlSync: false,
      searchable: false,
      defaultColumnLayout: { collapsedGroups: ["Person"] },
      features: [collapsibleColumnGroups(), resizableColumns()],
    })
  );
  result.provide(ID_INJECTION_KEY, { prefix: 6800, current: 0 });
  result.provide(ZINDEX_INJECTION_KEY, { current: 0 });
  return result;
}
it("hydrates the same native group button and activates resize after mount", async () => {
  const context: SSRContext = {};
  const root = document.createElement("div");
  root.innerHTML = await renderToString(app(), context);
  const cleanup = installSsrTeleports(context);
  document.body.append(root);
  const toggle = node<HTMLButtonElement>(
    root,
    '[data-adapttable-part="column-group-toggle"]'
  );
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  expect(
    root.querySelector('[data-adapttable-part="resize-handle"]')
  ).toBeNull();
  const client = app();
  const warnings: string[] = [];
  client.config.warnHandler = (message) => warnings.push(message);
  const errors = vi.spyOn(console, "error");
  try {
    client.mount(root);
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await nextTick();
    expect(node(root, '[data-adapttable-part="column-group-toggle"]')).toBe(
      toggle
    );
    expect(
      node<HTMLButtonElement>(
        root,
        '[data-adapttable-part="resize-handle"]'
      ).classList.contains("el-button")
    ).toBe(true);
    toggle.focus();
    toggle.click();
    await nextTick();
    expect(node(root, '[data-adapttable-part="column-group-toggle"]')).toBe(
      toggle
    );
    expect(document.activeElement).toBe(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(root.querySelectorAll("tbody td")).toHaveLength(2);
    expect(warnings).toEqual([]);
    expect(errors).not.toHaveBeenCalled();
  } finally {
    client.unmount();
    root.remove();
    cleanup();
  }
});
