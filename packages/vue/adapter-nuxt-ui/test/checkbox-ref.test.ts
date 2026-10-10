import type { ElementRef } from "@adapttable/vue";
import ui from "@nuxt/ui/vue-plugin";
import { describe, expect, it, vi } from "vitest";
import { createApp, nextTick, type VNodeChild } from "vue";

import { nuxtSelection } from "../src/controls/selection";
import { nuxtFilterSlots } from "../src/filters/nuxtFilterSlots";

describe("Nuxt checkbox native-ref boundary", () => {
  it.each(["selection", "filter"] as const)(
    "delivers only the actual native %s checkbox to its owner",
    async (kind) => {
      const owner = vi.fn<ElementRef<HTMLElement>>();
      const attrs = { ref: owner, "aria-label": "Enabled" };
      const render = (): VNodeChild =>
        kind === "selection"
          ? nuxtSelection({
              attrs,
              checked: false,
              indeterminate: false,
              onToggle: vi.fn(),
            })
          : nuxtFilterSlots(() => ({})).Checkbox({
              label: "Enabled",
              checked: false,
              attrs,
              onChange: vi.fn(),
            });
      render();
      expect(owner).not.toHaveBeenCalled();
      const root = document.createElement("div");
      document.body.append(root);
      const app = createApp({ render }).use(ui);
      try {
        app.mount(root);
        await nextTick();
        await nextTick();
        const checkbox = root.querySelector<HTMLButtonElement>(
          'button[role="checkbox"]'
        );
        expect(checkbox).toBeInstanceOf(HTMLButtonElement);
        expect(checkbox?.getAttribute("aria-label")).toBe("Enabled");
        expect(owner.mock.calls).toEqual([[checkbox]]);
      } finally {
        app.unmount();
        root.remove();
      }
      expect(owner.mock.calls.at(-1)).toEqual([null]);
    }
  );
  it("retains checked state and the native label when no ref owner exists", async () => {
    const root = document.createElement("div");
    const app = createApp({
      render: () =>
        nuxtSelection({
          attrs: { ref: null, "aria-label": "Select row" },
          checked: true,
          indeterminate: false,
          onToggle: vi.fn(),
        }),
    }).use(ui);
    try {
      app.mount(root);
      await nextTick();
      const checkbox = root.querySelector('button[role="checkbox"]');
      expect(checkbox?.getAttribute("aria-label")).toBe("Select row");
      expect(checkbox?.getAttribute("aria-checked")).toBe("true");
    } finally {
      app.unmount();
    }
  });
});
