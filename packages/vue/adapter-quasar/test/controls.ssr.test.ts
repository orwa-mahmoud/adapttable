import { readFileSync, writeFileSync } from "node:fs";

import { Quasar } from "quasar";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";

import { controlsFixture } from "./fixture";

describe("Quasar server build", () => {
  it("renders isolated requests with the official SSR context and no browser globals", async () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
    const target = vi.fn();
    async function render(value: string, checked: boolean) {
      const app = createSSRApp({
        render: () => controlsFixture(value, checked, target),
      });
      const context = { req: { headers: {} } };
      // Quasar's server install accepts its SSR context as the third argument.
      Reflect.apply(Quasar.install, Quasar, [app, { config: {} }, context]);
      return renderToString(app, context);
    }
    const [first, second] = await Promise.all([
      render("First request", false),
      render("Second request", true),
    ]);
    expect(first).toContain('value="First request"');
    expect(first).toContain('aria-checked="false"');
    expect(first).not.toContain("Second request");
    expect(second).toContain('value="Second request"');
    expect(second).toContain('aria-checked="true"');
    expect(second).not.toContain("First request");
    for (const html of [first, second]) {
      expect(html).toContain('role="combobox"');
      expect(html).toContain('dir="rtl"');
      expect(html).toContain('data-adapttable-part="filter-input"');
      expect(html).toContain('data-adapttable-part="fullscreen-toggle"');
      expect(html).toContain('id="query"');
      expect(html).toContain('id="choice"');
    }
    const fixture = new URL("./server-controls.html", import.meta.url);
    if (process.env.ADAPTTABLE_UPDATE_SSR_FIXTURE === "1")
      writeFileSync(fixture, first);
    expect(first).toBe(readFileSync(fixture, "utf8"));
    expect(target).not.toHaveBeenCalled();
  });
});
