import { readFileSync, writeFileSync } from "node:fs";

import { Quasar } from "quasar";
import { expect, it } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";

import { remainingControlsFixture } from "./remainingControlsFixture";
it.each([false, true])(
  "server-renders all seven remaining factories without browser globals, mobile=%s",
  async (mobile) => {
    expect(typeof document).toBe("undefined");
    const app = createSSRApp({
      render: () => remainingControlsFixture(mobile),
    });
    const context = { req: { headers: {} } };
    Reflect.apply(Quasar.install, Quasar, [app, { config: {} }, context]);
    const html = await renderToString(app, context);
    expect(html).toContain("Ada");
    expect(html).toContain("q-btn");
    expect(html).toContain('data-adapttable-part="grouping-panel"');
    expect(html).not.toContain('data-adapttable-part="command-palette"');
    expect(html).not.toContain('data-adapttable-part="context-menu"');
    const file = `${import.meta.dirname}/server-remaining-${mobile ? "mobile" : "desktop"}.html`;
    if (process.env.ADAPTTABLE_UPDATE_SSR_FIXTURE === "1")
      writeFileSync(file, html);
    expect(html).toBe(readFileSync(file, "utf8"));
  }
);
