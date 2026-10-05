// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { virtualize } from "../src/virtualize";

interface Row {
  id: string;
  amount: number;
}
describe("footer server rendering", () => {
  it.each([false, true])(
    "omits boolean summary text during SSR (mobile=%s)",
    async (forceMobile) => {
      const html = await renderToString(
        createSSRApp({
          render: () =>
            h(DataTable<Row>, {
              data: [{ id: "one", amount: 0 }],
              columns: [{ key: "id" }, { key: "amount" }],
              rowKey: (row) => row.id,
              urlSync: false,
              forceMobile,
              summaryRow: () => ({ id: false, amount: [true, [false, 0, ""]] }),
            }),
        })
      );
      const markup = forceMobile
        ? /<article[^>]*data-adapttable-part="summary-card"[^>]*>([\s\S]*?)<\/article>/.exec(
            html
          )?.[1]
        : /<tfoot[^>]*>([\s\S]*?)<\/tfoot>/.exec(html)?.[1];
      expect(markup).toBeDefined();
      const text = markup?.replace(/<[^<>]*>/g, "");
      expect(text).toContain("0");
      expect(text).not.toMatch(/false|true/);
    }
  );

  it.each([false, true])(
    "renders isolated request summaries and custom content without DOM globals (mobile=%s)",
    async (forceMobile) => {
      expect(typeof window).toBe("undefined");
      const render = (id: string, amount: number) =>
        renderToString(
          createSSRApp({
            render: () =>
              h(
                DataTable<Row>,
                {
                  data: [{ id, amount }],
                  columns: [
                    { key: "id" },
                    {
                      key: "amount",
                      footer: (context) =>
                        h("strong", `${id}: ${context.value}`),
                    },
                  ],
                  rowKey: (row) => row.id,
                  urlSync: false,
                  forceMobile,
                  summaryRow: (rows) => ({
                    amount: rows.reduce((sum, row) => sum + row.amount, 0),
                  }),
                  features: [
                    virtualize({ maxHeight: 240, virtualizeColumns: true }),
                  ],
                },
                { tableFooter: () => h("p", `${id} reviewed`) }
              ),
          })
        );
      const [one, two] = await Promise.all([
        render("FIRST", 10),
        render("SECOND", 20),
      ]);
      expect(one).toContain("FIRST: 10");
      expect(one).not.toContain("SECOND");
      expect(two).toContain("SECOND: 20");
      expect(two).not.toContain("FIRST");
      expect(one).toContain(
        `data-adapttable-part="${forceMobile ? "summary-card" : "summary"}"`
      );
      expect(one).toContain('data-adapttable-part="table-footer"');
    }
  );
});
