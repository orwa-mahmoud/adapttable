import { readFileSync } from "node:fs";

import { Quasar } from "quasar";
import { expect, it, vi } from "vitest";
import { createSSRApp, h, nextTick } from "vue";

import { ColumnMenuFixture } from "./columnMenuFixture";

it("hydrates the actual Node column markup, preserves its trigger, and opens the native portal", async () => {
  const root = document.createElement("div");
  root.innerHTML = readFileSync(
    `${import.meta.dirname}/server-column-menu.html`,
    "utf8"
  );
  document.body.append(root);
  const trigger = root.querySelector<HTMLButtonElement>(
    '[data-adapttable-part="column-menu-button"]'
  );
  const app = createSSRApp({ render: () => h(ColumnMenuFixture) });
  app.use(Quasar);
  const warnings = vi.spyOn(console, "warn");
  const errors = vi.spyOn(console, "error");
  try {
    app.mount(root);
    await nextTick();
    expect(
      root.querySelector('[data-adapttable-part="column-menu-button"]')
    ).toBe(trigger);
    trigger?.click();
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 45));
    const panel = document.body.querySelector(
      '[data-adapttable-part="column-menu-panel"]'
    );
    expect(panel?.getAttribute("role")).toBe("dialog");
    expect(trigger?.getAttribute("aria-controls")).toBe(panel?.id);
    expect(warnings).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
  } finally {
    app.unmount();
    root.remove();
  }
  await new Promise((resolve) => setTimeout(resolve, 45));
});
