// @vitest-environment node
import { setup } from "@css-render/vue3-ssr";
import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { standardFeatures } from "../src/preset";

const ZERO_CONFIGURATION = [
  "column-menu",
  "density-chooser",
  "export-csv",
  "find-in-table",
  "fit-columns",
  "fullscreen",
  "header-filters",
  "multi-sort",
  "resizable-columns",
  "status-bar",
];

describe("standard features", () => {
  it("composes zero-configuration features and only configured optional members", () => {
    expect(standardFeatures().map(({ id }) => id)).toEqual(ZERO_CONFIGURATION);
    const configured = standardFeatures<{ id: string; team: string }>({
      grouping: "team",
      bulkActions: [],
      filters: [],
      savedViews: { storageKey: "people", storage: null },
    });
    expect(configured.map(({ id }) => id)).toEqual([
      ...ZERO_CONFIGURATION,
      "grouping",
      "bulk-actions",
      "filters",
      "saved-views",
    ]);
  });

  it("renders the preset's controls with this kit", async () => {
    const app = createSSRApp({
      render: () =>
        h(DataTable<{ id: string; name: string }>, {
          data: [{ id: "ada", name: "Ada" }],
          columns: [{ key: "name", header: "Name", sortable: true }],
          rowKey: (row: { id: string }) => row.id,
          urlSync: false,
          features: standardFeatures(),
        }),
    });
    setup(app);
    const html = await renderToString(app);
    for (const part of [
      "column-menu-button",
      "density-toggle",
      "export-csv-button",
      "status-bar",
    ])
      expect(html).toContain(`data-adapttable-part="${part}"`);
  });
});
