import type { ColumnDef } from "@adapttable/vue";
import ui from "@nuxt/ui/vue-plugin";
import { expect, it } from "vitest";
import { createSSRApp, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { columnMenu } from "../src/column-menu";

interface Row {
  id: string;
  name: string;
}
const columns: readonly ColumnDef<Row>[] = [{ key: "name", renameable: true }];
const settle = async () => {
  await nextTick();
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 25));
  await nextTick();
};

it("hydrates the genuine trigger and preserves semantic identity across reopen", async () => {
  const app = () =>
    createSSRApp({
      render: () =>
        h(DataTable<Row>, {
          data: [{ id: "a", name: "Ada" }],
          columns,
          rowKey: (row) => row.id,
          forceMobile: false,
          urlSync: false,
          features: [columnMenu()],
        }),
    }).use(ui);
  const root = document.createElement("div");
  root.innerHTML = await renderToString(app());
  document.body.append(root);
  const selector = '[data-adapttable-part="column-menu-button"]';
  const original = root.querySelector<HTMLButtonElement>(selector);
  expect(original).toBeInstanceOf(HTMLButtonElement);
  const client = app();
  try {
    client.mount(root);
    await settle();
    expect(root.querySelector(selector)).toBe(original);
    for (let cycle = 0; cycle < 2; cycle++) {
      original?.click();
      await settle();
      const panel = document.querySelector(
        '[data-adapttable-part="column-menu-panel"]'
      );
      expect(panel?.getAttribute("role")).toBe("dialog");
      expect(panel?.getAttribute("data-slot")).toBe("content");
      expect(
        document.getElementById(original?.getAttribute("aria-controls") ?? "")
      ).toBe(panel);
      expect(panel?.hasAttribute("data-reka-popper-content-wrapper")).toBe(
        false
      );
      panel?.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true,
        })
      );
      await settle();
      expect(
        document.querySelector('[data-adapttable-part="column-menu-panel"]')
      ).toBeNull();
      expect(original?.hasAttribute("aria-controls")).toBe(false);
      expect(document.activeElement).toBe(original);
    }
  } finally {
    client.unmount();
    root.remove();
  }
});
