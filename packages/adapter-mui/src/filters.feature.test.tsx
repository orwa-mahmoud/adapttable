import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./data-table.test-utils";
import { DataTable as BareDataTable } from "./DataTable";
import { filters } from "./filters";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  status: string;
}
const ROWS: Row[] = [
  { id: "1", status: "Active" },
  { id: "2", status: "Idle" },
];
const COLS: ColumnDef<Row>[] = [
  { key: "status", header: "Status", accessor: (r) => r.status },
];
const DEFS = [{ key: "status", label: "Status", type: "text" as const }];

describe("filters feature (mui)", () => {
  it("draws no chip strip when the feature was never imported", () => {
    // The shipped component, not the harness: the harness turns v2 props into
    // features, which is exactly what this test must not have happen. v3
    // removed those props, so there is no second way in to pass either.
    render(
      <BareDataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        extraChips={[{ key: "x", label: "Custom", onRemove: vi.fn() }]}
      />
    );
    expect(screen.queryByText("Custom")).not.toBeInTheDocument();
  });

  it("draws chips when the feature is composed", () => {
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        features={[filters<Row>(DEFS)]}
        extraChips={[{ key: "x", label: "Custom", onRemove: vi.fn() }]}
      />
    );
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  it("draws the filters panel when the feature is composed", async () => {
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        features={[filters<Row>(DEFS)]}
        filters={DEFS}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    await waitFor(() => {
      expect(
        document.querySelector('[data-adapttable-part="filters-form"]')
      ).not.toBeNull();
    });
  });
});
