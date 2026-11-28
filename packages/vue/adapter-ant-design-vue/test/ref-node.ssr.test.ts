// @vitest-environment node
import { expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import AntdCheckbox from "../src/controls/AntdCheckbox.vue";
import { antdButton } from "../src/controls/button";
import { AntdCard } from "../src/presentation/AntdCard";

it("renders real kit controls without DOM globals or attaching a server ref", async () => {
  expect(typeof window).toBe("undefined");
  expect(typeof document).toBe("undefined");
  const owner = vi.fn();
  const app = createSSRApp(() =>
    h("section", [
      antdButton(
        {
          ref: owner,
          "aria-label": "Act",
          "data-adapttable-part": "action-button",
        },
        "Act"
      ),
      h(AntdCheckbox, { checked: true, label: "Select", inputRef: owner }),
      h(
        AntdCard,
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
  const html = await renderToString(app);
  expect(html).toMatch(/<button[^>]*data-adapttable-part="action-button"/);
  expect(html).toContain("ant-btn");
  expect(html).toContain("ant-card");
  expect(html).toMatch(/<input[^>]*type="checkbox"[^>]*checked/);
  expect(owner).not.toHaveBeenCalled();
});
