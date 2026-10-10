// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { bulkActions } from "../src/bulk-actions";
import { commandPalette } from "../src/command-palette";
import { contextMenu } from "../src/context-menu";
import { exportCsv } from "../src/export-csv";
import { print } from "../src/print";
import { sidePanel } from "../src/side-panel";
interface Row {
  id: string;
  name: string;
}
describe("action SSR requests", () => {
  it("renders controls without executing actions, jobs, browser listeners or retaining a prior request", async () => {
    const request = vi.fn();
    const run = vi.fn();
    const render = () =>
      renderToString(
        createSSRApp({
          render: () =>
            h(DataTable<Row>, {
              data: [{ id: "a", name: "Ada" }],
              columns: [{ key: "name" }],
              rowKey: (row) => row.id,
              urlSync: false,
              selectable: true,
              defaultSelectedIds: ["a"],
              features: [
                bulkActions([{ key: "run", label: "Run", onClick: run }]),
                commandPalette({
                  button: true,
                  open: true,
                  commands: [{ key: "host", label: "Host", onSelect: run }],
                }),
                contextMenu<Row>(),
                sidePanel({ panels: [], open: null, onOpenChange: run }),
                exportCsv<Row>({ scope: "all", onExportAll: request }),
                print(run, true),
              ],
            }),
        })
      );
    const first = await render();
    const second = await render();
    expect(first).toBe(second);
    expect(first).toContain("export-csv-button");
    expect(first).toContain("command-palette-button");
    expect(first).not.toContain('role="dialog"');
    expect(first).not.toContain('role="menu"');
    expect(request).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });
});
