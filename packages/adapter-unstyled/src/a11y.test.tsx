import { createMemoryAdapter, useFrontendData } from "@adapttable/core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
  city: string;
}
const ROWS: Row[] = [
  { id: "a", name: "Alice", city: "Dubai" },
  { id: "b", name: "Bob", city: "Riyadh" },
];
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
  { key: "city", header: "City", accessor: (r) => r.city },
];

function renderTable(
  props: Partial<Omit<Parameters<typeof DataTable<Row>>[0], "mode">> = {}
) {
  function Harness() {
    const source = useFrontendData<Row>({
      data: ROWS,
      urlAdapter: createMemoryAdapter(),
      columns,
      paginationMode: "paged",
    });
    return (
      <DataTable
        source={source}
        columns={columns}
        rowKey={(r) => r.id}
        {...props}
      />
    );
  }
  return render(<Harness />);
}

describe("accessibility (axe)", () => {
  it("a basic table has no detectable violations", async () => {
    const { container } = renderTable();
    expect(
      await axe(container, { rules: { "color-contrast": { enabled: false } } })
    ).toHaveNoViolations();
  });

  it("a table with selection, actions, and chips has no violations", async () => {
    const { container } = renderTable({
      bulkActions: [{ key: "x", label: "Delete", onClick: () => undefined }],
      rowActions: [{ key: "e", label: "Edit", onClick: () => undefined }],
      filterLabels: { status: (v) => `Status: ${v}` },
    });
    // toggle a selection so the bulk bar + selected row render
    const checkbox = container.querySelector<HTMLInputElement>(
      'input[aria-label="Select all"]'
    );
    checkbox?.click();
    expect(
      await axe(container, { rules: { "color-contrast": { enabled: false } } })
    ).toHaveNoViolations();
  });

  it("an empty table has no violations", async () => {
    function Empty() {
      const source = useFrontendData<Row>({
        data: [],
        urlAdapter: createMemoryAdapter(),
        columns,
        paginationMode: "paged",
      });
      return (
        <DataTable source={source} columns={columns} rowKey={(r) => r.id} />
      );
    }
    const { container } = render(<Empty />);
    expect(
      await axe(container, { rules: { "color-contrast": { enabled: false } } })
    ).toHaveNoViolations();
  });
});
