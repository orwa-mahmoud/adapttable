import { readFileSync, writeFileSync } from "node:fs";

import { Quasar } from "quasar";
import { expect, it } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";

import { densityFixture } from "./densityFixture";

it.each([false, true])(
  "renders both native density buttons in Node mobile=%s",
  async (mobile) => {
    expect(typeof document).toBe("undefined");
    const app = createSSRApp({ render: () => densityFixture(mobile) });
    const context = { req: { headers: {} } };
    Reflect.apply(Quasar.install, Quasar, [app, { config: {} }, context]);
    const html = await renderToString(app, context);
    expect(html).toContain('data-adapttable-part="density-toggle"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain("Comfortable");
    expect(html).toContain("Compact");
    expect(html).toContain('data-adapttable-part="rows-per-page"');
    const path = `${import.meta.dirname}/server-density-${mobile ? "mobile" : "desktop"}.html`;
    if (process.env.ADAPTTABLE_UPDATE_SSR_FIXTURE === "1")
      writeFileSync(path, html);
    expect(html).toBe(readFileSync(path, "utf8"));
  }
);
