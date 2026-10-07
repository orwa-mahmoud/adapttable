import { readFileSync, writeFileSync } from "node:fs";

import { Quasar } from "quasar";
import { expect, it } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";

import { rowHierarchyFixture } from "./rowHierarchyFixture";

it.each([false, true])(
  "renders row and hierarchy features in genuine Node SSR, mobile=%s",
  async (mobile) => {
    expect(typeof document).toBe("undefined");
    const app = createSSRApp({ render: () => rowHierarchyFixture(mobile) });
    const context = { req: { headers: {} } };
    Reflect.apply(Quasar.install, Quasar, [app, { config: {} }, context]);
    const html = await renderToString(app, context);
    for (const name of [
      "tree-toggle",
      "expand-button",
      "nested-table",
      "pinned-summary-bottom",
    ])
      expect(html).toContain(`data-adapttable-part="${name}"`);
    // The binding keeps component-owned action and pin scopes inactive on the
    // server. Hydration activates them only after the mounted lifecycle.
    for (const name of ["action-button", "pinned-top", "resize-handle"])
      expect(html).not.toContain(`data-adapttable-part="${name}"`);
    expect(html).toContain("Child");
    expect(html).toContain("Host note");
    expect(html).toContain("q-btn");
    const path = `${import.meta.dirname}/server-row-hierarchy-${mobile ? "mobile" : "desktop"}.html`;
    if (process.env.ADAPTTABLE_UPDATE_SSR_FIXTURE === "1")
      writeFileSync(path, html);
    expect(html).toBe(readFileSync(path, "utf8"));
  }
);
