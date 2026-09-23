import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { columnMenu } from "./column-menu";
import { DataTable } from "./data-table.test-utils";
import { densityChooser } from "./density";
import { editHistory, editing, undoRedoButtons } from "./editing";
import { exportCsv } from "./export";
import { filters as filtersFeature } from "./filters";
import type { ColumnDef } from "./index";
import { print } from "./print";
import { savedViews } from "./saved-views";
import { renderMui } from "./test-utils";

/**
 * The toolbar reads Filters · Saved views · Columns · Export CSV. Every
 * adapter mounts these through core's named chrome slots, so this order is
 * the same in all of them — assert it here, in each, or it drifts unseen.
 */
interface Row {
  id: string;
  name: string;
}
const rows: Row[] = [{ id: "a", name: "Alice" }];
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
];

describe("toolbar order (MUI)", () => {
  it("renders Filters, Saved views, Columns, then Export CSV", () => {
    renderMui(
      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.id}
        urlSync={false}
        filters={[{ key: "name", type: "text" }]}
        enableColumnMenu
        features={[
          columnMenu(),
          filtersFeature<Row>([{ key: "name", type: "text" }]),
          savedViews({ storageKey: "order-test" }),
          exportCsv<Row>(),
        ]}
        exportCsv
        savedViews={{ storageKey: "order-test" }}
      />
    );

    const wanted = ["Filters", "Saved views", "Columns", "Export CSV"];
    const buttons = screen.getAllByRole("button");
    const seen = buttons
      .map((b) => (b.textContent ?? "").trim())
      .filter((text) => wanted.includes(text));

    expect(seen).toEqual(wanted);
  });
  it("draws Undo and Redo after Export and Print, like every kit", () => {
    renderMui(
      <DataTable
        data={rows}
        columns={[{ key: "name", header: "Name", editable: true }]}
        rowKey={(r) => r.id}
        urlSync={false}
        forceMobile={false}
        features={[
          editHistory(),
          densityChooser(),
          exportCsv<Row>(),
          print(vi.fn(), true),
          undoRedoButtons(),
          editing(vi.fn()),
        ]}
      />
    );

    const part = (name: string) =>
      document.querySelector(`[data-adapttable-part="${name}"]`);
    const order = [
      "export-csv-button",
      "print-button",
      "undo-button",
      "redo-button",
    ].map((name) => {
      const node = part(name);
      expect(node, name).not.toBeNull();
      return node;
    });
    for (let index = 1; index < order.length; index++) {
      const earlier = order[index - 1]!;
      const later = order[index]!;
      expect(
        earlier.compareDocumentPosition(later) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    }
  });
});
