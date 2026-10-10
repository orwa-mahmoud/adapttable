// @vitest-environment node
import type { ElementRef } from "@adapttable/vue";
import ui from "@nuxt/ui/vue-plugin";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import NuxtCheckbox from "../src/controls/NuxtCheckbox.vue";
import { filters } from "../src/filters";

interface Row {
  id: string;
  name: string;
}
describe("Nuxt filters in Node SSR", () => {
  it.each([false, true])(
    "renders the real feature without browser globals (mobile=%s)",
    async (mobile) => {
      expect(typeof document).toBe("undefined");
      const app = createSSRApp({
        render: () =>
          h(DataTable<Row>, {
            data: [{ id: "a", name: "Ada" }],
            columns: [{ key: "name" }],
            rowKey: (row) => row.id,
            urlSync: false,
            forceMobile: mobile,
            dir: "rtl",
            features: [
              filters<Row>([{ key: "name", type: "text" }], { tree: true }),
            ],
          }),
      }).use(ui);
      const html = await renderToString(app);
      expect(html).toContain('data-adapttable-part="filters-button"');
      expect(html).toContain('dir="rtl"');
      expect(html).toContain('data-row-id="a"');
      expect(html).not.toContain('data-adapttable-part="filters-popover"');
    }
  );
  it("does not acquire a checkbox target on the server", async () => {
    const owner = vi.fn<ElementRef<HTMLButtonElement>>();
    const app = createSSRApp({
      render: () =>
        h(NuxtCheckbox, {
          control: {
            attrs: { ref: owner },
            label: "Enabled",
            checked: true,
            onChange: () => undefined,
          },
        }),
    }).use(ui);
    const html = await renderToString(app);
    expect(html).toContain('role="checkbox"');
    expect(html).toContain('aria-checked="true"');
    expect(owner).not.toHaveBeenCalled();
  });
});
