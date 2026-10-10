import { readFileSync } from "node:fs";

import { Quasar } from "quasar";
import { expect, it, vi } from "vitest";
import { createSSRApp, nextTick } from "vue";

import { actionsFixture } from "./actionsFixture";

it("hydrates action and status nodes without replacement or warnings", async () => {
  const root = document.createElement("div");
  root.innerHTML = readFileSync(
    `${import.meta.dirname}/server-actions.html`,
    "utf8"
  );
  document.body.append(root);
  const find = (name: string) =>
    root.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);
  const before = [
    "print-button",
    "bulk-button",
    "find-button",
    "status-bar",
  ].map((name) => [name, find(name)] as const);
  const printed = vi.fn();
  const app = createSSRApp({ render: () => actionsFixture(printed) });
  app.use(Quasar);
  const warnings = vi.spyOn(console, "warn");
  const errors = vi.spyOn(console, "error");
  try {
    app.mount(root);
    await nextTick();
    for (const [name, element] of before) expect(find(name)).toBe(element);
    find("print-button")?.click();
    expect(printed).toHaveBeenCalledTimes(1);
    expect(warnings).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
  } finally {
    app.unmount();
    root.remove();
  }
  await new Promise((resolve) => setTimeout(resolve, 40));
});
