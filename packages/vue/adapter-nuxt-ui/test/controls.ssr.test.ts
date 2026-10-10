// @vitest-environment node
import UApp from "@nuxt/ui/components/App.vue";
import ui from "@nuxt/ui/vue-plugin";
import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import NuxtInput from "../src/controls/NuxtInput.vue";
import NuxtSelect from "../src/controls/NuxtSelect.vue";
import { nuxtFilterSlots } from "../src/filters/nuxtFilterSlots";

describe("Nuxt UI server controls", () => {
  it("renders isolated requests without browser globals", async () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
    const render = (value: string, checked: boolean) => {
      const app = createSSRApp({
        render: () =>
          h(
            UApp,
            { dir: "rtl", toaster: null },
            {
              default: () => [
                h(NuxtInput, {
                  control: {
                    value,
                    label: value,
                    attrs: { "data-adapttable-part": "filter-input" },
                    onChange: () => undefined,
                  },
                }),
                h(NuxtSelect, {
                  control: {
                    value,
                    label: "Choice",
                    attrs: {},
                    options: [{ value, label: value }],
                    onChange: () => undefined,
                  },
                }),
                nuxtFilterSlots(() => ({})).Checkbox({
                  checked,
                  label: value,
                  attrs: {},
                  onChange: () => undefined,
                }),
              ],
            }
          ),
      });
      app.use(ui);
      return renderToString(app);
    };
    const [first, second] = await Promise.all([
      render("First request", false),
      render("Second request", true),
    ]);
    expect(first).toContain('value="First request"');
    expect(first).toContain('aria-checked="false"');
    expect(first).not.toContain("Second request");
    expect(second).toContain('value="Second request"');
    expect(second).toContain('aria-checked="true"');
    expect(second).not.toContain("First request");
    for (const html of [first, second]) {
      expect(html).toContain('role="combobox"');
      expect(html).toContain('dir="rtl"');
      expect(html).toContain('data-adapttable-part="filter-input"');
    }
  });
});
