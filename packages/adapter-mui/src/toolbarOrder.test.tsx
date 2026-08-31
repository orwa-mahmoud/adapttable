import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { columnMenu } from "./column-menu";
import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";
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
        features={[columnMenu<Row>()]}
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
});
