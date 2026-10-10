import ui from "@nuxt/ui/vue-plugin";
import { expect, it, vi } from "vitest";
import { createSSRApp, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { savedViews, SavedViewsPanel } from "../src/saved-views";

const part = (name: string) => `[data-adapttable-part="${name}"]`;
async function settle() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 25));
  await nextTick();
}
it("hydrates native panel and toolbar controls in place and maintains the disclosure target through reopen", async () => {
  const applied = vi.fn();
  const app = () =>
    createSSRApp({
      render: () =>
        h("div", [
          h(SavedViewsPanel, {
            views: [{ name: "Mine", search: "" }],
            onApply: applied,
            onRename: () => undefined,
            onMove: () => undefined,
            onSetDefault: () => undefined,
            onRemove: () => undefined,
          }),
          h(DataTable<{ id: string }>, {
            data: [{ id: "a" }],
            columns: [{ key: "id" }],
            rowKey: (row) => row.id,
            urlSync: false,
            forceMobile: false,
            features: [
              savedViews({ storageKey: "nuxt-hydration", storage: null }),
            ],
          }),
        ]),
    }).use(ui);
  const root = document.createElement("div");
  root.innerHTML = await renderToString(app());
  document.body.append(root);
  const trigger = root.querySelector<HTMLButtonElement>(part("views-button"));
  const apply = root.querySelector<HTMLButtonElement>(
    `${part("saved-view-caption")} button`
  );
  expect(trigger).toBeInstanceOf(HTMLButtonElement);
  expect(apply).toBeInstanceOf(HTMLButtonElement);
  const client = app();
  try {
    client.mount(root);
    await settle();
    expect(root.querySelector(part("views-button"))).toBe(trigger);
    expect(root.querySelector(`${part("saved-view-caption")} button`)).toBe(
      apply
    );
    apply?.click();
    expect(applied).toHaveBeenCalledExactlyOnceWith("Mine");
    for (let cycle = 0; cycle < 2; cycle++) {
      trigger?.click();
      await settle();
      const panel = document.querySelector<HTMLElement>(part("views-panel"));
      expect(panel?.getAttribute("role")).toBe("dialog");
      expect(panel?.getAttribute("data-slot")).toBe("content");
      expect(
        document.getElementById(trigger?.getAttribute("aria-controls") ?? "")
      ).toBe(panel);
      panel?.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true,
        })
      );
      await settle();
      expect(document.querySelector(part("views-panel"))).toBeNull();
      expect(trigger?.hasAttribute("aria-controls")).toBe(false);
      expect(document.activeElement).toBe(trigger);
    }
  } finally {
    client.unmount();
    root.remove();
  }
});
