import type { UseColumnLayoutResult } from "@adapttable/core";
import type { ColumnDef } from "@adapttable/react";
import {
  COLUMN_DND_MIME,
  FeatureHostProvider,
  type FeatureHostState,
  type GroupingPanelState,
} from "@adapttable/react/adapter";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ColumnMenu } from "./components/ColumnMenu";

interface Row {
  id: string;
}
const cols: ColumnDef<Row>[] = [
  { key: "a", header: "Alpha", accessor: (r) => r.id, renameable: true },
  { key: "b", header: "Bravo", accessor: (r) => r.id },
  { key: "c", header: "Charlie", accessor: (r) => r.id },
];

function fakeLayout(
  overrides: Partial<UseColumnLayoutResult<Row>> = {}
): UseColumnLayoutResult<Row> {
  return {
    state: { hidden: [], order: [], pinned: { a: "start" }, widths: {} },
    visibleColumns: cols,
    isHidden: () => false,
    setHidden: vi.fn(),
    toggleVisible: vi.fn(),
    setPinned: vi.fn(),
    move: vi.fn(),
    setWidth: vi.fn(),
    setName: vi.fn(),
    resetName: vi.fn(),
    pinOffset: () => undefined,
    reset: vi.fn(),
    toggleColumnGroup: vi.fn(),
    ...overrides,
  };
}

const labels = {
  columns: "Columns",
  pinStart: "Pin to start",
  pinEnd: "Pin to end",
  unpin: "Unpin",
  moveStart: "Move to start",
  moveEnd: "Move to end",
  resetColumns: "Reset columns",
  autoSizeColumns: "Size columns to content",
  autoSizeColumn: "Size column to content",
  showColumn: "Show column",
  hideColumn: "Hide column",
  searchColumns: "Search columns",
  showAllColumns: "Show all",
  hideAllColumns: "Hide all",
  unpinAllColumns: "Unpin all",
  resetColumn: "Reset column",
  renameColumn: "Rename column",
  columnName: "Column name",
  saveColumnName: "Save",
  cancelColumnRename: "Cancel",
  columnNameRequired: "Enter a column name.",
  columnRenamed: ({ previous, name }: { previous: string; name: string }) =>
    `${previous} renamed to ${name}.`,
  sortAscending: "Sort ascending",
  sortDescending: "Sort descending",
  filterColumn: "Filter column",
  columnActions: "Column actions",
  groupByColumn: (label: string) => `Group by ${label}`,
  ungroupColumn: (label: string) => `Ungroup ${label}`,
  groupingAggregation: "Group aggregation",
  groupingAggregationDefault: "Default",
  groupingAggregationNone: "None",
  groupingAverage: "Average",
  selectionCount: "Count",
  selectionSum: "Sum",
  selectionMin: "Minimum",
  selectionMax: "Maximum",
  actions: "Actions",
  reorderRow: "Reorder",
};

function open(
  layout: UseColumnLayoutResult<Row>,
  hasRowActions = false,
  hasRowReorder = false,
  onRenameColumn?: (key: string, name: string) => void
) {
  const view = render(
    <ColumnMenu
      allColumns={cols}
      onAutoSize={() => undefined}
      layout={layout}
      labels={labels}
      classNames={{}}
      hasRowActions={hasRowActions}
      hasRowReorder={hasRowReorder}
      onRenameColumn={onRenameColumn}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: "Columns" }));
  return view;
}

/** A minimal DataTransfer for jsdom drag/drop. */
function fakeDataTransfer(initial: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initial };
  return {
    effectAllowed: "",
    dropEffect: "",
    get types() {
      return Object.keys(store);
    },
    setData: (type: string, value: string) => {
      store[type] = value;
    },
    getData: (type: string) => store[type] ?? "",
  };
}

