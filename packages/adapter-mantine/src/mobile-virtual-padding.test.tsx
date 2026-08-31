/**
 * Covers MobileCards' trailing virtual-spacer branch (`paddingBottom > 0`).
 * The shell's `tableProps` are overridden with a non-zero `paddingBottom`,
 * which is only rendered in the virtualized mobile layout.
 */
import { createMemoryAdapter, useFrontendData } from "@adapttable/core";
import type * as AdapterModule from "@adapttable/core/adapter";
import { useDataTableShell } from "@adapttable/core/adapter";
import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "./testDataTable";
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
  { key: "name", header: "Name", accessor: (r) => r.name },
];

vi.mock("@adapttable/core/adapter", async (importOriginal) => {
  const actual = await importOriginal<typeof AdapterModule>();
  return { ...actual, useDataTableShell: vi.fn(actual.useDataTableShell) };
});

const actualCore = await vi.importActual<typeof AdapterModule>(
  "@adapttable/core/adapter"
);

beforeEach(() => {
  vi.mocked(useDataTableShell).mockImplementation((props, render) => {
    const real = actualCore.useDataTableShell(props, render);
    return {
      ...real,
      skipChromeBody: true,
      tableProps: {
        ...real.tableProps,
        rowEntries: real.tableProps.rows.map((row, index) => ({
          row,
          index,
          key: String(real.tableProps.getRowId(row)),
        })),
        paddingTop: 0,
        // Non-zero trailing padding renders the bottom spacer div.
        paddingBottom: 40,
      },
    };
  });
});

const adapter = createMemoryAdapter("");

function Harness() {
  const source = useFrontendData<Row>({
    data: ROWS,
    urlAdapter: adapter,
    columns,
    paginationMode: "infinite",
  });
  return (
    <MantineProvider>
      <DataTable
        source={source}
        columns={columns}
        rowKey={(r) => r.id}
        forceMobile
        virtualize
      />
    </MantineProvider>
  );
}

describe("MobileCards trailing virtual spacer", () => {
  it("renders a bottom spacer when paddingBottom > 0", () => {
    const { container } = render(<Harness />);
    const spacers = container.querySelectorAll("div[aria-hidden][style]");
    const hasBottomSpacer = Array.from(spacers).some(
      (el) => (el as HTMLElement).style.height === "40px"
    );
    expect(hasBottomSpacer).toBe(true);
  });
});
