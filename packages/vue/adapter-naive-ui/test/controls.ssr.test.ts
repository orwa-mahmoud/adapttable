// @vitest-environment node
import { setup } from "@css-render/vue3-ssr";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { naiveButton } from "../src/controls/button";
import { naiveCheckbox } from "../src/controls/checkbox";
import { naiveInput } from "../src/controls/input";
import { naiveSelect } from "../src/controls/select";

describe("Naive control server rendering", () => {
  it("renders real Naive controls on the server without browser globals", async () => {
    expect(typeof window).toBe("undefined");
    const app = createSSRApp({
      render: () =>
        h("div", { dir: "rtl" }, [
          naiveButton(
            {
              "aria-label": "Next page",
              "data-adapttable-part": "page-next",
            },
            "Next"
          ),
          naiveCheckbox({
            attrs: { "aria-label": "Select all" },
            checked: false,
            indeterminate: true,
            onToggle: vi.fn(),
          }),
          naiveInput({
            attrs: {
              class: "search",
              "data-adapttable-part": "search",
              "aria-label": "Search",
            },
            value: "Ada",
            onChange: vi.fn(),
          }),
          naiveSelect({
            attrs: {
              "aria-label": "Density",
              "data-adapttable-part": "density-toggle",
            },
            value: "compact",
            options: [{ value: "compact", label: "Compact" }],
            onChange: vi.fn(),
          }),
        ]),
    });
    const { collect } = setup(app);
    const html = await renderToString(app);
    expect(collect()).toContain("cssr-id=");
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('role="checkbox"');
    expect(html).toContain('aria-checked="mixed"');
    expect(html).toContain('data-adapttable-part="search"');
    expect(html).toContain("n-select");
    expect(html).not.toContain("undefined");
  });
});
