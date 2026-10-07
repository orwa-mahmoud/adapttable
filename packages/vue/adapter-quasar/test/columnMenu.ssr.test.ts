import { readFileSync, writeFileSync } from "node:fs";

import { Quasar } from "quasar";
import { expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { ColumnMenuFixture } from "./columnMenuFixture";

it("renders a closed native column menu in genuine Node SSR without browser reads", async () => {
  expect(typeof document).toBe("undefined");
  const app = createSSRApp({ render: () => h(ColumnMenuFixture) });
  const context = { req: { headers: {} } };
  Reflect.apply(Quasar.install, Quasar, [app, { config: {} }, context]);
  const html = await renderToString(app, context);
  expect(html).toContain('data-adapttable-part="column-menu-button"');
  expect(html).toContain('aria-haspopup="dialog"');
  expect(html).not.toContain('data-adapttable-part="column-menu-panel"');
  const path = `${import.meta.dirname}/server-column-menu.html`;
  if (process.env.ADAPTTABLE_UPDATE_SSR_FIXTURE === "1")
    writeFileSync(path, html);
  expect(html).toBe(readFileSync(path, "utf8"));
});
