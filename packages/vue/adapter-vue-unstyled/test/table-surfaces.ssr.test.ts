// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import Demo from "../browser/table-surfaces/TableSurfacesDemo.vue";
import { DataTable } from "../src";

describe("table surfaces without browser globals", () => {
  it.each([false, true])(
    "renders actual loading shapes server-side (mobile=%s)",
    async (forceMobile) => {
      expect(typeof document).toBe("undefined");
      const html = await renderToString(
        createSSRApp({
          render: () =>
            h(DataTable<{ id: string }>, {
              data: [],
              columns: [{ key: "id" }],
              rowKey: (row) => row.id,
              forceMobile,
              isLoading: true,
              skeletonRows: 2,
              urlSync: false,
            }),
        })
      );
      expect(html).toContain(
        `data-adapttable-part="${forceMobile ? "loading-cards" : "loading-table"}"`
      );
      expect([
        ...html.matchAll(
          new RegExp(
            `data-adapttable-part="${forceMobile ? "loading-card" : "loading-row"}"`,
            "g"
          )
        ),
      ]).toHaveLength(2);
      expect(html).toContain('data-adapttable-part="table-status-announcer"');
    }
  );

  it("imports the browser fixture without mounting and renders independent request state", async () => {
    expect(typeof window).toBe("undefined");
    const first = await renderToString(createSSRApp(Demo));
    const second = await renderToString(createSSRApp(Demo));
    for (const html of [first, second]) {
      expect(html).toContain('data-demo-table="table-surfaces"');
      expect(html).toContain('data-adapttable-part="chips"');
      expect(html).not.toContain('data-adapttable-part="action-button"');
      expect(html).toContain('data-adapttable-part="expand-header"');
      expect(html).not.toContain('data-adapttable-part="detail-row"');
      expect(html).toMatch(
        /<output[^>]*aria-label="Expansion requests"[^>]*>\[\]<\/output>/
      );
    }
  });
});
