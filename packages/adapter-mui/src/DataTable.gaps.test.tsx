/** Gap-fill: MUI select onChange handlers and chip delete. */
import { createMemoryAdapter, useFrontendData } from "@adapttable/core";
import type * as AdapterModule from "@adapttable/core/adapter";
import {
  useDataTableShell,
  type VirtualTableRow,
} from "@adapttable/core/adapter";
import { createTheme, ThemeProvider } from "@mui/material";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { filters as filtersFeature } from "./filters";
import type { ColumnDef } from "./index";
import { DataTable } from "./testDataTable";
import { virtualize } from "./virtualize";

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
const theme = createTheme();

vi.mock("@adapttable/core/adapter", async (importOriginal) => {
  const actual = await importOriginal<typeof AdapterModule>();
  return { ...actual, useDataTableShell: vi.fn(actual.useDataTableShell) };
});

const actualAdapter = await vi.importActual<typeof AdapterModule>(
  "@adapttable/core/adapter"
);

/**
 * Force a controlled virtual window by overriding the shell's `tableProps` —
 * the body renderers read `rowEntries` exactly as from a real virtualizer.
 */
function mockBodyData(
  rows: VirtualTableRow<Row>[],
  top: number,
  bottom: number
) {
  vi.mocked(useDataTableShell).mockImplementation((props, render) => {
    const real = actualAdapter.useDataTableShell(props, render);
    return {
      ...real,
      skipChromeBody: true,
      tableProps: {
        ...real.tableProps,
        rowEntries: rows,
        paddingTop: top,
        paddingBottom: bottom,
        measureElement: vi.fn(),
      },
    };
  });
}

let adapter: ReturnType<typeof createMemoryAdapter>;

beforeEach(() => {
  // Default: the real shell, so non-virtual tests run untouched.
  vi.mocked(useDataTableShell).mockImplementation(
    actualAdapter.useDataTableShell
  );
});

function mount(
  override: Partial<Omit<Parameters<typeof DataTable<Row>>[0], "mode">> = {},
  mode: "paged" | "infinite" = "paged",
  url = ""
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
    <ThemeProvider theme={theme}>
      <Harness />
    </ThemeProvider>
  );
}

describe("MUI gaps", () => {
  it("sort-by select commits a sort", () => {
    mount({ sortByOptions: [{ value: "name", label: "Name" }] });
    fireEvent.mouseDown(screen.getByLabelText("Sort by"));
    const listbox = screen.getByRole("listbox");
    fireEvent.click(within(listbox).getByText("Name"));
    expect(adapter.getSearch()).toContain("sortBy=name");
  });

  it("rows-per-page select commits a new limit (infinite mode)", () => {
    mount({}, "infinite");
    fireEvent.mouseDown(screen.getByLabelText("Rows per page"));
    const listbox = screen.getByRole("listbox");
    fireEvent.click(within(listbox).getByText("50"));
    expect(adapter.getSearch()).toContain("limit=50");
  });

  it("deleting a chip clears its filter", () => {
    mount(
      {
        filterLabels: { status: (v) => `Status: ${v}` },
        features: [filtersFeature<Row>([])],
      },
      "paged",
      "f_status=Active"
    );
    const remove = screen.getByLabelText("Clear all: Status: Active");
    fireEvent.click(remove);
    expect(adapter.getSearch()).not.toContain("f_status");
  });

  it("clear-all link clears filters", () => {
    const onClearFilters = vi.fn();
    mount(
      {
        filterLabels: { status: (v) => `Status: ${v}` },
        onClearFilters,
        features: [filtersFeature<Row>([])],
      },
      "paged",
      "f_status=Active"
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(onClearFilters).toHaveBeenCalled();
  });

  it("fires prefetch on desktop row hover", () => {
    const prefetch = vi.fn();
    mount({ prefetch });
    const cell = screen.getByText("Alice").closest("tr")!;
    fireEvent.mouseEnter(cell);
    expect(prefetch).toHaveBeenCalledWith(ROWS[0]);
  });

  it("maps destructive row action colors to MUI error buttons", () => {
    const onClick = vi.fn();
    mount({
      rowActions: [
        {
          key: "delete",
          label: "Delete",
          color: "danger",
          onClick,
        },
      ],
    });
    const button = screen.getAllByRole("button", { name: "Delete" })[0]!;
    expect(button.className).toContain("MuiButton-colorError");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledWith(ROWS[0]);
  });

  it("renders a custom Cell and a center-aligned column", () => {
    const cellCols: ColumnDef<Row>[] = [
      {
        key: "name",
        header: "Name",
        align: "center",
        Cell: ({ row }) => <b data-testid="cell">{row.name.toUpperCase()}</b>,
      },
    ];
    mount({ columns: cellCols });
    expect(screen.getAllByTestId("cell")[0]).toHaveTextContent("ALICE");
  });

  it("virtualizes desktop rows when enabled", () => {
    mockBodyData(
      [{ row: { id: "b", name: "Bob" }, index: 1, key: "b" }],
      40,
      40
    );
    mount(
      {
        virtualize: true,
        estimateRowSize: 40,
        features: [virtualize({ estimateRowSize: 40 })],
      },
      "infinite"
    );
    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("virtualizes mobile cards when enabled", () => {
    mockBodyData(
      [{ row: { id: "b", name: "Bob" }, index: 1, key: "b" }],
      132,
      0
    );
    mount({
      forceMobile: true,
      virtualize: true,
      estimateCardSize: 132,
      features: [virtualize({ estimateCardSize: 132 })],
    });
    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });
});
