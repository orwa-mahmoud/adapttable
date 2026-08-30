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
  props: Partial<Omit<Parameters<typeof DataTable<Row>>[0], "mode">> = {},
  data: Row[] = ROWS
) {
  function Harness() {
    const source = useFrontendData<Row>({
      data,
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

// Colour contrast is Bootstrap's own theme rather than this adapter's markup,
// and jsdom resolves none of it, so the rule reports on stylesheets that are
// not there. Every structural rule stays on.
const axeOpts = { rules: { "color-contrast": { enabled: false } } };

describe("accessibility (axe)", () => {
  it("a basic table has no detectable violations", async () => {
    const { container } = renderTable();
    expect(await axe(container, axeOpts)).toHaveNoViolations();
  });

  it("a sortable, searchable table has no violations", async () => {
    const { container } = renderTable({ searchable: true });
    expect(await axe(container, axeOpts)).toHaveNoViolations();
  });

  it("an empty table has no violations", async () => {
    const { container } = renderTable({}, []);
    expect(await axe(container, axeOpts)).toHaveNoViolations();
  });

  it("a table with row actions has no violations", async () => {
    const { container } = renderTable({
      rowActions: [{ key: "e", label: "Edit", onClick: () => undefined }],
    });
    expect(await axe(container, axeOpts)).toHaveNoViolations();
  });
});
