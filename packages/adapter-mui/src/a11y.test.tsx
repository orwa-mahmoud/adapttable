import { createMemoryAdapter, useFrontendData } from "@adapttable/core";
import { createTheme, ThemeProvider } from "@mui/material";
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
const theme = createTheme();
const axeOpts = { rules: { "color-contrast": { enabled: false } } };

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
  return render(
    <ThemeProvider theme={theme}>
      <Harness />
    </ThemeProvider>
  );
}

describe("accessibility (axe) — MUI", () => {
  it("a full-featured table has no violations", async () => {
    const { container } = renderTable({
      bulkActions: [{ key: "x", label: "Delete", onClick: () => undefined }],
      rowActions: [{ key: "e", label: "Edit", onClick: () => undefined }],
      filterLabels: { status: (v) => `Status: ${v}` },
    });
    container
      .querySelector<HTMLInputElement>('input[aria-label="Select all"]')
      ?.click();
    expect(await axe(container, axeOpts)).toHaveNoViolations();
  });
});
