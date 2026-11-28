// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { standardFeatures } from "../src/preset";

/** The column-layout family, then the other fixed members. */
const FIXED_MEMBERS = [
  "column-menu",
  "resizable-columns",
  "fit-columns",
  "density-chooser",
  "export-csv",
  "find-in-table",
  "fullscreen",
  "multi-sort",
  "status-bar",
];
/** With no filters given, the header controls stand alone. */
const ZERO_CONFIGURATION = [...FIXED_MEMBERS, "header-filters"];

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
      ...FIXED_MEMBERS,
      "grouping",
      "bulk-actions",
      "filters",
      "header-filters",
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
    const html = await renderToString(app);
    for (const part of [
      "column-menu-button",
      "density-toggle",
      "export-csv-button",
      "footer",
    ])
      expect(html).toContain(`data-adapttable-part="${part}"`);
  });
});
