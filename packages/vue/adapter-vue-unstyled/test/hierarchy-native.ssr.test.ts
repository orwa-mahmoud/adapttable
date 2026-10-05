// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { grouping } from "../src/grouping";
import { rowDetail } from "../src/row-detail";
import { extraRows, pinnedSummaryRows, rowActions } from "../src/rows";
import { tree } from "../src/tree";
interface Row {
  id: string;
  team: string;
  name: string;
  parent?: string;
}
describe("native optional rendering without browser globals", () => {
  it.each([false, true])(
    "isolates server hierarchy/request state, mobile=%s",
    async (mobile) => {
      expect(typeof window).toBe("undefined");
      expect(typeof document).toBe("undefined");
      const render = (prefix: string) =>
        renderToString(
          createSSRApp({
            render: () =>
              h(DataTable<Row>, {
                data: [
                  { id: "a", team: prefix, name: `${prefix} parent` },
                  {
                    id: "b",
                    team: prefix,
                    name: `${prefix} child`,
                    parent: "a",
                  },
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
                  rowActions<Row>([
                    { key: "open", label: "Open", onClick: () => undefined },
                  ]),
                  pinnedSummaryRows<Row>({
                    top: [
                      { id: "total", team: prefix, name: `${prefix} total` },
                    ],
                  }),
                  extraRows([
                    {
                      key: "note",
                      kind: "fullWidth",
                      render: () => h("aside", `${prefix} note`),
                    },
                  ]),
                ],
              }),
          })
        );
      const [one, two] = await Promise.all([render("ONE"), render("TWO")]);
      expect(one).toContain("ONE child");
      expect(one).toContain("ONE total");
      expect(one).toContain("ONE note");
      expect(one).toContain("Details ONE parent");
      expect(one).not.toContain("TWO");
      expect(two).not.toContain("ONE");
      expect(two).toContain('data-adapttable-part="tree-toggle"');
      expect(two).not.toContain('data-adapttable-part="action-button"');
    }
  );
  it("serializes localized group controls and mixed selection without calling host", async () => {
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(DataTable<Row>, {
            data: [
              { id: "a", team: "Core", name: "Ada" },
              { id: "b", team: "Core", name: "Bea" },
            ],
            columns: [{ key: "name" }, { key: "team" }],
            rowKey: (row) => row.id,
            urlSync: false,
            selectedIds: ["a"],
            dir: "rtl",
            labels: {
              collapseGroup: "Collapse localized",
              selectRow: "Select localized",
            },
            features: [grouping("team")],
          }),
      })
    );
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("Collapse localized: Core");
    expect(html).toContain("Select localized: Core");
    expect(html).toContain('data-adapttable-part="group-select"');
  });
});
