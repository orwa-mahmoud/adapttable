import type { UrlStateAdapter } from "@adapttable/vue";
import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import { expect, it, vi } from "vitest";
import { createSSRApp, h, nextTick } from "vue";
import { renderToString, type SSRContext } from "vue/server-renderer";

import DataTable from "../src/DataTable.vue";
import { findInTable } from "../src/find-in-table";
import { node } from "./mount";
import { installSsrTeleports } from "./ssr-teleports";
interface Row {
  id: string;
  name: string;
}
it("hydrates the same actual search input with matching value and then focuses it", async () => {
  const writes = vi.fn();
  const adapter: UrlStateAdapter = {
    getSearch: () => "find=Ada",
    setSearch: writes,
    subscribe: () => () => undefined,
  };
  function app() {
    const result = createSSRApp(() =>
      h(DataTable<Row>, {
        data: [{ id: "a", name: "Ada" }],
        columns: [{ key: "name" }],
        rowKey: (row) => row.id,
        forceMobile: false,
        searchable: false,
        urlAdapter: adapter,
        features: [findInTable({ button: true })],
      })
    );
    result.provide(ID_INJECTION_KEY, { prefix: 9200, current: 0 });
    result.provide(ZINDEX_INJECTION_KEY, { current: 0 });
    return result;
  }
  const context: SSRContext = {};
  const root = document.createElement("div");
  root.innerHTML = await renderToString(app(), context);
  const cleanup = installSsrTeleports(context);
  document.body.append(root);
  const input = node<HTMLInputElement>(
    root,
    '[data-adapttable-part="find-input"]'
  );
  expect(input.value).toBe("Ada");
  const client = app();
  const warnings: string[] = [];
  client.config.warnHandler = (message) => warnings.push(message);
  const errors = vi.spyOn(console, "error");
  try {
    client.mount(root);
    await nextTick();
    await nextTick();
    expect(node(root, '[data-adapttable-part="find-input"]')).toBe(input);
    expect(input.value).toBe("Ada");
    expect(document.activeElement).toBe(input);
    expect(warnings).toEqual([]);
    expect(errors).not.toHaveBeenCalled();
    expect(writes).not.toHaveBeenCalled();
  } finally {
    client.unmount();
    root.remove();
    cleanup();
  }
});
