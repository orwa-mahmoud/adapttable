/** Gap-fill: footer prev, clear-all link, bulk clear. */
import type * as CoreModule from "@adapttable/core";
import {
  createMemoryAdapter,
  useDataTableShell,
  useFrontendData,
  type VirtualTableRow,
} from "@adapttable/core";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@adapttable/core", async (importOriginal) => {
  const actual = await importOriginal<typeof CoreModule>();
  return {
    ...actual,
    useDataTableShell: vi.fn(actual.useDataTableShell),
  };
});

const actualCore = await vi.importActual<typeof CoreModule>("@adapttable/core");

let adapter: ReturnType<typeof createMemoryAdapter>;

beforeEach(() => {
  // Default: delegate to the real shell so non-virtual tests run untouched.
  vi.mocked(useDataTableShell).mockImplementation(actualCore.useDataTableShell);
});

/**
 * Force a controlled virtual window for the virtualization render tests by
 * overriding the shell's `tableProps` — the body renderers read `rowEntries`
 * (the windowed subset) just as they would from a real virtualizer.
 */
function mockBodyData(rows: VirtualTableRow<Row>[], padding: number) {
  vi.mocked(useDataTableShell).mockImplementation((props, render) => {
    const real = actualCore.useDataTableShell(props, render);
    return {
      ...real,
      tableProps: {
        ...real.tableProps,
        rowEntries: rows,
        paddingTop: padding,
        paddingBottom: padding,
        measureElement: vi.fn(),
      },
    };
  });
}

function mount(
  override: Partial<Omit<Parameters<typeof DataTable<Row>>[0], "mode">> = {},
  url = "",
  mode: "paged" | "infinite" = "paged"
) {
  adapter = createMemoryAdapter(url);
  function Harness() {
    const source = useFrontendData<Row>({
      data: ROWS,
      urlAdapter: adapter,
      columns,
      paginationMode: mode,
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
    <ChakraProvider value={defaultSystem}>
      <Harness />
    </ChakraProvider>
  );
}

describe("Chakra gaps", () => {
  it("footer previous button goes back a page", () => {
    mount({}, "limit=1&page=2");
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(adapter.getSearch()).not.toContain("page=2");
  });

  it("clear-all chip link calls onClearFilters", () => {
    const onClearFilters = vi.fn();
    mount(
      { filterLabels: { status: (v) => `Status: ${v}` }, onClearFilters },
      "f_status=Active"
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(onClearFilters).toHaveBeenCalled();
  });

  it("bulk bar Clear button drops the selection", () => {
    mount({ bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }] });
    fireEvent.click(screen.getByLabelText("Select all"));
    expect(screen.getByText("2 selected")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(screen.queryByText("2 selected")).toBeNull();
  });

  it("desktop: renders icon row actions and fires them", () => {
    const onClick = vi.fn();
    mount({
      rowActions: [
        {
          key: "view",
          label: "View",
          icon: <span aria-hidden>i</span>,
          onClick,
        },
      ],
    });
    fireEvent.click(screen.getAllByRole("button", { name: "View" })[0]!);
    expect(onClick).toHaveBeenCalledWith(ROWS[0]);
  });

  it("virtualizes desktop rows when enabled", () => {
    mockBodyData([{ row: { id: "b", name: "Bob" }, index: 1, key: "b" }], 40);
    mount({ virtualize: true, estimateRowSize: 40 }, "", "infinite");
    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("virtualizes mobile cards when enabled", () => {
    mockBodyData([{ row: { id: "b", name: "Bob" }, index: 1, key: "b" }], 132);
    mount({ forceMobile: true, virtualize: true, estimateCardSize: 132 });
    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });
});
