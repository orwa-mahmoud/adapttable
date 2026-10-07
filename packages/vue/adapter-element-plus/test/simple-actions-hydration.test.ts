import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import { expect, it, vi } from "vitest";
import { createSSRApp, h, nextTick } from "vue";
import { renderToString, type SSRContext } from "vue/server-renderer";

import { bulkActions } from "../src/bulk-actions";
import DataTable from "../src/DataTable.vue";
import { print } from "../src/print";
import { node } from "./mount";
import { installSsrTeleports } from "./ssr-teleports";
interface Row {
  id: string;
  name: string;
}
it("hydrates the same bulk and print buttons without running their commands", async () => {
  const action = vi.fn();
  const printed = vi.fn();
  const create = () => {
    const app = createSSRApp(() =>
      h(DataTable<Row>, {
        data: [{ id: "a", name: "Ada" }],
        columns: [{ key: "name" }],
        rowKey: (row) => row.id,
        selectedIds: ["a"],
        selectable: true,
        urlSync: false,
        searchable: false,
        forceMobile: false,
        features: [
          bulkActions([{ key: "archive", label: "Archive", onClick: action }]),
          print(printed, true),
        ],
      })
    );
    app.provide(ID_INJECTION_KEY, { prefix: 13100, current: 0 });
    app.provide(ZINDEX_INJECTION_KEY, { current: 0 });
    return app;
  };
  const context: SSRContext = {};
  const root = document.createElement("div");
  root.innerHTML = await renderToString(create(), context);
  const cleanup = installSsrTeleports(context);
  document.body.append(root);
  const bulk = node<HTMLButtonElement>(
    root,
    '[data-adapttable-part="bulk-button"]'
  );
  const trigger = node<HTMLButtonElement>(
    root,
    '[data-adapttable-part="print-button"]'
  );
  const client = create();
  const warnings: string[] = [];
  client.config.warnHandler = (message) => warnings.push(message);
  const errors = vi.spyOn(console, "error");
  try {
    client.mount(root);
    await nextTick();
    await nextTick();
    expect(node(root, '[data-adapttable-part="bulk-button"]')).toBe(bulk);
    expect(node(root, '[data-adapttable-part="print-button"]')).toBe(trigger);
    expect(action).not.toHaveBeenCalled();
    expect(printed).not.toHaveBeenCalled();
    trigger.click();
    expect(printed).toHaveBeenCalledTimes(1);
    bulk.click();
    await nextTick();
    await nextTick();
    expect(action).toHaveBeenCalledTimes(1);
    expect(warnings).toEqual([]);
    expect(errors).not.toHaveBeenCalled();
  } finally {
    client.unmount();
    root.remove();
    cleanup();
  }
});
