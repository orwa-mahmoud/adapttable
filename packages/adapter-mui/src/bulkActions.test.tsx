import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { bulkActions } from "./bulk-actions";
import { DataTable as BareDataTable } from "./DataTable";
import type { ColumnDef } from "./index";
import { DataTable } from "./testDataTable";

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
    // The shipped component, not the harness: the harness turns v2 props into
    // features, which is exactly what this test must not have happen. v3
    // removed those props, so there is no second way in to pass either.
    render(
      <BareDataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
      />
    );
    // No feature, no selection to bulk-act on: the checkbox column is part of
    // what `bulkActions` brings, so its absence is the same claim.
    expect(screen.queryByLabelText("Select all")).toBeNull();
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
        features={[bulkActions(ACTIONS)]}
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
