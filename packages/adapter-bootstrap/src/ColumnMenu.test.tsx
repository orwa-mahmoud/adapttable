import type { UseColumnLayoutResult } from "@adapttable/core";
import { ACTIONS_COLUMN_KEY, REORDER_COLUMN_KEY } from "@adapttable/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ColumnMenu, type ColumnMenuProps } from "./components/ColumnMenu";

interface Row {
  id: string;
  name: string;
  age: number;
}

const mockLabels: ColumnMenuProps<Row>["labels"] = {
  columns: "Columns",
  searchColumns: "Search columns",
  showAllColumns: "Show all",
  hideAllColumns: "Hide all",
  unpinAllColumns: "Unpin all",
  autoSizeColumns: "Auto-fit columns",
  resetColumns: "Reset columns",
  actions: "Actions",
  reorderRow: "Reorder",
  showColumn: "Show",
  hideColumn: "Hide",
  pinStart: "Pin to start",
  pinEnd: "Pin to end",
  unpin: "Unpin",
  columnActions: "Column actions",
  moveStart: "Move start",
  moveEnd: "Move end",
  sortAscending: "Sort ascending",
  sortDescending: "Sort descending",
  filterColumn: "Filter column",
  autoSizeColumn: "Size column to content",
  resetColumn: "Reset column",
};

function makeLayoutMock(
  overrides?: Partial<UseColumnLayoutResult<Row>>
): UseColumnLayoutResult<Row> {
  return {
    state: {
      order: ["name", "age"],
      hidden: {},
      pinned: {},
    },
    isHidden: vi.fn((key: string) => key === "hiddenCol"),
    isPinned: vi.fn((key: string) => (key === "age" ? "start" : undefined)),
    setHidden: vi.fn(),
    toggleVisible: vi.fn(),
    setPinned: vi.fn(),
    move: vi.fn(),
    reset: vi.fn(),
    columns: [],
    ...overrides,
  } as unknown as UseColumnLayoutResult<Row>;
}

function makeProps(
  overrides?: Partial<ColumnMenuProps<Row>>
): ColumnMenuProps<Row> {
  return {
    allColumns: [
      { key: "name", header: "Name", sortable: true },
      { key: "age", header: "Age", sortable: true },
    ],
    layout: makeLayoutMock(),
    labels: mockLabels,
    hasRowActions: true,
    hasRowReorder: true,
    onAutoSize: vi.fn(),
    onAutoSizeColumn: vi.fn(),
    onSortColumn: vi.fn(),
    onFilterColumn: vi.fn(),
    sortBy: "name",
    sortDir: "asc",
    dir: "ltr",
    ...overrides,
  };
}

