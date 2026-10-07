import { readFileSync } from "node:fs";

import { Quasar } from "quasar";
import { expect, it, vi } from "vitest";
import { createSSRApp, nextTick } from "vue";

import { savedViewsFixture } from "./savedViewsFixture";

it("hydrates the native saved-view surfaces and preserves their action and trigger nodes", async () => {
  const root = document.createElement("div");
  root.innerHTML = readFileSync(
    `${import.meta.dirname}/server-saved-views.html`,
    "utf8"
  );
  document.body.append(root);
  const before = root.querySelector(
    '[data-adapttable-part="saved-views-panel"]'
  );
  const apply = before?.querySelector<HTMLButtonElement>("button");
  const trigger = root.querySelector('[data-adapttable-part="views-button"]');
  const onApply = vi.fn();
  const app = createSSRApp({ render: () => savedViewsFixture(onApply) });
  app.use(Quasar);
  const warnings = vi.spyOn(console, "warn");
  const errors = vi.spyOn(console, "error");
  try {
    app.mount(root);
    await nextTick();
    expect(
      root.querySelector('[data-adapttable-part="saved-views-panel"]')
    ).toBe(before);
    expect(root.querySelector('[data-adapttable-part="views-button"]')).toBe(
      trigger
    );
    expect(before?.querySelector("button")).toBe(apply);
    apply?.click();
    expect(onApply).toHaveBeenCalledExactlyOnceWith("Mine");
    expect(warnings).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
  } finally {
    app.unmount();
    root.remove();
  }
  await new Promise((resolve) => setTimeout(resolve, 40));
});
