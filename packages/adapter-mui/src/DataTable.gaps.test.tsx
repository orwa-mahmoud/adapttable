/** Gap-fill: MUI select onChange handlers and chip delete. */
import type * as AdaptTableCore from "@adapttable/core";
import {
  createMemoryAdapter,
  useChromeBodyData,
  useFrontendData,
  type VirtualTableRow,
} from "@adapttable/core";
import { createTheme, ThemeProvider } from "@mui/material";
import { fireEvent, render, screen, within } from "@testing-library/react";
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
const theme = createTheme();

vi.mock("@adapttable/core", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    useChromeBodyData: vi.fn(),
  };
});

let adapter: ReturnType<typeof createMemoryAdapter>;

beforeEach(async () => {
  const actual =
    await vi.importActual<typeof AdaptTableCore>("@adapttable/core");
  vi.mocked(useChromeBodyData).mockImplementation(actual.useChromeBodyData);
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
      adapter,
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
      { filterLabels: { status: (v) => `Status: ${v}` } },
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
      { filterLabels: { status: (v) => `Status: ${v}` }, onClearFilters },
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
    expect(button.className).toContain("MuiIconButton-colorError");
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
    vi.mocked(useChromeBodyData).mockReturnValue({
      virtualization: {
        enabled: true,
        rows: [
          {
            row: { id: "b", name: "Bob" },
            index: 1,
            key: "b",
          } satisfies VirtualTableRow<Row>,
        ],
        paddingTop: 40,
        paddingBottom: 40,
        measureElement: vi.fn(),
      },
      loadMoreRef: { current: null },
      canLoadMore: true,
      virtualScrollRef: () => undefined,
    });
    mount({ virtualize: true, estimateRowSize: 40 }, "infinite");
    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("virtualizes mobile cards when enabled", () => {
    vi.mocked(useChromeBodyData).mockReturnValue({
      virtualization: {
        enabled: true,
        rows: [
          {
            row: { id: "b", name: "Bob" },
            index: 1,
            key: "b",
          } satisfies VirtualTableRow<Row>,
        ],
        paddingTop: 132,
        paddingBottom: 0,
        measureElement: vi.fn(),
      },
      loadMoreRef: { current: null },
      canLoadMore: false,
      virtualScrollRef: () => undefined,
    });
    mount({ isMobile: true, virtualize: true, estimateCardSize: 132 });
    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });
});
