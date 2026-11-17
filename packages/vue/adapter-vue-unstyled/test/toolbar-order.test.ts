/**
 * The toolbar draws its controls in the order every binding uses — Filters,
 * Saved views, Columns, then export — whatever order the features were
 * installed in.
 */
import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { exportCsv } from "../src/export-csv";
import { columnMenu } from "../src/features/columnMenu";
import { filters } from "../src/filters";
import { savedViews } from "../src/saved-views";

const rows = [{ id: "a", name: "Ada", team: "Core" }];
const columns = [{ key: "name" }, { key: "team" }];

describe("toolbar order", () => {
  it("draws Filters, Saved views, Columns and Export in that order", async () => {
    const root = document.createElement("div");
    root.innerHTML = await renderToString(
      createSSRApp({
        render: () =>
          h(DataTable<(typeof rows)[number]>, {
            data: rows,
            columns,
            rowKey: (row) => row.id,
            urlSync: false,
            features: [
              exportCsv(),
              columnMenu(),
              savedViews({ storageKey: "order", storage: null }),
              filters([{ key: "team", type: "text" }]),
            ],
          }),
      })
    );
    const toolbar = root.querySelector('[data-adapttable-part="toolbar"]')!;
    const order = [
      "filters-button",
      "views-button",
      "column-menu-button",
      "export-csv-button",
    ].map((name) => {
      const control = toolbar.querySelector(`[data-adapttable-part="${name}"]`);
      expect(control, name).not.toBeNull();
      return [...toolbar.querySelectorAll("[data-adapttable-part]")].indexOf(
        control!
      );
    });
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});
