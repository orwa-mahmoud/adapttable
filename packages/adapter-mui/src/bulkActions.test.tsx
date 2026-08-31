import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { bulkActions } from "./bulk-actions";
import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [
  { id: "1", name: "Ada" },
  { id: "2", name: "Grace" },
];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "N", accessor: (r) => r.name },
];
const ACTIONS = [{ key: "x", label: "Archive", onClick: vi.fn() }];

describe("bulk actions (mui)", () => {
  it("draws no bulk bar when the feature was never imported", () => {
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        bulkActions={ACTIONS}
      />
    );
    fireEvent.click(screen.getByLabelText("Select all"));
    expect(screen.queryByText("2 selected")).not.toBeInTheDocument();
    expect(
      document.querySelector('[data-adapttable-part="bulk-bar"]')
    ).toBeNull();
  });

  it("draws the bulk bar when the feature is composed", () => {
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        bulkActions={ACTIONS}
        features={[bulkActions<Row>(ACTIONS)]}
      />
    );
    fireEvent.click(screen.getByLabelText("Select all"));
    expect(screen.getByText("2 selected")).toBeInTheDocument();
    expect(
      document.querySelector('[data-adapttable-part="bulk-bar"]')
    ).not.toBeNull();
    expect(screen.getByText("Archive")).toBeInTheDocument();
  });
});
