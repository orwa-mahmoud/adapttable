// @vitest-environment node
import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import { expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { elementButton } from "../src/controls/button";
import ElementCheckbox from "../src/controls/ElementCheckbox.vue";
import { ElementCard } from "../src/presentation/ElementCard";

it("renders real kit controls without DOM globals or attaching a server ref", async () => {
  expect(typeof window).toBe("undefined");
  expect(typeof document).toBe("undefined");
  const owner = vi.fn();
  const app = createSSRApp(() =>
    h("section", [
      elementButton(
        {
          ref: owner,
          "aria-label": "Act",
          "data-adapttable-part": "action-button",
        },
        "Act"
      ),
      h(ElementCheckbox, { checked: true, label: "Select", inputRef: owner }),
      h(
        ElementCard,
        {
          attrs: {
            ref: owner,
            role: "listitem",
            "data-adapttable-part": "card",
          },
        },
        { default: () => "Ada" }
      ),
    ])
  );
  app.provide(ID_INJECTION_KEY, { prefix: 7100, current: 0 });
  app.provide(ZINDEX_INJECTION_KEY, { current: 0 });
  const html = await renderToString(app);
  expect(html).toMatch(/<button[^>]*data-adapttable-part="action-button"/);
  expect(html).toContain("el-button");
  expect(html).toContain("el-card");
  expect(html).toMatch(/<input[^>]*type="checkbox"[^>]*checked/);
  expect(owner).not.toHaveBeenCalled();
});
