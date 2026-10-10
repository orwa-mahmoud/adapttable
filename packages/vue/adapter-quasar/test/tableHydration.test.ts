import { readFileSync } from "node:fs";

import { Quasar } from "quasar";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, nextTick } from "vue";

import { tableFixture } from "./tableFixture";

const settle = async () => {
  await nextTick();
  await nextTick();
};

describe("assembled Quasar table hydration", () => {
  it.each([false, true])(
    "hydrates exact Node output and retains mobile=%s targets",
    async (mobile) => {
      const container = document.createElement("div");
      container.innerHTML = readFileSync(
        `${import.meta.dirname}/server-table-${mobile ? "mobile" : "desktop"}.html`,
        "utf8"
      );
      document.body.append(container);
      const search = container.querySelector<HTMLInputElement>(
        'input[type="search"]'
      );
      const row = container.querySelector(mobile ? "article" : "tbody tr");
      const select = container.querySelector(
        '[data-adapttable-part="rows-per-page"]'
      );
      const app = createSSRApp({ render: () => tableFixture(mobile) });
      app.use(Quasar);
      const warnings = vi.spyOn(console, "warn");
      const errors = vi.spyOn(console, "error");
      try {
        app.mount(container);
        await settle();
        expect(container.querySelector('input[type="search"]')).toBe(search);
        expect(container.querySelector(mobile ? "article" : "tbody tr")).toBe(
          row
        );
        expect(
          container.querySelector('[data-adapttable-part="rows-per-page"]')
        ).toBe(select);
        expect(container.querySelector("label label")).toBeNull();
        expect(warnings).not.toHaveBeenCalled();
        expect(errors).not.toHaveBeenCalled();
        if (!search) throw new Error("Missing search input");
        search.focus();
        search.value = "Bea";
        search.dispatchEvent(new Event("input", { bubbles: true }));
        await settle();
        expect(
          container.querySelector(mobile ? "article" : "tbody")?.textContent
        ).toContain("Bea");
        expect(container.querySelector('input[type="search"]')).toBe(search);
        expect(document.activeElement).toBe(search);
        const checkbox = container.querySelector<HTMLElement>(
          mobile ? 'article [role="checkbox"]' : 'tbody [role="checkbox"]'
        );
        checkbox?.click();
        await settle();
        expect(checkbox?.getAttribute("aria-checked")).toBe("false");
      } finally {
        app.unmount();
        container.remove();
      }
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );
    }
  );
});
