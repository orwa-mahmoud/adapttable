import ui from "@nuxt/ui/vue-plugin";
import { expect, it, vi } from "vitest";
import { createSSRApp, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { exportCsv } from "../src/export";
import { print } from "../src/print";
it("hydrates the real action buttons in place and invokes the current host callback", async () => {
  const printed = vi.fn();
  const props = {
    data: [{ id: "a", name: "Ada" }],
    columns: [{ key: "name" }],
    rowKey: (row: { id: string }) => row.id,
    urlSync: false,
    searchable: false,
    forceMobile: false,
    features: [
      print(printed, true),
      exportCsv<{ id: string; name: string }>({ request: vi.fn() }),
    ],
  };
  const create = () =>
    createSSRApp({
      render: () => h(DataTable<{ id: string; name: string }>, props),
    }).use(ui);
  const root = document.createElement("div");
  root.innerHTML = await renderToString(create());
  document.body.append(root);
  const before = [...root.querySelectorAll("button")];
  const app = create();
  try {
    app.mount(root);
    await nextTick();
    await nextTick();
    expect([...root.querySelectorAll("button")]).toEqual(before);
    root
      .querySelector<HTMLButtonElement>('[data-adapttable-part="print-button"]')
      ?.click();
    expect(printed).toHaveBeenCalledOnce();
  } finally {
    app.unmount();
    root.remove();
  }
});
