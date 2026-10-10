// @vitest-environment node
import ui from "@nuxt/ui/vue-plugin";
import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { densityChooser } from "../src/density";

describe("Nuxt table server rendering", () => {
  it("renders request-isolated desktop and mobile surfaces without browser globals", async () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
    const render = (name: string, mobile: boolean) => {
      const app = createSSRApp({
        render: () =>
          h(DataTable<{ id: string; name: string }>, {
            data: [{ id: name, name }],
            columns: [{ key: "name", sortable: true }],
            rowKey: (row) => row.id,
            forceMobile: mobile,
            dir: "rtl",
            urlSync: false,
            tableLabel: name,
            features: [densityChooser()],
          }),
      });
      app.use(ui);
      return renderToString(app);
    };
    const [desktop, mobile] = await Promise.all([
      render("Desktop request", false),
      render("Mobile request", true),
    ]);
    expect(desktop).toContain("<table");
    expect(desktop).toContain("<thead");
    expect(desktop).toContain("<tbody");
    expect(desktop).toContain('aria-label="Desktop request"');
    expect(desktop).not.toContain("Mobile request");
    expect(mobile).toContain("<article");
    expect(mobile).toContain('role="listitem"');
    expect(mobile).not.toContain("<table");
    expect(mobile).not.toContain("Desktop request");
    for (const html of [desktop, mobile]) {
      expect(html).toContain('dir="rtl"');
      expect(html.match(/data-adapttable-part="scroll-box"/g)).toHaveLength(1);
      expect(html).toContain('data-adapttable-part="density-toggle"');
      expect(html).toContain('role="radiogroup"');
      expect(html.match(/role="radio"/g)).toHaveLength(2);
      expect(html).toContain("Comfortable");
      expect(html).toContain("Compact");
    }
  });
});
