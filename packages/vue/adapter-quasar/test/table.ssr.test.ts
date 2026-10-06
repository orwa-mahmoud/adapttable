import { readFileSync, writeFileSync } from "node:fs";

import { Quasar } from "quasar";
import { describe, expect, it } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";

import { tableFixture } from "./tableFixture";

async function render(
  mobile: boolean,
  suffix = "",
  selectedIds: readonly string[] = []
) {
  const app = createSSRApp({
    render: () => tableFixture(mobile, suffix, selectedIds),
  });
  const context = { req: { headers: {} } };
  Reflect.apply(Quasar.install, Quasar, [app, { config: {} }, context]);
  return renderToString(app, context);
}

describe("Quasar assembled table on the actual server build", () => {
  it.each([false, true])(
    "renders the mobile=%s fixture without browser globals",
    async (mobile) => {
      expect(typeof window).toBe("undefined");
      expect(typeof document).toBe("undefined");
      const html = await render(mobile);
      expect(html).toContain('dir="rtl"');
      expect(html).toContain('data-adapttable-part="search"');
      expect(html).toContain(
        mobile ? 'data-adapttable-part="cards"' : 'data-adapttable-part="table"'
      );
      expect(html).toContain("Ada");
      expect(html).not.toContain("Bea");
      const path = `${import.meta.dirname}/server-table-${mobile ? "mobile" : "desktop"}.html`;
      if (process.env.ADAPTTABLE_UPDATE_SSR_FIXTURE === "1")
        writeFileSync(path, html);
      expect(html).toBe(readFileSync(path, "utf8"));
    }
  );
  it("keeps parallel host data and selection isolated", async () => {
    const [first, second] = await Promise.all([
      render(false, " one", ["a"]),
      render(false, " two"),
    ]);
    expect(first).toContain("Ada one");
    expect(first).not.toContain("Ada two");
    expect(first).toContain('aria-checked="true"');
    expect(second).toContain("Ada two");
    expect(second).not.toContain("Ada one");
    expect(second).not.toContain('aria-checked="true"');
  });
});
