// @vitest-environment node
import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import DataTable from "../src/DataTable.vue";
import { grouping } from "../src/grouping";
import { rowDetail } from "../src/row-detail";
import { tree } from "../src/tree";
interface Row {
  id: string;
  name: string;
  team: string;
  parent?: string;
}
function seeded(app: ReturnType<typeof createSSRApp>) {
  app.provide(ID_INJECTION_KEY, { prefix: 6100, current: 0 });
  app.provide(ZINDEX_INJECTION_KEY, { current: 0 });
  return app;
}
describe("Element Plus hierarchy Node SSR", () => {
  for (const mobile of [false, true]) {
    it(`isolates server request rows and expansion, mobile=${mobile}`, async () => {
      expect(typeof window).toBe("undefined");
      expect(typeof document).toBe("undefined");
      const render = (name: string) =>
        renderToString(
          seeded(
            createSSRApp(() =>
              h(DataTable<Row>, {
                data: [
                  { id: "a", team: name, name: `${name} parent` },
                  { id: "b", team: name, name: `${name} child`, parent: "a" },
                ],
                columns: [{ key: "name" }, { key: "team" }],
                rowKey: (row) => row.id,
                urlSync: false,
                forceMobile: mobile,
                features: [
                  tree<Row>({
                    getParentId: (row) => row.parent,
                    defaultExpandedIds: ["a"],
                  }),
                  rowDetail<Row>((row) => h("p", `Details ${row.name}`), ["a"]),
                ],
              })
            )
          )
        );
      const [first, second] = await Promise.all([
        render("FIRST"),
        render("SECOND"),
      ]);
      expect(first).toContain("FIRST child");
      expect(first).toContain("Details FIRST parent");
      expect(first).not.toContain("SECOND");
      expect(second).not.toContain("FIRST");
      expect(second).toContain('data-adapttable-part="tree-toggle"');
      expect(second).toContain("el-button");
      expect(second).toContain("el-card");
    });
  }
  it("serializes localized kit group controls without calling the host", async () => {
    const update = vi.fn();
    const html = await renderToString(
      seeded(
        createSSRApp(() =>
          h(DataTable<Row>, {
            data: [
              { id: "a", name: "Ada", team: "Core" },
              { id: "b", name: "Bea", team: "Core" },
            ],
            columns: [{ key: "name" }, { key: "team" }],
            rowKey: (row) => row.id,
            urlSync: false,
            selectedIds: ["a"],
            selectable: true,
            dir: "rtl",
            labels: {
              collapseGroup: "Collapse localized",
              selectRow: "Select localized",
            },
            features: [grouping("team")],
            "onUpdate:selectedIds": update,
          })
        )
      )
    );
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("Collapse localized: Core");
    expect(html).toContain("Select localized: Core");
    expect(html).toMatch(/<label[^>]*data-adapttable-part="group-select"/);
    expect(html).toContain('aria-checked="mixed"');
    expect(update).not.toHaveBeenCalled();
  });
});
