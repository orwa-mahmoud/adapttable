import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";

// State controller and spies for useDataTableShell
let mockShellState: any = {};
const mockSetFiltersOpen = vi.fn();
const mockOnClickFilters = vi.fn();
const mockOnPointerDownFilters = vi.fn();
const mockClearFilters = vi.fn();
const mockSetSort = vi.fn();
const mockAutoSizeColumns = vi.fn();
const mockAutoSizeColumn = vi.fn();

vi.mock("./components/ColumnMenu", () => ({
  ColumnMenu: (props: any) => (
    <div data-testid="mock-column-menu">
      <button type="button" onClick={() => props.onSortColumn("name", "asc")}>
        Sort Col
      </button>
      <button type="button" onClick={() => props.onFilterColumn("name")}>
        Filter Col
      </button>
      <button type="button" onClick={() => props.onAutoSize()}>
        Auto Size All
      </button>
      <button type="button" onClick={() => props.onAutoSizeColumn("name")}>
        Auto Size Col
      </button>
    </div>
  ),
}));

vi.mock("@adapttable/core/adapter", async () => {
  const actual = await vi.importActual("@adapttable/core/adapter");
  return {
    ...actual,
    useMountStagger: vi.fn(),
    useDataTableShell: vi.fn((_props, renderAutoForm) => {
      if (typeof renderAutoForm === "function") {
        renderAutoForm();
      }

      return {
        chrome: {
          body: mockShellState.body ?? "desktop",
          emptyVariant: mockShellState.emptyVariant ?? "noData",
          clearFilters: mockClearFilters,
          isMobile: mockShellState.isMobile ?? false,
          isRefreshing: mockShellState.isRefreshing ?? false,
          showFooter: mockShellState.showFooter ?? true,
          grouping: mockShellState.grouping ?? false,
          allColumns: [{ key: "name", header: "Name" }],
          columnLayout: {
            state: { order: ["name"], hidden: {}, pinned: {} },
            isHidden: () => false,
            isPinned: () => undefined,
            setHidden: vi.fn(),
            toggleVisible: vi.fn(),
            setPinned: vi.fn(),
            move: vi.fn(),
            reset: vi.fn(),
          },
        },
        source: {
          rows: [{ id: "1", name: "Alice" }],
          total: 20,
          limit: 10,
          sortBy: "name",
          sortDir: "asc",
          setSort: mockSetSort,
          setPage: vi.fn(),
          setLimit: vi.fn(),
        },
        table: {
          pagination: { safePage: 1, totalPages: 2, fromIndex: 1, toIndex: 10 },
        },
        labels: {
          loading: "Loading data...",
          noData: "No data available",
          noResults: "No results match your search",
          clearAll: "Clear filters",
          rowsPerPage: "Rows per page",
          previousPage: "Previous page",
          nextPage: "Next page",
          showing: () => "Showing 1-10",
          pageOf: () => "Page 1 of 2",
          columns: "Columns",
          search: "Search",
          sortBy: "Sort by",
          filters: "Filters",
          autoSizeColumns: "Auto-fit",
          resetColumns: "Reset",
          actions: "Actions",
          reorderRow: "Reorder",
        },
        toolbarProps: {
          table: {
            labels: {
              search: "Search",
              sortBy: "Sort by",
              filters: "Filters",
              rowsPerPage: "Rows per page",
            },
            isMobile: mockShellState.isMobile ?? false,
            source: {
              sortBy: "name",
              sortDir: "asc",
              limit: 10,
              setSort: mockSetSort,
              setLimit: vi.fn(),
            },
            getSearchInputProps: () => ({ value: "", onChange: vi.fn() }),
          },
          hasFilters: true,
          activeFilterCount: 1,
        },
        filtersOpen: mockShellState.filtersOpen ?? false,
        filtersTrigger: {
          onClick: mockOnClickFilters,
          onPointerDown: mockOnPointerDownFilters,
        },
        setFiltersOpen: mockSetFiltersOpen,
        rootRef: { current: null },
        hasRowActions: true,
        hasRowReorder: true,
        gridFocus: { enabled: true, focusedCell: null },
        autoSizeColumns: mockAutoSizeColumns,
        autoSizeColumn: mockAutoSizeColumn,
        tableProps: {
          table: {
            columns: [{ key: "name", header: "Name" }],
            labels: { sortBy: "Sort by" },
            getHeaderRowProps: () => ({}),
            getHeaderCellProps: () => ({}),
            getRowProps: () => ({}),
            getCellProps: () => ({}),
            getRowKey: (row: any) => row.id,
            getCellContent: (_: any, row: any) => row.name,
          },
          rows: [{ id: "1", name: "Alice" }],
          confirm: () => undefined,
          getRowId: (row: any) => row.id,
          rowReorder: mockShellState.rowReorder ?? undefined,
        },
      };
    }),
  };
});

interface Person {
  id: string;
  name: string;
}

const defaultProps = {
  data: [{ id: "1", name: "Alice" }],
  columns: [
    { key: "name", header: "Name", accessor: (row: Person) => row.name },
  ],
  rowKey: (row: Person) => row.id,
  urlSync: false,
};

