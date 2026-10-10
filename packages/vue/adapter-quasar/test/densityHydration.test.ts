import { readFileSync } from "node:fs";

import { Quasar } from "quasar";
import { expect, it, vi } from "vitest";
import { createSSRApp, nextTick } from "vue";

import { densityFixture } from "./densityFixture";

it.each([false, true])(
  "hydrates stable native density buttons mobile=%s",
  async (mobile) => {
    const root = document.createElement("div");
    root.innerHTML = readFileSync(
      `${import.meta.dirname}/server-density-${mobile ? "mobile" : "desktop"}.html`,
      "utf8"
    );
    document.body.append(root);
    const group = root.querySelector('[data-adapttable-part="density-toggle"]');
    const options = [...(group?.querySelectorAll("button") ?? [])];
    const changed = vi.fn();
    const app = createSSRApp({ render: () => densityFixture(mobile, changed) });
    app.use(Quasar);
    const warnings = vi.spyOn(console, "warn");
    const errors = vi.spyOn(console, "error");
    try {
      app.mount(root);
      await nextTick();
      expect(
        root.querySelector('[data-adapttable-part="density-toggle"]')
      ).toBe(group);
      expect([...group!.querySelectorAll("button")]).toEqual(options);
      options[1]!.focus();
      options[1]!.click();
      await nextTick();
      expect(changed).toHaveBeenCalledExactlyOnceWith("compact");
      expect(options[0]?.getAttribute("aria-pressed")).toBe("true");
      expect(document.activeElement).toBe(options[1]);
      expect(warnings).not.toHaveBeenCalled();
      expect(errors).not.toHaveBeenCalled();
    } finally {
      app.unmount();
      root.remove();
    }
  }
);
