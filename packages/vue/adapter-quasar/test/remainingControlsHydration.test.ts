import { readFileSync } from "node:fs";

import { Quasar } from "quasar";
import { expect, it, vi } from "vitest";
import { createSSRApp, nextTick } from "vue";

import { remainingControlsFixture } from "./remainingControlsFixture";
it.each([false, true])(
  "hydrates seven remaining factories with stable grouping targets and no warnings, mobile=%s",
  async (mobile) => {
    const root = document.createElement("div");
    root.innerHTML = readFileSync(
      `${import.meta.dirname}/server-remaining-${mobile ? "mobile" : "desktop"}.html`,
      "utf8"
    );
    document.body.append(root);
    const group = root.querySelector('[data-adapttable-part="grouping-panel"]');
    const app = createSSRApp({
      render: () => remainingControlsFixture(mobile),
    });
    app.use(Quasar);
    const warnings = vi.spyOn(console, "warn");
    const errors = vi.spyOn(console, "error");
    try {
      app.mount(root);
      await nextTick();
      await nextTick();
      expect(
        root.querySelector('[data-adapttable-part="grouping-panel"]')
      ).toBe(group);
      expect(
        root.querySelector('[data-adapttable-part="command-palette-button"]')
      ).not.toBeNull();
      expect(
        root.querySelector('[data-adapttable-part="side-panel"]')
      ).not.toBeNull();
      expect(
        root.querySelector(
          `[data-adapttable-part="${mobile ? "row-reorder-down" : "row-reorder-handle"}"]`
        )
      ).not.toBeNull();
      expect(warnings).not.toHaveBeenCalled();
      expect(errors).not.toHaveBeenCalled();
    } finally {
      app.unmount();
      root.remove();
    }
  }
);