describe("ColumnMenu", () => {
  it("renders menu trigger and expands dropdown with bulk actions", () => {
    const props = makeProps();
    render(<ColumnMenu {...props} />);

    const toggleButton = screen.getByRole("button", {
      name: mockLabels.columns,
    });
    expect(toggleButton).toBeInTheDocument();
    fireEvent.click(toggleButton);

    expect(
      screen.getByPlaceholderText(mockLabels.searchColumns)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: mockLabels.showAllColumns })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: mockLabels.hideAllColumns })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: mockLabels.unpinAllColumns })
    ).toBeInTheDocument();

    // Trigger bulk actions
    fireEvent.click(
      screen.getByRole("button", { name: mockLabels.showAllColumns })
    );
    fireEvent.click(
      screen.getByRole("button", { name: mockLabels.hideAllColumns })
    );
    fireEvent.click(
      screen.getByRole("button", { name: mockLabels.unpinAllColumns })
    );
  });

  it("filters columns based on search input query", () => {
    const props = makeProps();
    render(<ColumnMenu {...props} />);

    fireEvent.click(screen.getByRole("button", { name: mockLabels.columns }));

    const searchInput = screen.getByPlaceholderText(mockLabels.searchColumns);
    fireEvent.change(searchInput, { target: { value: "Age" } });

    expect(screen.getByText("Age")).toBeInTheDocument();
    expect(screen.queryByText("Name")).not.toBeInTheDocument();
  });

  it("handles column row item interactions (toggle visibility, pin, and open actions)", () => {
    const layout = makeLayoutMock();
    const onSortColumn = vi.fn();
    const props = makeProps({ layout, onSortColumn });

    render(<ColumnMenu {...props} />);
    fireEvent.click(screen.getByRole("button", { name: mockLabels.columns }));

    // Toggle column visibility
    const hideBtn = screen.getByRole("button", {
      name: `${mockLabels.hideColumn}: Name`,
    });
    fireEvent.click(hideBtn);
    expect(layout.toggleVisible).toHaveBeenCalledWith("name");

    // Pin column
    const pinBtn = screen.getByRole("button", {
      name: `${mockLabels.pinStart}: Name`,
    });
    fireEvent.click(pinBtn);
    expect(layout.setPinned).toHaveBeenCalledWith("name", "start");

    // Open column actions submenu
    const actionsTrigger = screen.getByRole("button", {
      name: `${mockLabels.columnActions}: Name`,
    });
    fireEvent.click(actionsTrigger);

    const sortDesc = screen.getByRole("button", {
      name: mockLabels.sortDescending,
    });
    fireEvent.click(sortDesc);
    expect(onSortColumn).toHaveBeenCalledWith("name", "desc");
  });

  it("pins the reserved actions column to the end when it is not pinned", () => {
    const layout = makeLayoutMock();
    layout.state.pinned = {};
    const props = makeProps({
      layout,
      hasRowReorder: false,
      hasRowActions: true,
    });

    render(<ColumnMenu {...props} />);
    fireEvent.click(screen.getByRole("button", { name: mockLabels.columns }));

    const actionsPin = screen.getByRole("button", {
      name: `${mockLabels.pinEnd}: ${mockLabels.actions}`,
    });
    fireEvent.click(actionsPin);
    expect(layout.setPinned).toHaveBeenCalledWith(ACTIONS_COLUMN_KEY, "end");
  });

  it("handles reserved reorder and actions column toggling and pinning", () => {
    const layout = makeLayoutMock();
    // Simulate reorder unpinned and actions pinned
    layout.state.pinned = { [ACTIONS_COLUMN_KEY]: "end" };
    layout.isHidden = vi.fn((key: string) => key === ACTIONS_COLUMN_KEY);

    const props = makeProps({
      layout,
      hasRowReorder: true,
      hasRowActions: true,
    });

    render(<ColumnMenu {...props} />);
    fireEvent.click(screen.getByRole("button", { name: mockLabels.columns }));

    // Reserved Reorder Column Toggle & Pin (pinSide="start")
    const reorderToggle = screen.getByRole("button", {
      name: `${mockLabels.hideColumn}: ${mockLabels.reorderRow}`,
    });
    fireEvent.click(reorderToggle);
    expect(layout.toggleVisible).toHaveBeenCalledWith(REORDER_COLUMN_KEY);

    const reorderPin = screen.getByRole("button", {
      name: `${mockLabels.pinStart}: ${mockLabels.reorderRow}`,
    });
    fireEvent.click(reorderPin);
    expect(layout.setPinned).toHaveBeenCalledWith(REORDER_COLUMN_KEY, "start");

    // Reserved Actions Column Toggle & Pin (pinSide="end", already pinned -> unpin)
    const actionsToggle = screen.getByRole("button", {
      name: `${mockLabels.showColumn}: ${mockLabels.actions}`,
    });
    fireEvent.click(actionsToggle);
    expect(layout.toggleVisible).toHaveBeenCalledWith(ACTIONS_COLUMN_KEY);

    const actionsPin = screen.getByRole("button", {
      name: `${mockLabels.unpin}: ${mockLabels.actions}`,
    });
    fireEvent.click(actionsPin);
    expect(layout.setPinned).toHaveBeenCalledWith(
      ACTIONS_COLUMN_KEY,
      undefined
    );
  });

  it("triggers onAutoSize and reset layout buttons", () => {
    const onAutoSize = vi.fn();
    const layout = makeLayoutMock();
    const props = makeProps({ onAutoSize, layout });

    render(<ColumnMenu {...props} />);
    fireEvent.click(screen.getByRole("button", { name: mockLabels.columns }));

    const autoSizeBtn = screen.getByRole("button", {
      name: mockLabels.autoSizeColumns,
    });
    fireEvent.click(autoSizeBtn);
    expect(onAutoSize).toHaveBeenCalled();

    const resetBtn = screen.getByRole("button", {
      name: mockLabels.resetColumns,
    });
    fireEvent.click(resetBtn);
    expect(layout.reset).toHaveBeenCalled();
  });

  it("disables move, hide, and pin when the column is locked", () => {
    const props = makeProps({
      allColumns: [
        {
          key: "name",
          header: "Name",
          sortable: true,
          lockPosition: true,
          lockVisibility: true,
          lockPin: true,
        },
      ],
      hasRowActions: false,
      hasRowReorder: false,
    });

    render(<ColumnMenu {...props} />);
    fireEvent.click(screen.getByRole("button", { name: mockLabels.columns }));

    expect(screen.getByText("⋮⋮").closest("button")).toBeDisabled();
    expect(
      screen.getByRole("button", {
        name: `${mockLabels.hideColumn}: Name`,
      })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", {
        name: `${mockLabels.pinStart}: Name`,
      })
    ).toBeDisabled();
  });
});
