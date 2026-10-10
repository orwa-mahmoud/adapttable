// @vitest-environment node
import {
  provideDataTableClassNames,
  resolveLabels,
} from "@adapttable/vue/adapter";
import { setup } from "@css-render/vue3-ssr";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { filters } from "../src/filters";
import NaiveFilterField from "../src/filters/NaiveFilterField.vue";
import NaiveFilterTree from "../src/filters/NaiveFilterTree.vue";
import { headerFilters } from "../src/header-filters";

describe("Naive filtering in Node SSR", () => {
  it("renders generic fields and the advanced disclosure without browser globals or option requests", async () => {
    expect(typeof window).toBe("undefined");
    const options = vi.fn(() =>
      Promise.resolve([{ value: "Ada", label: "Ada" }])
    );
    const source = {
      extra: {},
      setExtra: vi.fn(),
      setExtras: vi.fn(),
      allFilteredRows: [{ name: "Ada" }],
    };
    const app = createSSRApp({
      setup() {
        provideDataTableClassNames(() => ({}));
        return () =>
          h("div", [
            h(NaiveFilterField<{ name: string }>, {
              def: { key: "name", type: "select", options },
              source,
              labels: resolveLabels(undefined),
            }),
            h(NaiveFilterField<{ name: string }>, {
              def: { key: "name", type: "checklist" },
              source,
              labels: resolveLabels(undefined),
            }),
            h(NaiveFilterTree<{ name: string }>, {
              defs: [{ key: "name", type: "text" }],
              source: { setFilterTree: vi.fn() },
              defaultExpanded: true,
            }),
          ]);
      },
    });
    const { collect } = setup(app);
    const html = await renderToString(app);
    expect(options).not.toHaveBeenCalled();
    expect(html).toContain('data-adapttable-part="filter-tree-summary"');
    expect(html).toContain('role="checkbox"');
    expect(html).toContain("n-collapse");
    expect(html).toContain("n-select");
    expect(collect()).toContain("cssr-id=");
  });

  it.each([false, true])(
    "renders closed filter contributions with the real table surface (mobile=%s)",
    async (mobile) => {
      const app = createSSRApp({
        render: () =>
          h(DataTable<{ name: string }>, {
            data: [{ name: "Ada" }],
            columns: [{ key: "name" }],
            rowKey: (row) => row.name,
            urlSync: false,
            forceMobile: mobile,
            features: [
              filters<{ name: string }>([{ key: "name", type: "text" }], {
                tree: true,
              }),
              headerFilters(),
            ],
          }),
      });
      setup(app);
      const html = await renderToString(app);
      expect(html).toContain(mobile ? "n-card" : "n-table");
      expect(html).toContain('data-adapttable-part="filters-button"');
      expect(html).not.toContain('data-adapttable-part="filters-popover"');
      expect(html).not.toContain("n-drawer-mask");
    }
  );
});
