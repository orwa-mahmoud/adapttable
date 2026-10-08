// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";

/** The structural contract every kit's rendered table carries. */
const STRUCTURAL_PARTS = [
  "table",
  "thead",
  "tbody",
  "row",
  "header-cell",
  "cell",
  "toolbar",
] as const;

describe("structural parts", () => {
  it("renders every structural part on the desktop table", async () => {
    const app = createSSRApp({
      render: () =>
        h(DataTable<{ id: string; name: string }>, {
          data: [{ id: "ada", name: "Ada" }],
          columns: [{ key: "name", header: "Name", sortable: true }],
          rowKey: (row: { id: string }) => row.id,
          urlSync: false,
        }),
    });
    const html = await renderToString(app);
    const rendered = STRUCTURAL_PARTS.filter((part) =>
      html.includes(`data-adapttable-part="${part}"`)
    );
    expect(rendered).toEqual([...STRUCTURAL_PARTS]);
  });
});
