// @vitest-environment node
import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import DataTable from "../src/DataTable.vue";
import {
  extraRows,
  pinnedSummaryRows,
  rowAppearance,
  rowPinning,
} from "../src/rows";

interface Row {
  id: string;
  name: string;
}
describe("Element Plus row surface Node SSR", () => {
  for (const mobile of [false, true]) {
    it(`renders request-local summaries and extra content with inactive pin actions, mobile=${mobile}`, async () => {
      expect(typeof window).toBe("undefined");
      expect(typeof document).toBe("undefined");
      const changed = vi.fn();
      const render = (name: string) => {
        const app = createSSRApp(() =>
          h(DataTable<Row>, {
            data: [{ id: "a", name }],
            columns: [{ key: "name" }],
            rowKey: (row) => row.id,
            forceMobile: mobile,
            urlSync: false,
            features: [
              rowPinning({
                pinnedRowIds: { top: ["a"], bottom: [] },
                onPinnedRowIdsChange: changed,
              }),
              pinnedSummaryRows<Row>({
                bottom: [{ id: "sum", name: `${name} total` }],
              }),
              extraRows([
                {
                  key: "note",
                  kind: "fullWidth",
                  render: () => h("aside", `${name} note`),
                },
              ]),
              rowAppearance<Row>({
                rowClassName: (row) => `host-${row.id}`,
                rowHeight: 120,
              }),
            ],
          })
        );
        app.provide(ID_INJECTION_KEY, { prefix: 6600, current: 0 });
        app.provide(ZINDEX_INJECTION_KEY, { current: 0 });
        return renderToString(app);
      };
      const [first, second] = await Promise.all([
        render("FIRST"),
        render("SECOND"),
      ]);
      expect(first).toContain("FIRST total");
      expect(first).toContain("FIRST note");
      expect(first).not.toContain("SECOND");
      expect(second).not.toContain("FIRST");
      expect(first).toContain('data-adapttable-part="pinned-summary-bottom"');
      expect(first).toContain('data-adapttable-part="full-width-row"');
      expect(first).not.toContain('data-adapttable-part="action-button"');
      expect(first).toContain("host-a");
      expect(changed).not.toHaveBeenCalled();
    });
  }
});
