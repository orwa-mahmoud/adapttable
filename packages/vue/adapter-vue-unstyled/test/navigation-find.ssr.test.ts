import { createMemoryAdapter } from "@adapttable/core";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { cellNavigation } from "../src/cell-navigation";
import { findInTable } from "../src/find-in-table";

interface Row {
  id: string;
  name: string;
}
const cases = [
  { query: "", findFirst: false, mobile: false },
  { query: "Needle", findFirst: false, mobile: false },
  { query: "", findFirst: true, mobile: false },
  { query: "Needle", findFirst: true, mobile: false },
  { query: "", findFirst: false, mobile: true },
  { query: "Needle", findFirst: false, mobile: true },
];

describe("composed navigation and Find SSR", () => {
  it.each(cases)(
    "renders without Vue errors for $query, findFirst=$findFirst, mobile=$mobile",
    async ({ query, findFirst, mobile }) => {
      const adapter = createMemoryAdapter(query ? `find=${query}` : "");
      const writes = vi.spyOn(adapter, "setSearch");
      const rangeChanged = vi.fn();
      const errors: unknown[] = [];
      const warnings: string[] = [];
      const navigation = cellNavigation({ onRangeChange: rangeChanged });
      const find = findInTable();
      const app = createSSRApp({
        render: () =>
          h(DataTable<Row>, {
            data: [{ id: "row", name: "Needle" }],
            columns: [{ key: "name", header: "Name" }],
            rowKey: (row) => row.id,
            urlAdapter: adapter,
            forceMobile: mobile,
            features: findFirst ? [find, navigation] : [navigation, find],
          }),
      });
      app.config.errorHandler = (error) => errors.push(error);
      app.config.warnHandler = (message) => warnings.push(message);
      const html = await renderToString(app);
      expect(errors).toEqual([]);
      expect(warnings).toEqual([]);
      expect(html).toContain("Needle");
      expect(html).toContain(
        `data-adapttable-part="${mobile ? "cards" : "table"}"`
      );
      expect(html.includes('data-adapttable-part="find-bar"')).toBe(
        query.length > 0
      );
      expect(html.includes("data-cell-match-current")).toBe(query.length > 0);
      expect(rangeChanged).not.toHaveBeenCalled();
      expect(writes).not.toHaveBeenCalled();
      expect(adapter.getSearch()).toBe(query ? `find=${query}` : "");
    }
  );
});
