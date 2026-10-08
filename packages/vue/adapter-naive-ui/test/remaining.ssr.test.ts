// @vitest-environment node
import { aggregate, type ColumnDef } from "@adapttable/vue";
import { setup } from "@css-render/vue3-ssr";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { bulkActions } from "../src/bulk-actions";
import {
  cellNavigation,
  columnSelectionCheckbox,
} from "../src/cell-navigation";
import { commandPalette } from "../src/command-palette";
import { contextMenu } from "../src/context-menu";
import { exportCsv } from "../src/export";
import { findInTable } from "../src/find-in-table";
import { groupingPanel } from "../src/grouping-panel";
import { print } from "../src/print";
import { rowReorder } from "../src/row-reorder";
import { savedViews, SavedViewsPanel } from "../src/saved-views";
import { selectionStats } from "../src/selection-stats";
import { sidePanel } from "../src/side-panel";
import { statusBar } from "../src/status-bar";

interface Row {
  id: string;
  team: string;
  amount: number;
}
const columns: ColumnDef<Row>[] = [
  { key: "team" },
  { key: "amount", aggregatable: { operations: ["sum", "avg"] } },
];
async function render(label: string, mobile: boolean) {
  const noop = vi.fn();
  const app = createSSRApp({
    render: () => [
      h(DataTable<Row>, {
        data: [{ id: "a", team: label, amount: 2 }],
        columns,
        rowKey: (row) => row.id,
        urlSync: false,
        forceMobile: mobile,
        dir: "rtl",
        selectable: true,
        features: [
          bulkActions([{ key: "record", label, onClick: noop }]),
          cellNavigation(),
          columnSelectionCheckbox(),
          commandPalette({ button: true }),
          contextMenu<Row>(),
          exportCsv(),
          findInTable(),
          groupingPanel<Row>("team", {
            groupAggregates: aggregate<Row>({ amount: "sum" }),
          }),
          print(noop, true),
          rowReorder<Row>(noop),
          savedViews({ storageKey: "same", storage: null }),
          selectionStats(),
          sidePanel({
            panels: [
              {
                key: "views",
                label,
                content: h(SavedViewsPanel, {
                  views: [{ name: label, search: "", readOnly: true }],
                  onApply: noop,
                  onRename: noop,
                  onMove: noop,
                  onSetDefault: noop,
                  onRemove: noop,
                }),
              },
            ],
            open: "views",
            onOpenChange: noop,
          }),
          statusBar(),
        ],
      }),
      h(SavedViewsPanel, {
        views: [{ name: label, search: "", readOnly: true }],
        onApply: noop,
        onRename: noop,
        onMove: noop,
        onSetDefault: noop,
        onRemove: noop,
      }),
    ],
  });
  const { collect } = setup(app);
  const html = await renderToString(app);
  return { html, styles: collect(), onRequest: noop };
}
it.each([false, true])(
  "renders native remaining controls without DOM access or request leakage (mobile=%s)",
  async (mobile) => {
    expect(typeof document).toBe("undefined");
    const [first, second] = await Promise.all([
      render("First request", mobile),
      render("Second request", mobile),
    ]);
    expect(first.html).toContain("First request");
    expect(first.html).not.toContain("Second request");
    expect(second.html).toContain("Second request");
    expect(second.html).not.toContain("First request");
    for (const result of [first, second]) {
      expect(result.html).toContain('data-adapttable-part="grouping-panel"');
      expect(result.html).toContain('data-adapttable-part="saved-views-panel"');
      expect(result.html).toContain('data-adapttable-part="side-panel"');
      expect(result.html).toContain('data-adapttable-part="side-panel-body"');
      expect(result.onRequest).not.toHaveBeenCalled();
      expect(result.html).toContain("n-card");
      expect(result.html).toContain("n-button");
      expect(result.html).not.toContain("n-data-table");
      expect(result.styles).toContain("cssr-id=");
    }
  }
);
