// @vitest-environment node
import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import DataTable from "../src/DataTable.vue";

interface Row {
  id: string;
  name: string;
}
function app(mobile: boolean) {
  const result = createSSRApp(() =>
    h(DataTable<Row>, {
      data: [{ id: "ada", name: "Ada" }],
      columns: [{ key: "name", header: "Name" }],
      rowKey: (row) => row.id,
      selectable: true,
      selectedIds: ["ada"],
      forceMobile: mobile,
      urlSync: false,
      dir: "rtl",
      tableLabel: "Team records",
    })
  );
  result.provide(ID_INJECTION_KEY, { prefix: 4600, current: 0 });
  result.provide(ZINDEX_INJECTION_KEY, { current: 0 });
  return result;
}

describe("Element Plus pure Node table SSR", () => {
  it("renders the actual desktop table and checked kit control without DOM globals", async () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
    const html = await renderToString(app(false));
    expect(html).toMatch(/<table[^>]*data-adapttable-part="table"/);
    expect(html).toContain('aria-label="Team records"');
    expect(html).toContain('dir="rtl"');
    expect(html).toMatch(/<input[^>]*type="checkbox"[^>]*checked/);
    expect(html).toContain("Ada");
  });

  it("renders real mobile kit cards and native label/value semantics without DOM globals", async () => {
    expect(typeof window).toBe("undefined");
    const html = await renderToString(app(true));
    expect(html).toContain("adapttable-element-plus-mobile-card");
    expect(html).toContain('role="listitem"');
    expect(html).toMatch(/<dt[^>]*data-adapttable-part="card-label"/);
    expect(html).toMatch(/<dd[^>]*data-adapttable-part="card-value"/);
    expect(html).toContain("Ada");
  });
});
