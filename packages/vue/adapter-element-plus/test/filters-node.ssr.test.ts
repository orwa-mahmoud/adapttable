// @vitest-environment node
import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import DataTable from "../src/DataTable.vue";
import { ChecklistFilter, filters, FilterTreeBuilder } from "../src/filters";

interface Row {
  id: string;
  name: string;
}
const rows: readonly Row[] = [{ id: "a", name: "Ada" }];
function seeded(app: ReturnType<typeof createSSRApp>) {
  app.provide(ID_INJECTION_KEY, { prefix: 4900, current: 0 });
  app.provide(ZINDEX_INJECTION_KEY, { current: 0 });
  return app;
}
describe("Element Plus filter Node SSR", () => {
  it("renders the real trigger without mounting a browser overlay", async () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
    const app = seeded(
      createSSRApp(() =>
        h(DataTable<Row>, {
          data: rows,
          columns: [{ key: "name" }],
          rowKey: (row) => row.id,
          urlSync: false,
          features: [filters<Row>([{ key: "name", type: "text" }])],
        })
      )
    );
    const html = await renderToString(app);
    expect(html).toMatch(/<button[^>]*data-adapttable-part="filters-button"/);
    expect(html).not.toContain('data-adapttable-part="filters-popover"');
    expect(html).not.toContain('data-adapttable-part="filters-panel"');
    expect(html).toContain("Ada");
  });
  it("renders checklist and recursive controls with the binding models", async () => {
    const app = seeded(
      createSSRApp(() =>
        h("section", [
          h(ChecklistFilter<Row>, {
            def: {
              key: "name",
              type: "checklist",
              getValue: (row) => row.name,
            },
            source: {
              allFilteredRows: rows,
              extra: { name: ["Ada"] },
              setExtra: () => undefined,
            },
          }),
          h(FilterTreeBuilder<Row>, {
            defs: [{ key: "name", type: "text", getValue: (row) => row.name }],
            source: { setFilterTree: () => undefined },
            defaultExpanded: true,
          }),
        ])
      )
    );
    const html = await renderToString(app);
    expect(html).toContain('data-adapttable-part="filter-checklist-search"');
    expect(html).toMatch(/<input[^>]*type="checkbox"[^>]*checked/);
    expect(html).toContain("el-collapse");
    expect(html).toContain('data-adapttable-part="filter-tree-actions"');
  });
});
