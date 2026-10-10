import { readFileSync } from "node:fs";

import { Quasar } from "quasar";
import { expect, it, vi } from "vitest";
import { createSSRApp, nextTick } from "vue";

import { featuresFixture } from "./featuresFixture";
it.each([false, true])(
  "hydrates exact feature SSR output and edits mobile=%s without replacing targets",
  async (mobile) => {
    const container = document.createElement("div");
    container.innerHTML = readFileSync(
      `${import.meta.dirname}/server-features-${mobile ? "mobile" : "desktop"}.html`,
      "utf8"
    );
    document.body.append(container);
    const activate = container.querySelector<HTMLElement>(
      '[data-adapttable-part="edit-cell-activate"]'
    );
    const filter = container.querySelector(
      '[data-adapttable-part="filters-button"]'
    );
    const edit = vi.fn();
    const app = createSSRApp({ render: () => featuresFixture(mobile, edit) });
    app.use(Quasar);
    const warnings = vi.spyOn(console, "warn");
    const errors = vi.spyOn(console, "error");
    try {
      app.mount(container);
      await nextTick();
      await nextTick();
      expect(
        container.querySelector('[data-adapttable-part="edit-cell-activate"]')
      ).toBe(activate);
      expect(
        container.querySelector('[data-adapttable-part="filters-button"]')
      ).toBe(filter);
      expect(warnings).not.toHaveBeenCalled();
      expect(errors).not.toHaveBeenCalled();
      activate?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "F2", keyCode: 113, bubbles: true })
      );
      await nextTick();
      await nextTick();
      const input = container.querySelector<HTMLInputElement>(
        '[data-adapttable-part="edit-cell-editor"]'
      );
      expect(document.activeElement).toBe(input);
      if (!input) throw new Error("Missing editor");
      input.value = "Hydrated";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await nextTick();
      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          keyCode: 13,
          bubbles: true,
        })
      );
      await nextTick();
      await nextTick();
      expect(edit).toHaveBeenCalledExactlyOnceWith(
        { id: "1", name: "Ada" },
        "name",
        "Hydrated"
      );
      expect(container.querySelector("label label")).toBeNull();
    } finally {
      app.unmount();
      container.remove();
    }
  }
);
