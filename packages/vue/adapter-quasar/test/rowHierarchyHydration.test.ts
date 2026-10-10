import { readFileSync } from "node:fs";

import { Quasar } from "quasar";
import { expect, it, vi } from "vitest";
import { createSSRApp, nextTick } from "vue";

import { rowHierarchyFixture } from "./rowHierarchyFixture";

it.each([false, true])(
  "hydrates row and hierarchy targets without replacement, mobile=%s",
  async (mobile) => {
    const root = document.createElement("div");
    root.innerHTML = readFileSync(
      `${import.meta.dirname}/server-row-hierarchy-${mobile ? "mobile" : "desktop"}.html`,
      "utf8"
    );
    document.body.append(root);
    const find = (name: string) =>
      root.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);
    const before = [
      "tree-toggle",
      "expand-button",
      "nested-table",
      "pinned-summary-bottom",
    ].map((name) => [name, find(name)] as const);
    const app = createSSRApp({ render: () => rowHierarchyFixture(mobile) });
    app.use(Quasar);
    const warnings = vi.spyOn(console, "warn");
    const errors = vi.spyOn(console, "error");
    try {
      app.mount(root);
      await nextTick();
      for (const [name, element] of before) expect(find(name)).toBe(element);
      expect(find("action-button")?.classList.contains("q-btn")).toBe(true);
      expect(find("pinned-top")?.textContent).toContain("Bea");
      if (!mobile) expect(find("resize-handle")).not.toBeNull();
      find("tree-toggle")?.click();
      await nextTick();
      expect(find("tree-toggle")?.getAttribute("aria-expanded")).toBe("false");
      expect(warnings).not.toHaveBeenCalled();
      expect(errors).not.toHaveBeenCalled();
    } finally {
      app.unmount();
      root.remove();
    }
  }
);