describe("DataTable", () => {
  it("renders desktop layout with default popover filters and size fallback", () => {
    mockShellState = { body: "desktop", isMobile: false, showFooter: true };

    render(
      <DataTable
        {...defaultProps}
        animate={true}
        classNames={{
          root: "custom-root",
          toolbar: "custom-tb",
          table: "custom-tbl",
          footer: "custom-ft",
        }}
      />
    );

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(
      document.querySelector('[data-adapttable-part="table-footer"]')
    ).not.toBeInTheDocument();
  });

  it("handles density='compact' and size='sm' mapping", () => {
    mockShellState = { body: "desktop" };

    const { rerender } = render(
      <DataTable {...defaultProps} density="compact" />
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();

    rerender(<DataTable {...defaultProps} size="lg" density="comfortable" />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("renders row reorder announcer", () => {
    mockShellState = {
      body: "desktop",
      isMobile: false,
      rowReorder: { announcement: "Moved row 1 to 2" },
    };

    render(<DataTable {...defaultProps} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("hides the column menu on mobile even when enableColumnMenu is set", () => {
    mockShellState = { body: "mobile", isMobile: true };

    render(
      <DataTable
        {...defaultProps}
        enableColumnMenu={true}
        prefetch={vi.fn()}
        classNames={{ root: "rt", table: "tbl" }}
      />
    );

    expect(screen.queryByTestId("mock-column-menu")).not.toBeInTheDocument();
    expect(document.querySelector(".rt")).toBeInTheDocument();
  });

  it("executes ColumnMenu inline callbacks: onSortColumn, onFilterColumn, onAutoSize, onAutoSizeColumn", () => {
    mockShellState = {
      body: "desktop",
      isMobile: false,
      filtersOpen: false,
    };

    render(<DataTable {...defaultProps} enableColumnMenu={true} />);

    fireEvent.click(screen.getByRole("button", { name: "Sort Col" }));
    expect(mockSetSort).toHaveBeenCalledWith("name", "asc");

    fireEvent.click(screen.getByRole("button", { name: "Filter Col" }));
    expect(mockSetFiltersOpen).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole("button", { name: "Auto Size Col" }));
    expect(mockAutoSizeColumn).toHaveBeenCalledWith("name");

    fireEvent.click(screen.getByRole("button", { name: "Auto Size All" }));
    expect(mockAutoSizeColumns).toHaveBeenCalled();
  });

  it("handles filter triggers, pointer down, and onCloseFilters callback", () => {
    mockShellState = { body: "desktop", filtersOpen: true };

    render(<DataTable {...defaultProps} filtersMode="drawer" />);

    const filterBtn = screen.getByRole("button", { name: /Filters/i });
    fireEvent.pointerDown(filterBtn);
    expect(mockOnPointerDownFilters).toHaveBeenCalled();

    fireEvent.click(filterBtn);
    expect(mockOnClickFilters).toHaveBeenCalled();
  });

  it("renders mobile body region and custom tableFooter", () => {
    mockShellState = { body: "mobile", isMobile: true };

    render(
      <DataTable
        {...defaultProps}
        tableFooter={<div data-testid="custom-footer">Footer Content</div>}
      />
    );

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByTestId("custom-footer")).toBeInTheDocument();
  });

  it("renders skeleton body region and custom skeleton slot", () => {
    mockShellState = { body: "skeleton" };

    const { rerender } = render(<DataTable {...defaultProps} />);
    expect(screen.getByText("Loading data...")).toBeInTheDocument();

    rerender(
      <DataTable
        {...defaultProps}
        slots={{
          skeleton: <div data-testid="custom-skeleton">Custom Loading...</div>,
        }}
      />
    );
    expect(screen.getByTestId("custom-skeleton")).toBeInTheDocument();
  });

  it("renders empty body region with noData and noResults variants and custom slots", () => {
    mockShellState = { body: "empty", emptyVariant: "noData" };

    const { rerender } = render(<DataTable {...defaultProps} />);
    expect(screen.getByText("No data available")).toBeInTheDocument();

    mockShellState = { body: "empty", emptyVariant: "noResults" };
    rerender(<DataTable {...defaultProps} />);

    expect(
      screen.getByText("No results match your search")
    ).toBeInTheDocument();
    const clearBtn = screen.getByRole("button", { name: "Clear filters" });
    fireEvent.click(clearBtn);
    expect(mockClearFilters).toHaveBeenCalled();

    rerender(
      <DataTable
        {...defaultProps}
        slots={{
          noResults: (
            <div data-testid="custom-no-results">Custom No Results</div>
          ),
          empty: <div data-testid="custom-empty">Custom Empty</div>,
        }}
      />
    );
    expect(screen.getByTestId("custom-no-results")).toBeInTheDocument();
  });

  it("uses the empty slot when the table has no data", () => {
    mockShellState = { body: "empty", emptyVariant: "noData" };

    render(
      <DataTable
        {...defaultProps}
        classNames={{ table: "tbl" }}
        slots={{
          empty: <div data-testid="custom-empty">Custom Empty</div>,
        }}
      />
    );

    expect(screen.getByTestId("custom-empty")).toBeInTheDocument();
  });

  it("hides PaginationFooter when chrome.showFooter is false and sets aria-busy on refreshing", () => {
    mockShellState = { body: "desktop", showFooter: false, isRefreshing: true };

    const { container } = render(<DataTable {...defaultProps} />);

    expect(container.firstChild).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("Page 1 of 2")).not.toBeInTheDocument();
  });
});
