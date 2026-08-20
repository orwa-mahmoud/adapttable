import type { TableLabels } from "@adapttable/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Toolbar, type ToolbarProps } from "./components/Toolbar";

interface Row {
  id: string;
  name: string;
}

const labels = {
  search: "Search records",
  sortBy: "Sort by",
  filters: "Filters",
  rowsPerPage: "Rows per page",
} as Required<
  Pick<TableLabels, "search" | "sortBy" | "filters" | "rowsPerPage">
>;

function makeToolbarProps(
  overrides?: Partial<ToolbarProps<Row>>
): ToolbarProps<Row> {
  const onSearchChange = vi.fn();
  const setSort = vi.fn();
  const setLimit = vi.fn();

  return {
    table: {
      labels,
      isMobile: false,
      sortByOptions: [{ label: "Mobile Sort", value: "mobile_sort" }],
      source: {
        sortBy: "name",
        sortDir: "asc",
        limit: 10,
        setSort,
        setLimit,
      },
      getSearchInputProps: vi.fn((opts?: { placeholder?: string }) => ({
        type: "search" as const,
        role: "searchbox",
        "aria-label": labels.search,
        value: "test query",
        placeholder: opts?.placeholder ?? "Search...",
        onChange: onSearchChange,
      })),
    } as unknown as ToolbarProps<Row>["table"],
    searchable: true,
    sortByOptions: [
      { label: "Name", value: "name" },
      { label: "Date", value: "date" },
    ],
    hasFilters: true,
    activeFilterCount: 2,
    filtersMode: "popover",
    filtersOpen: false,
    onToggleFilters: vi.fn(),
    onFiltersTriggerPointerDown: vi.fn(),
    onCloseFilters: vi.fn(),
    onClearFilters: vi.fn(),
    showRowsPerPage: true,
    exportLabel: "Export CSV",
    onExportCsv: vi.fn(),
    exportBusy: false,
    ...overrides,
  };
}

describe("Toolbar", () => {
  it("renders search input, sort selector, filters button, and export action", () => {
    const props = makeToolbarProps();
    render(<Toolbar {...props} />);

    expect(screen.getByLabelText(labels.search)).toBeInTheDocument();
    expect(screen.getByLabelText(labels.sortBy)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Filters/i })
    ).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Export CSV" })
    ).toBeInTheDocument();
  });

  it("handles search input change and custom searchPlaceholder", () => {
    const props = makeToolbarProps({ searchPlaceholder: "Custom search..." });
    render(<Toolbar {...props} />);

    expect(props.table.getSearchInputProps).toHaveBeenCalledWith({
      placeholder: "Custom search...",
    });

    fireEvent.change(screen.getByLabelText(labels.search), {
      target: { value: "Alice" },
    });
  });

  it("handles sort changes including clearing sort", () => {
    const props = makeToolbarProps();
    render(<Toolbar {...props} />);

    const select = screen.getByLabelText(labels.sortBy);

    // Sort by date
    fireEvent.change(select, { target: { value: "date" } });
    expect(props.table.source.setSort).toHaveBeenCalledWith("date", "asc");

    // Clear sort (value: "")
    fireEvent.change(select, { target: { value: "" } });
    expect(props.table.source.setSort).toHaveBeenCalledWith(undefined, "asc");
  });

  it("handles rows per page change (covers line 145)", () => {
    const props = makeToolbarProps({ showRowsPerPage: true });
    render(<Toolbar {...props} />);

    const select = screen.getByLabelText(labels.rowsPerPage);
    fireEvent.change(select, { target: { value: "25" } });

    expect(props.table.source.setLimit).toHaveBeenCalledWith(25);
  });

  it("handles filter button interactions and states", () => {
    const props = makeToolbarProps({
      filtersMode: "popover",
      filtersOpen: true,
      activeFilterCount: 0,
    });

    render(<Toolbar {...props} />);

    const filterButton = screen.getByRole("button", { name: labels.filters });
    expect(filterButton).toHaveAttribute("aria-expanded", "true");
    expect(filterButton).toHaveAttribute("data-active", "true");

    fireEvent.pointerDown(filterButton);
    expect(props.onFiltersTriggerPointerDown).toHaveBeenCalled();

    fireEvent.click(filterButton);
    expect(props.onToggleFilters).toHaveBeenCalled();
  });

  it("handles addRow, export busy state, custom className, dir, and slots", () => {
    const onAddRow = vi.fn();
    const props = makeToolbarProps({
      onAddRow,
      addRowLabel: "Add New Item",
      exportBusy: true,
      className: "custom-toolbar-class",
      dir: "rtl",
      toolbar: <div data-testid="custom-slot">Slot</div>,
      savedViewsMenu: <div data-testid="views-menu">Views</div>,
      columnMenu: <div data-testid="col-menu">Cols</div>,
    });

    const { container } = render(<Toolbar {...props} />);

    expect(container.firstChild).toHaveClass("custom-toolbar-class");
    expect(container.firstChild).toHaveAttribute("dir", "rtl");
    expect(screen.getByTestId("custom-slot")).toBeInTheDocument();
    expect(screen.getByTestId("views-menu")).toBeInTheDocument();
    expect(screen.getByTestId("col-menu")).toBeInTheDocument();

    const addBtn = screen.getByRole("button", { name: "Add New Item" });
    fireEvent.click(addBtn);
    expect(onAddRow).toHaveBeenCalled();

    const exportBtn = screen.getByRole("button", { name: "Export CSV" });
    expect(exportBtn).toBeDisabled();
    expect(exportBtn).toHaveAttribute("aria-busy", "true");
  });

  it("falls back to mobile sort options when isMobile is true and sortByOptions is undefined (covers line 52)", () => {
    const props = makeToolbarProps({
      sortByOptions: undefined,
    });
    props.table.isMobile = true;

    render(<Toolbar {...props} />);

    expect(screen.getByText("Mobile Sort")).toBeInTheDocument();
  });

  it("hides search when searchable is false", () => {
    const props = makeToolbarProps({ searchable: false });
    render(<Toolbar {...props} />);

    expect(screen.queryByLabelText(labels.search)).not.toBeInTheDocument();
  });
  it("evaluates mobile sort fallback when sortByOptions is undefined (line 52)", () => {
    const props = makeToolbarProps({ sortByOptions: undefined });

    // 1. isMobile = true
    (props.table as any).isMobile = true;
    const { rerender } = render(<Toolbar {...props} />);
    expect(
      screen.getByRole("combobox", { name: labels.sortBy })
    ).toBeInTheDocument();

    // 2. isMobile = false
    (props.table as any).isMobile = false;
    rerender(<Toolbar {...props} />);
    expect(
      screen.queryByRole("combobox", { name: labels.sortBy })
    ).not.toBeInTheDocument();
  });
});
