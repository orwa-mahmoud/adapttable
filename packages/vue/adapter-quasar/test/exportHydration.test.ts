import { readFileSync } from "node:fs";

import { Quasar } from "quasar";
import { expect, it, vi } from "vitest";
import { createSSRApp, nextTick } from "vue";

import { exportFixture } from "./exportFixture";

it.each([false, true])(
  "hydrates stable native export buttons mobile=%s",
  async (mobile) => {
    const root = document.createElement("div");
    root.innerHTML = readFileSync(
      `${import.meta.dirname}/server-export-${mobile ? "mobile" : "desktop"}.html`,
      "utf8"
    );
    document.body.append(root);
    const selector = '[data-adapttable-part="export-csv-button"]';
    const buttons = [...root.querySelectorAll<HTMLButtonElement>(selector)];
    const requested = vi.fn();
    const app = createSSRApp({
      render: () => exportFixture(mobile, requested),
    });
    app.use(Quasar);
    const warnings = vi.spyOn(console, "warn");
    const errors = vi.spyOn(console, "error");
    try {
      app.mount(root);
      await nextTick();
      expect([...root.querySelectorAll(selector)]).toEqual(buttons);
      expect(requested).not.toHaveBeenCalled();
      for (const button of buttons) {
        button.focus();
        button.click();
        await nextTick();
        expect(document.activeElement).toBe(button);
      }
      expect(requested).toHaveBeenCalledTimes(3);
      expect(warnings).not.toHaveBeenCalled();
      expect(errors).not.toHaveBeenCalled();
    } finally {
      app.unmount();
      root.remove();
    }
  }
);
