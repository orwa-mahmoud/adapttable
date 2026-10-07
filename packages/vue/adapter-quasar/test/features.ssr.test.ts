import { readFileSync, writeFileSync } from "node:fs";

import {
  formatMultiDraft,
  provideDataTableClassNames,
} from "@adapttable/vue/adapter";
import { Quasar } from "quasar";
import { expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import QuasarMultiSelect from "../src/controls/QuasarMultiSelect.vue";
import { featuresFixture } from "./featuresFixture";
it.each([false, true])(
  "renders closed filters and editable mobile=%s targets in genuine Node SSR",
  async (mobile) => {
    expect(typeof document).toBe("undefined");
    const app = createSSRApp({ render: () => featuresFixture(mobile) });
    const context = { req: { headers: {} } };
    Reflect.apply(Quasar.install, Quasar, [app, { config: {} }, context]);
    const html = await renderToString(app, context);
    expect(html).toContain('data-adapttable-part="edit-cell-activate"');
    expect(html).toContain('data-adapttable-part="filters-button"');
    expect(html).not.toContain('data-adapttable-part="filters-popover"');
    const path = `${import.meta.dirname}/server-features-${mobile ? "mobile" : "desktop"}.html`;
    if (process.env.ADAPTTABLE_UPDATE_SSR_FIXTURE === "1")
      writeFileSync(path, html);
    expect(html).toBe(readFileSync(path, "utf8"));
  }
);

it("renders an active multi-select editor without DOM globals", async () => {
  const app = createSSRApp({
    setup() {
      provideDataTableClassNames(() => ({}));
      return () =>
        h(QuasarMultiSelect, {
          attrs: { id: "ssr-tags" },
          draft: formatMultiDraft(["a"]),
          label: "Tags",
          options: [{ value: "a", label: "A" }],
          onChange: () => undefined,
        });
    },
  });
  const context = { req: { headers: {} } };
  Reflect.apply(Quasar.install, Quasar, [app, { config: {} }, context]);
  const html = await renderToString(app, context);
  expect(html).toContain('id="ssr-tags"');
  expect(html).toContain('role="combobox"');
  expect(html).toContain('aria-label="Tags"');
});
