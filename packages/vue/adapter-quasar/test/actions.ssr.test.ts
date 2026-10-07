import { readFileSync, writeFileSync } from "node:fs";

import { Quasar } from "quasar";
import { expect, it } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";

import { actionsFixture } from "./actionsFixture";

it("renders native action and status controls in genuine Node SSR", async () => {
  expect(typeof document).toBe("undefined");
  const app = createSSRApp({ render: () => actionsFixture() });
  const context = { req: { headers: {} } };
  Reflect.apply(Quasar.install, Quasar, [app, { config: {} }, context]);
  const html = await renderToString(app, context);
  for (const part of [
    "print-button",
    "bulk-button",
    "find-button",
    "status-bar",
  ])
    expect(html).toContain(`data-adapttable-part="${part}"`);
  expect(html).not.toContain('data-adapttable-part="find-bar"');
  const path = `${import.meta.dirname}/server-actions.html`;
  if (process.env.ADAPTTABLE_UPDATE_SSR_FIXTURE === "1")
    writeFileSync(path, html);
  expect(html).toBe(readFileSync(path, "utf8"));
});
