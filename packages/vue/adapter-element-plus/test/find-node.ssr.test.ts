// @vitest-environment node
import type { UrlStateAdapter } from "@adapttable/vue";
import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import DataTable from "../src/DataTable.vue";
import { findInTable } from "../src/find-in-table";
interface Row {
  id: string;
  name: string;
}
describe("Element Plus find Node SSR", () => {
  for (const mobile of [false, true]) {
    it(`serializes an open URL query without DOM access or writes, mobile=${mobile}`, async () => {
      expect(typeof window).toBe("undefined");
      expect(typeof document).toBe("undefined");
      const write = vi.fn();
      const subscribe = vi.fn(() => () => undefined);
      const adapter: UrlStateAdapter = {
        getSearch: () => "find=Ada",
        setSearch: write,
        subscribe,
      };
      const app = createSSRApp(() =>
        h(DataTable<Row>, {
          data: [{ id: "a", name: "Ada" }],
          columns: [{ key: "name" }],
          rowKey: (row) => row.id,
          urlAdapter: adapter,
          forceMobile: mobile,
          searchable: false,
          dir: "rtl",
          features: [findInTable({ button: true })],
        })
      );
      app.provide(ID_INJECTION_KEY, { prefix: 9100, current: 0 });
      app.provide(ZINDEX_INJECTION_KEY, { current: 0 });
      const html = await renderToString(app);
      expect(html).toContain('data-adapttable-part="find-bar"');
      expect(html).toMatch(
        /<input[^>]*data-adapttable-part="find-input"[^>]*value="Ada"/
      );
      expect(html).toContain('aria-label="Find in table"');
      expect(html).toContain('class="el-input');
      expect(html).toContain("data-cell-match-current");
      expect(write).not.toHaveBeenCalled();
      expect(subscribe).not.toHaveBeenCalled();
    });
  }
});