describe("unstyled ColumnMenu", () => {
  it("renders a plugin choice as a labelled select and keeps it open", () => {
    const onChange = vi.fn();
    const groupingPanel: GroupingPanelState = {
      groupBy: ["a"],
      aggregateOverrides: {},
      canSetAggregates: true,
      announcement: "",
      headerDragProps: () => ({}),
      chipDragProps: () => ({}),
      chipKeyboardProps: () => ({
        tabIndex: 0,
        role: "button",
        "aria-label": "Move grouping",
        onKeyDown: () => undefined,
      }),
      dropProps: () => ({}),
      removeDropProps: () => ({}),
      add: () => undefined,
      remove: () => undefined,
      moveBy: () => undefined,
      setAggregate: () => undefined,
    };
    const host: FeatureHostState = {
      filterTypes: [],
      filterExtends: [],
      editors: new Map(),
      aggregators: new Map(),
      writers: [],
      columnMenuActions: [
        (_row, context) => {
          expect(context.groupingPanel).toBe(groupingPanel);
          return {
            kind: "choice",
            id: "plugin-choice",
            label: "Group aggregation",
            disabled: false,
            value: "",
            options: [
              { value: "", label: "Default" },
              { value: "count", label: "Count" },
            ],
            onChange,
          };
        },
      ],
      panels: [],
      commands: [],
      contextMenuItems: [],
    };
    render(
      <FeatureHostProvider host={host}>
        <ColumnMenu
          allColumns={cols}
          onAutoSize={() => undefined}
          layout={fakeLayout()}
          labels={labels}
          classNames={{
            columnMenuChoice: "choice",
            columnMenuChoiceLabel: "choice-label",
            columnMenuChoiceSelect: "choice-select",
          }}
          groupingPanel={groupingPanel}
        />
      </FeatureHostProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Column actions: Alpha" })
    );
    const choice = screen.getByRole("combobox", {
      name: "Group aggregation",
    });

    fireEvent.change(choice, { target: { value: "count" } });

    expect(onChange).toHaveBeenCalledWith("count");
    expect(choice).toHaveClass("choice-select");
    expect(choice.closest("label")).toHaveClass("choice");
    expect(choice.closest("label")?.querySelector("span")).toHaveClass(
      "choice-label"
    );
    expect(choice).toBeInTheDocument();
  });

  it("toggles visibility via the eye control", () => {
    const layout = fakeLayout();
    open(layout);
    fireEvent.click(screen.getByRole("button", { name: "Hide column: Bravo" }));
    expect(layout.toggleVisible).toHaveBeenCalledWith("b");
  });

  it("pins and unpins via the pin control", () => {
    const layout = fakeLayout();
    open(layout);
    // pin toggle: a is pinned to start → next click unpins; b is unpinned → pins to start
    fireEvent.click(screen.getByRole("button", { name: "Unpin: Alpha" }));
    expect(layout.setPinned).toHaveBeenCalledWith("a", undefined);
    fireEvent.click(
      screen.getByRole("button", { name: "Pin to start: Bravo" })
    );
    expect(layout.setPinned).toHaveBeenCalledWith("b", "start");
  });

  it("reorders with the grip keyboard (arrow keys)", () => {
    const layout = fakeLayout();
    open(layout);
    const gripA = screen.getByRole("button", {
      name: "Move to start / Move to end: Alpha",
    });
    fireEvent.keyDown(gripA, { key: "ArrowRight" });
    expect(layout.move).toHaveBeenCalledWith("a", 1);
    const gripB = screen.getByRole("button", {
      name: "Move to start / Move to end: Bravo",
    });
    fireEvent.keyDown(gripB, { key: "ArrowLeft" });
    expect(layout.move).toHaveBeenCalledWith("b", 0);
  });

  it("reorders by dragging a row onto another row", () => {
    const layout = fakeLayout();
    open(layout);
    const dt = fakeDataTransfer();
    // The whole row is the drag handle now (so the browser's drag image is the
    // full row); the grip is only the keyboard affordance.
    const rowA = screen
      .getByText("Alpha")
      .closest("[data-adapttable-part='column-menu-item']")!;
    fireEvent.dragStart(rowA, { dataTransfer: dt });
    expect(dt.getData(COLUMN_DND_MIME)).toBe("a");
    // drop onto Charlie's row (index 2)
    const rowC = screen
      .getByText("Charlie")
      .closest("[data-adapttable-part='column-menu-item']")!;
    fireEvent.dragOver(rowC, { dataTransfer: dt });
    // Drop-position feedback while hovering: the source dims, the hovered
    // target shows its landing edge (a → index 2 = lands AFTER Charlie).
    expect(rowA).toHaveAttribute("data-dragging");
    expect(rowC).toHaveAttribute("data-drop", "after");
    fireEvent.drop(rowC, { dataTransfer: dt });
    expect(layout.move).toHaveBeenCalledWith("a", 2);
    // Indicators clear after the drop.
    expect(rowA).not.toHaveAttribute("data-dragging");
    expect(rowC).not.toHaveAttribute("data-drop");
  });

  it("hovering an earlier row marks the 'before' edge", () => {
    const layout = fakeLayout();
    open(layout);
    const dt = fakeDataTransfer();
    const rowC = screen
      .getByText("Charlie")
      .closest("[data-adapttable-part='column-menu-item']")!;
    fireEvent.dragStart(rowC, { dataTransfer: dt });
    const rowA = screen
      .getByText("Alpha")
      .closest("[data-adapttable-part='column-menu-item']")!;
    fireEvent.dragOver(rowA, { dataTransfer: dt });
    expect(rowA).toHaveAttribute("data-drop", "before");
    // Cancelling the drag (drop outside / Escape) clears the indicators.
    fireEvent.dragEnd(rowC, { dataTransfer: dt });
    expect(rowA).not.toHaveAttribute("data-drop");
    expect(rowC).not.toHaveAttribute("data-dragging");
  });

  it("keeps hidden columns in place — still draggable, eye toggles them back", () => {
    const layout = fakeLayout({
      state: { hidden: ["c"], order: [], pinned: {}, widths: {} },
      visibleColumns: cols.slice(0, 2),
      isHidden: (k) => k === "c",
    });
    open(layout);
    // Charlie is hidden but stays in position 2 with a working grip…
    const gripC = screen.getByRole("button", {
      name: "Move to start / Move to end: Charlie",
    });
    fireEvent.keyDown(gripC, { key: "ArrowLeft" });
    expect(layout.move).toHaveBeenCalledWith("c", 1);
    // …and its eye toggles it back on.
    fireEvent.click(
      screen.getByRole("button", { name: "Show column: Charlie" })
    );
    expect(layout.toggleVisible).toHaveBeenCalledWith("c");
  });

  it("lists a leading reorder row with an eye and a start pin", () => {
    const layout = fakeLayout();
    open(layout, false, true);
    expect(screen.getByText("Reorder")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Hide column: Reorder" })
    );
    expect(layout.toggleVisible).toHaveBeenCalledWith("reorder");
    fireEvent.click(
      screen.getByRole("button", { name: "Pin to start: Reorder" })
    );
    expect(layout.setPinned).toHaveBeenCalledWith("reorder", "start");
  });

  it("omits the actions row when the table has no row actions", () => {
    open(fakeLayout());
    expect(screen.queryByText("Actions")).toBeNull();
    expect(
      document.querySelector('[data-adapttable-part="column-menu-separator"]')
    ).toBeNull();
  });

  it("lists a separated actions row with an eye and a ONE-CLICK end pin", () => {
    const layout = fakeLayout();
    open(layout, true);
    // Separated trailing row, labelled with labels.actions, no reorder grip.
    expect(screen.getByText("Actions")).toBeInTheDocument();
    expect(
      document.querySelector('[data-adapttable-part="column-menu-separator"]')
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Move to start / Move to end: Actions",
      })
    ).toBeNull();
    // The eye hides it like any data column.
    fireEvent.click(
      screen.getByRole("button", { name: "Hide column: Actions" })
    );
    expect(layout.toggleVisible).toHaveBeenCalledWith("actions");
    // ONE click pins straight to the inline end (no left step in the cycle).
    fireEvent.click(
      screen.getByRole("button", { name: "Pin to end: Actions" })
    );
    expect(layout.setPinned).toHaveBeenCalledWith("actions", "end");
  });

  it("unpins a pinned actions row with one click", () => {
    const layout = fakeLayout({
      state: {
        hidden: [],
        order: [],
        pinned: { actions: "end" },
        widths: {},
      },
    });
    open(layout, true);
    const row = screen
      .getByText("Actions")
      .closest('[data-adapttable-part="column-menu-item"]');
    expect(row).toHaveAttribute("data-pinned", "end");
    fireEvent.click(screen.getByRole("button", { name: "Unpin: Actions" }));
    expect(layout.setPinned).toHaveBeenCalledWith("actions", undefined);
  });

  it("shows a hidden actions row back via its eye", () => {
    const layout = fakeLayout({ isHidden: (k) => k === "actions" });
    open(layout, true);
    const row = screen
      .getByText("Actions")
      .closest('[data-adapttable-part="column-menu-item"]');
    expect(row).toHaveAttribute("data-hidden");
    fireEvent.click(
      screen.getByRole("button", { name: "Show column: Actions" })
    );
    expect(layout.toggleVisible).toHaveBeenCalledWith("actions");
  });

  it("filters the chooser by the search box", () => {
    open(fakeLayout());
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search columns" }),
      {
        target: { value: "bravo" },
      }
    );
    expect(screen.getByText("Bravo")).toBeInTheDocument();
    expect(screen.queryByText("Alpha")).toBeNull();
    expect(screen.queryByText("Charlie")).toBeNull();
  });

  it("bulk-unpins from the menu", () => {
    const layout = fakeLayout();
    open(layout);
    fireEvent.click(screen.getByRole("button", { name: "Unpin all" }));
    expect(layout.setPinned).toHaveBeenCalledWith("a", undefined);
  });

  it("opens a per-column submenu", () => {
    const onSortColumn = vi.fn();
    render(
      <ColumnMenu
        allColumns={[{ ...cols[0]!, sortable: true }, cols[1]!, cols[2]!]}
        onAutoSize={() => undefined}
        onSortColumn={onSortColumn}
        layout={fakeLayout()}
        labels={labels}
        classNames={{}}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Column actions: Alpha" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Sort ascending" }));
    expect(onSortColumn).toHaveBeenCalledWith("a", "asc");
  });

  it("offers rename only when the host supplies a callback", () => {
    const withoutRename = open(fakeLayout());
    fireEvent.click(
      screen.getByRole("button", { name: "Column actions: Alpha" })
    );
    expect(screen.queryByRole("button", { name: "Rename column" })).toBeNull();
    withoutRename.unmount();

    open(fakeLayout(), false, false, vi.fn());
    fireEvent.click(
      screen.getByRole("button", { name: "Column actions: Alpha" })
    );
    expect(
      screen.getByRole("button", { name: "Rename column" })
    ).toBeInTheDocument();
  });

  it("submits a trimmed rename and announces it", () => {
    const onRenameColumn = vi.fn();
    open(fakeLayout(), false, false, onRenameColumn);
    fireEvent.click(
      screen.getByRole("button", { name: "Column actions: Alpha" })
    );
    const renameAction = screen.getByRole("button", {
      name: "Rename column",
    });
    fireEvent.click(renameAction);

    expect(renameAction).toBeDisabled();
    const input = screen.getByRole("textbox", { name: "Column name" });
    fireEvent.change(input, { target: { value: "  Account name  " } });
    fireEvent.submit(input.closest("form")!);

    expect(onRenameColumn).toHaveBeenCalledWith("a", "Account name");
    expect(
      document.querySelector('[data-adapttable-part="column-rename-form"]')
    ).toBeNull();
    expect(renameAction).not.toBeDisabled();
    expect(
      document.querySelector('[data-adapttable-part="column-rename-announcer"]')
    ).toHaveTextContent("Alpha renamed to Account name.");
  });

  it("cancels by Escape or button without committing", async () => {
    const onRenameColumn = vi.fn();
    open(fakeLayout(), false, false, onRenameColumn);
    fireEvent.click(
      screen.getByRole("button", { name: "Column actions: Alpha" })
    );
    const renameAction = screen.getByRole("button", {
      name: "Rename column",
    });
    renameAction.focus();
    fireEvent.click(renameAction);
    fireEvent.change(screen.getByRole("textbox", { name: "Column name" }), {
      target: { value: "Discarded" },
    });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Column name" }), {
      key: "Escape",
    });
    expect(onRenameColumn).not.toHaveBeenCalled();
    expect(renameAction).not.toBeDisabled();
    await waitFor(() => expect(renameAction).toHaveFocus());

    fireEvent.click(renameAction);
    fireEvent.change(screen.getByRole("textbox", { name: "Column name" }), {
      target: { value: "Also discarded" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onRenameColumn).not.toHaveBeenCalled();
    expect(renameAction).not.toBeDisabled();
  });

  it("keeps a blank rename open with accessible validation", () => {
    const onRenameColumn = vi.fn();
    open(fakeLayout(), false, false, onRenameColumn);
    fireEvent.click(
      screen.getByRole("button", { name: "Column actions: Alpha" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Rename column" }));
    const input = screen.getByRole("textbox", { name: "Column name" });
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.blur(input);

    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent("Enter a column name.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", error.id);
    fireEvent.submit(input.closest("form")!);
    expect(onRenameColumn).not.toHaveBeenCalled();
    expect(input).toBeInTheDocument();
  });

  it("resets the layout", () => {
    const layout = fakeLayout();
    open(layout);
    fireEvent.click(screen.getByRole("button", { name: "Reset columns" }));
    expect(layout.reset).toHaveBeenCalled();
  });

  it("stays open when a mousedown lands inside the menu", () => {
    open(fakeLayout());
    const panel = screen.getByRole("group", { name: "Columns" });
    // A mousedown contained by the menu root must NOT close the popover.
    fireEvent.mouseDown(panel);
    expect(screen.getByRole("group", { name: "Columns" })).toBeInTheDocument();
  });

  it("closes on the trigger, Escape, and outside click", () => {
    open(fakeLayout());
    expect(screen.getByRole("group", { name: "Columns" })).toBeInTheDocument();
    // toggle trigger closes
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    expect(screen.queryByRole("group", { name: "Columns" })).toBeNull();
    // Escape closes
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("group", { name: "Columns" })).toBeNull();
    // outside mousedown closes
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("group", { name: "Columns" })).toBeNull();
  });

  it("carries dir onto the portalled panel so RTL layout mirrors", () => {
    render(
      <ColumnMenu
        allColumns={cols}
        onAutoSize={() => undefined}
        layout={fakeLayout()}
        labels={labels}
        classNames={{}}
        dir="rtl"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    expect(
      document.querySelector('[data-adapttable-part="column-menu-panel"]')
    ).toHaveAttribute("dir", "rtl");
  });
});
