// @vitest-environment node
import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import DataTable from "../src/DataTable.vue";
import { densityChooser } from "../src/density";
import { fullscreen } from "../src/fullscreen";

describe("Element Plus view controls in Node SSR", () => {
  it("renders real density controls and omits unsupported fullscreen without browser globals", async () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
    const app = createSSRApp(() =>
      h(DataTable<{ id: string }>, {
        data: [{ id: "a" }],
        columns: [{ key: "id" }],
        rowKey: (row) => row.id,
        features: [densityChooser(), fullscreen()],
        density: "compact",
        urlSync: false,
        labels: { density: "Display density", densityCompact: "Compact rows" },
      })
    );
    app.provide(ID_INJECTION_KEY, { prefix: 4800, current: 0 });
    app.provide(ZINDEX_INJECTION_KEY, { current: 0 });
    const html = await renderToString(app);
    expect(html).toContain('data-density="compact"');
    const control =
      /<div\b[^>]*data-adapttable-part="density-toggle"[^>]*>/.exec(html)?.[0];
    expect(control).toMatch(/class="[^"]*\bel-select\b/);
    expect(html).toMatch(/<input[^>]*aria-label="Display density"/);
    expect(html).toContain("Compact rows");
    expect(html).not.toContain('data-adapttable-part="fullscreen-toggle"');
  });
});
