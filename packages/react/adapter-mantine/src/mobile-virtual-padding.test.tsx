/**
 * Covers MobileCards' trailing virtual-spacer branch (`paddingBottom > 0`).
 * The shell's `tableProps` are overridden with a non-zero `paddingBottom`,
 * which is only rendered in the virtualized mobile layout.
 */
import { createMemoryAdapter, useFrontendData } from "@adapttable/react";
import type * as AdapterModule from "@adapttable/react/adapter";
import { TableComposition } from "@adapttable/react/adapter";
import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "./data-table.test-utils";
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

vi.mock("@adapttable/react/adapter", async (importOriginal) => {
  const actual = await importOriginal<typeof AdapterModule>();
  return { ...actual, TableComposition: vi.fn(actual.TableComposition) };
});

const actualCore = await vi.importActual<typeof AdapterModule>(
  "@adapttable/react/adapter"
);

beforeEach(() => {
  vi.mocked(TableComposition).mockImplementation(({ props, kit }) =>
    actualCore.TableComposition({
      props,
      kit: {
        ...kit,
        body: (view, headerOffset, tableProps) =>
          kit.body(
            {
              ...view,
              tableProps: {
                ...view.tableProps,
                rowEntries: view.tableProps.rows.map((row, index) => ({
                  row,
                  index,
                  key: String(view.tableProps.getRowId(row)),
                })),
                paddingTop: 0,
                // Non-zero trailing padding renders the bottom spacer div.
                paddingBottom: 40,
              },
            },
            headerOffset,
            tableProps
          ),
      },
    })
  );
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
