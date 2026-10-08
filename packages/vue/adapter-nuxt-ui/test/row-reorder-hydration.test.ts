import UApp from "@nuxt/ui/components/App.vue";
import ui from "@nuxt/ui/vue-plugin";
import { expect, it, vi } from "vitest";
import { createSSRApp, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { NuxtRowMoveMenu } from "../src/reorder/NuxtRowMoveMenu";
import { rowReorder } from "../src/row-reorder";

it.each([false, true])(
  "hydrates the native reorder target in place and invokes one host write (mobile=%s)",
  async (forceMobile) => {
    const moved = vi.fn();
    const rows = [{ id: "a" }, { id: "b" }];
    const features = [rowReorder<{ id: string }>(moved)];
    const app = () =>
      createSSRApp({
        render: () =>
          h(DataTable<{ id: string }>, {
            data: rows,
            columns: [{ key: "id" }],
            rowKey: (row) => row.id,
            urlSync: false,
            forceMobile,
            features,
          }),
      }).use(ui);
    const root = document.createElement("div");
    root.innerHTML = await renderToString(app());
    document.body.append(root);
    const selector = `[data-adapttable-part="row-reorder-${forceMobile ? "down" : "handle"}"]`;
    const original = root.querySelector<HTMLButtonElement>(selector);
    expect(original).toBeInstanceOf(HTMLButtonElement);
    const client = app();
    try {
      client.mount(root);
      await nextTick();
      expect(root.querySelector(selector)).toBe(original);
      if (forceMobile) original?.click();
      else
        for (const key of [" ", "ArrowDown", " "]) {
          original?.dispatchEvent(
            new KeyboardEvent("keydown", {
              key,
              bubbles: true,
              cancelable: true,
            })
          );
          await nextTick();
        }
      await nextTick();
      expect(moved).toHaveBeenCalledExactlyOnceWith(0, 1, rows[0]);
      expect(root.querySelector(selector)).toBe(original);
    } finally {
      client.unmount();
      root.remove();
    }
  }
);

it("hydrates a supplied native destination trigger in place and resolves its semantic menu ID after opening", async () => {
  const selected = vi.fn();
  const app = () =>
    createSSRApp({
      render: () =>
        h(UApp, { toaster: null }, () =>
          h(NuxtRowMoveMenu, {
            label: "Move to group",
            items: [
              {
                id: "design",
                label: "Design",
                disabled: false,
                onSelect: selected,
              },
            ],
          })
        ),
    }).use(ui);
  const root = document.createElement("div");
  root.innerHTML = await renderToString(app());
  document.body.append(root);
  const trigger = root.querySelector<HTMLButtonElement>(
    '[data-adapttable-part="row-move-menu-trigger"]'
  );
  expect(trigger).toBeInstanceOf(HTMLButtonElement);
  const client = app();
  try {
    client.mount(root);
    await nextTick();
    expect(
      root.querySelector('[data-adapttable-part="row-move-menu-trigger"]')
    ).toBe(trigger);
    trigger?.click();
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 25));
    await nextTick();
    const menu = document.querySelector(
      '[data-adapttable-part="row-move-menu-content"]'
    );
    expect(menu?.getAttribute("role")).toBe("menu");
    expect(
      document.getElementById(trigger?.getAttribute("aria-controls") ?? "")
    ).toBe(menu);
    menu?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.click();
    await nextTick();
    expect(selected).toHaveBeenCalledTimes(1);
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
  } finally {
    client.unmount();
    root.remove();
  }
});
