import ui from "@nuxt/ui/vue-plugin";
import { expect, it, vi } from "vitest";
import { createSSRApp, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { filters } from "../src/filters";

interface Row {
  id: string;
  name: string;
}
function app() {
  return createSSRApp({
    render: () =>
      h(DataTable<Row>, {
        data: [{ id: "a", name: "Ada" }],
        columns: [{ key: "name" }],
        rowKey: (row) => row.id,
        urlSync: false,
        forceMobile: false,
        dir: "rtl",
        features: [
          filters<Row>([{ key: "name", type: "text" }], { tree: true }),
        ],
      }),
  }).use(ui);
}
it("hydrates filtering without replacing its trigger or reporting mismatches", async () => {
  const warn = vi.spyOn(console, "warn");
  const error = vi.spyOn(console, "error");
  const root = document.createElement("div");
  root.innerHTML = await renderToString(app());
  document.body.append(root);
  const original = root.querySelector(
    '[data-adapttable-part="filters-button"]'
  );
  const client = app();
  try {
    client.mount(root);
    await nextTick();
    await nextTick();
    expect(root.querySelector('[data-adapttable-part="filters-button"]')).toBe(
      original
    );
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  } finally {
    client.unmount();
    root.remove();
  }
});
