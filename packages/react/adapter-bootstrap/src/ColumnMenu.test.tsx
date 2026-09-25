import {
  ACTIONS_COLUMN_KEY,
  REORDER_COLUMN_KEY,
  type UseColumnLayoutResult,
} from "@adapttable/core";
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
  renameColumn: "Rename column",
  columnName: "Column name",
  saveColumnName: "Save name",
  cancelColumnRename: "Cancel",
  columnNameRequired: "Column name is required",
  columnRenamed: ({ previous, name }) => `${previous} renamed to ${name}`,
  groupByColumn: (label) => `Group by ${label}`,
  ungroupColumn: (label) => `Ungroup ${label}`,
  groupingAggregation: "Group aggregation",
  groupingRemoveAggregation: (name: string) => `Remove ${name} aggregation`,
  groupingAverage: "Average",
  groupingAggregationCustom: "Custom",
  selectionCount: "Count",
  selectionSum: "Sum",
  selectionMin: "Minimum",
  selectionMax: "Maximum",
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

describe("a hidden column", () => {
  // `isHidden` only ever matched "hiddenCol", which is not in `allColumns`, so
  // no test rendered a row in its hidden state and every `hidden ? … : …`
  // branch in the row markup went unexercised.
  it("renders the hidden marker, the struck-through name and the show label", () => {
    const props = makeProps({
      layout: makeLayoutMock({
        isHidden: vi.fn((key: string) => key === "age"),
      }),
    });
    render(<ColumnMenu {...props} />);
    fireEvent.click(screen.getByRole("button", { name: mockLabels.columns }));

    const rows = document.querySelectorAll(
      '[data-adapttable-part="column-menu-item"]'
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(document.body.textContent).toContain("○");
    expect(
      document.querySelector(".text-decoration-line-through")
    ).not.toBeNull();
  });

  it("offers to show a hidden column and to hide a visible one", () => {
    const toggleVisible = vi.fn();
    const props = makeProps({
      layout: makeLayoutMock({
        isHidden: vi.fn((key: string) => key === "age"),
        toggleVisible,
      }),
    });
    render(<ColumnMenu {...props} />);
    fireEvent.click(screen.getByRole("button", { name: mockLabels.columns }));

    fireEvent.click(
      screen.getByRole("button", { name: `${mockLabels.showColumn}: Age` })
    );
    fireEvent.click(
      screen.getByRole("button", { name: `${mockLabels.hideColumn}: Name` })
    );
    expect(toggleVisible).toHaveBeenCalledTimes(2);
  });
});

it("falls back to no actions column and no reorder column when unstated", () => {
  // Every other test passes both flags as true, so their defaults never ran.
  const { allColumns, layout, labels, onAutoSize, sortBy, sortDir, dir } =
    makeProps();
  render(
    <ColumnMenu
      allColumns={allColumns}
      layout={layout}
      labels={labels}
      onAutoSize={onAutoSize}
      sortBy={sortBy}
      sortDir={sortDir}
      dir={dir}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: mockLabels.columns }));

  expect(document.body.textContent).not.toContain(mockLabels.actions);
});
