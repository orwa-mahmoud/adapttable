import { readFileSync, writeFileSync } from "node:fs";

import { Quasar } from "quasar";
import { expect, it } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";

import { savedViewsFixture } from "./savedViewsFixture";

it("renders native saved-view controls in Node without reading browser storage", async () => {
  expect(typeof document).toBe("undefined");
  const app = createSSRApp({ render: () => savedViewsFixture() });
  const context = { req: { headers: {} } };
  Reflect.apply(Quasar.install, Quasar, [app, { config: {} }, context]);
  const html = await renderToString(app, context);
  for (const part of [
    "saved-views-panel",
    "saved-view-readonly",
    "saved-view-default",
    "views-button",
  ])
    expect(html).toContain(`data-adapttable-part="${part}"`);
  expect(html).not.toContain('data-adapttable-part="views-panel"');
  const path = `${import.meta.dirname}/server-saved-views.html`;
  if (process.env.ADAPTTABLE_UPDATE_SSR_FIXTURE === "1")
    writeFileSync(path, html);
  expect(html).toBe(readFileSync(path, "utf8"));
});
