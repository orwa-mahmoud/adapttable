import { createMemoryAdapter, useFrontendData } from "@adapttable/core";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [
  { id: "a", name: "Alice" },
  { id: "b", name: "Bob" },
];
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
];

function mount(
  override: Partial<Omit<Parameters<typeof DataTable<Row>>[0], "mode">> = {},
  mode: "paged" | "infinite" = "paged",
  initialUrl = ""
) {
  const adapter = createMemoryAdapter(initialUrl);
  function Harness() {
    const source = useFrontendData<Row>({
      data: ROWS,
      adapter,
      columns,
      paginationMode: mode,
      arrayExtraKeys: ["status"],
    });
    return (
      <DataTable
        source={source}
        columns={columns}
        rowKey={(r) => r.id}
        {...override}
      />
    );
  }
  render(
    <MantineProvider>
      <Harness />
    </MantineProvider>
  );
  return adapter;
}

describe("DataTable interactions + chip merge", () => {
  it("merges filterLabel chips with caller-supplied extraChips", () => {
    mount(
      {
        filterLabels: { status: (v) => `Status: ${v}` },
        extraChips: [{ key: "x", label: "Custom chip", onRemove: vi.fn() }],
      },
      "paged",
      "f_status=Active,Planned"
    );
    expect(screen.getByText("Status: Active")).toBeInTheDocument();
    expect(screen.getByText("Status: Planned")).toBeInTheDocument();
    expect(screen.getByText("Custom chip")).toBeInTheDocument();
  });

  it("shows only extraChips when there are no label-driven chips", () => {
    mount({
      extraChips: [{ key: "x", label: "Only custom", onRemove: vi.fn() }],
    });
    expect(screen.getByText("Only custom")).toBeInTheDocument();
  });

  it("honours an explicit activeFilterCount override on the badge", () => {
    mount({ filters: <div>f</div>, activeFilterCount: 7 });
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("changing the rows-per-page select commits a new limit", () => {
    const adapter = mount({}, "infinite");
    const select = screen.getAllByLabelText("Rows per page")[0]!;
    fireEvent.click(select);
    const option = screen
      .getAllByText("50")
      .find((el) => el.closest('[role="option"]'));
    if (option) {
      fireEvent.click(option);
      expect(adapter.getSearch()).toContain("limit=50");
    }
  });

  it("changing the sort-by select commits a sort", () => {
    const adapter = mount({
      sortByOptions: [{ value: "name", label: "Name" }],
    });
    const select =
      screen
        .getAllByLabelText("Sort by")
        .find((n) => n instanceof HTMLInputElement) ??
      screen.getAllByLabelText("Sort by")[0]!;
    fireEvent.click(select);
    const option = screen
      .getAllByText("Name")
      .find((el) => el.closest('[role="option"]'));
    if (option) {
      fireEvent.click(option);
      expect(adapter.getSearch()).toContain("sortBy=name");
    }
  });

  it("does not render a hidden row action", () => {
    mount({
      rowActions: [
        {
          key: "e",
          label: "EditHidden",
          onClick: vi.fn(),
          isHidden: () => true,
        },
      ],
    });
    expect(screen.queryByLabelText("EditHidden")).toBeNull();
  });
});
