import ui from "@nuxt/ui/vue-plugin";
import { expect, it, vi } from "vitest";
import { createSSRApp, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { commandPalette } from "../src/command-palette";
import { contextMenu } from "../src/context-menu";
import { sidePanel } from "../src/side-panel";

it("hydrates workspace controls in place without changing controlled state", async () => {
  const change = vi.fn();
  const features = [
    commandPalette({ button: true }),
    contextMenu<{ id: string }>(),
    sidePanel({
      open: "one",
      panels: [{ key: "one", label: "Details", content: "Panel content" }],
      onOpenChange: change,
    }),
  ];
  const create = () =>
    createSSRApp({
      render: () =>
        h(DataTable<{ id: string }>, {
          data: [{ id: "one" }],
          columns: [{ key: "id" }],
          rowKey: (row) => row.id,
          urlSync: false,
          forceMobile: false,
          features,
        }),
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
      .querySelector<HTMLButtonElement>(
        '[data-adapttable-part="side-panel-close"]'
      )
      ?.click();
    expect(change).toHaveBeenCalledExactlyOnceWith(null);
  } finally {
    app.unmount();
    root.remove();
  }
});
