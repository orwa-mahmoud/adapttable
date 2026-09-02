import type { ColumnDef, UseColumnLayoutResult } from "@adapttable/core";
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

function fakeLayout(): UseColumnLayoutResult<Row> {
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
  saveColumnName: "Save name",
  cancelColumnRename: "Cancel",
  columnNameRequired: "Column name is required",
  columnRenamed: ({ previous, name }: { previous: string; name: string }) =>
    `${previous} renamed to ${name}`,
  sortAscending: "Sort ascending",
  sortDescending: "Sort descending",
  filterColumn: "Filter column",
  columnActions: "Column actions",
  groupByColumn: (label: string) => `Group by ${label}`,
  ungroupColumn: (label: string) => `Ungroup ${label}`,
  groupingAggregation: "Aggregation",
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

const byLabel = (name: string) =>
  document.querySelector<HTMLElement>(`[aria-label="${name}"]`)!;

describe("antd ColumnMenu", () => {
  it("shows drop-position feedback while dragging a row", async () => {
    const layout = fakeLayout();
    render(
      <ColumnMenu
        allColumns={cols}
        layout={layout}
        labels={labels}
        onAutoSize={() => undefined}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");

    const dt = {
      data: new Map<string, string>(),
      effectAllowed: "",
      dropEffect: "",
      get types() {
        return [...this.data.keys()];
      },
      setData(type: string, value: string) {
        this.data.set(type, value);
      },
      getData(type: string) {
        return this.data.get(type) ?? "";
      },
    };
    const rowOf = (name: string) =>
      screen.getByText(name).closest("[draggable]")!;
    fireEvent.dragStart(rowOf("Alpha"), { dataTransfer: dt });
    fireEvent.dragOver(rowOf("Charlie"), { dataTransfer: dt });
    // The source dims; the hovered target marks its landing edge.
    expect(rowOf("Alpha")).toHaveAttribute("data-dragging");
    expect(rowOf("Charlie")).toHaveAttribute("data-drop", "after");
    fireEvent.drop(rowOf("Charlie"), { dataTransfer: dt });
    expect(layout.move).toHaveBeenCalledWith("a", 2);
    expect(rowOf("Alpha")).not.toHaveAttribute("data-dragging");
    expect(rowOf("Charlie")).not.toHaveAttribute("data-drop");

    // Reverse drag: hovering an EARLIER row marks the "before" edge.
    fireEvent.dragStart(rowOf("Charlie"), { dataTransfer: dt });
    fireEvent.dragOver(rowOf("Alpha"), { dataTransfer: dt });
    expect(rowOf("Alpha")).toHaveAttribute("data-drop", "before");
    fireEvent.dragEnd(rowOf("Charlie"), { dataTransfer: dt });
    expect(rowOf("Alpha")).not.toHaveAttribute("data-drop");
  });

  it("toggles visibility, pins, reorders, and resets", async () => {
    const layout = fakeLayout();
    render(
      <ColumnMenu
        allColumns={cols}
        layout={layout}
        labels={labels}
        onAutoSize={() => undefined}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");

    // visibility via the eye control (aria-label is the column name)
    fireEvent.click(byLabel("Hide column: Bravo"));
    expect(layout.toggleVisible).toHaveBeenCalledWith("b");

    // pin toggle: a is pinned to start → next click unpins; b is unpinned → pins to start
    fireEvent.click(byLabel("Unpin: Alpha"));
    expect(layout.setPinned).toHaveBeenCalledWith("a", undefined);
    fireEvent.click(byLabel("Pin to start: Bravo"));
    expect(layout.setPinned).toHaveBeenCalledWith("b", "start");

    // reorder via grip keyboard
    fireEvent.keyDown(byLabel("Move to start / Move to end: Alpha"), {
      key: "ArrowRight",
    });
    expect(layout.move).toHaveBeenCalledWith("a", 1);

    fireEvent.click(screen.getByText("Reset columns"));
    expect(layout.reset).toHaveBeenCalled();
  });

  it("closes on Escape and reports collapsed state on the trigger", async () => {
    render(
      <ColumnMenu
        allColumns={cols}
        layout={fakeLayout()}
        labels={labels}
        onAutoSize={() => undefined}
      />
    );
    const trigger = screen.getByRole("button", { name: "Columns" });
    fireEvent.click(trigger);
    await screen.findByText("Reset columns");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    // antd's Popover has no built-in Escape handling — the menu adds its own
    // document listener so keyboard users can dismiss it.
    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    // …and hands keyboard focus back to the trigger it dismissed from.
    expect(trigger).toHaveFocus();
  });

  it("keeps the menu open for non-Escape keys", async () => {
    render(
      <ColumnMenu
        allColumns={cols}
        layout={fakeLayout()}
        labels={labels}
        onAutoSize={() => undefined}
      />
    );
    const trigger = screen.getByRole("button", { name: "Columns" });
    fireEvent.click(trigger);
    await screen.findByText("Reset columns");
    // Arrow keys reorder columns inside the menu; they must not dismiss it.
    fireEvent.keyDown(document, { key: "ArrowDown" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("flips the popover to the start side under RTL", async () => {
    render(
      <ColumnMenu
        allColumns={cols}
        layout={fakeLayout()}
        labels={labels}
        dir="rtl"
        onAutoSize={() => undefined}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");
    // Under RTL the popover anchors bottomLeft (the start edge) so it opens
    // toward the content instead of off-screen.
    expect(
      document.querySelector(".ant-popover-placement-bottomLeft")
    ).not.toBeNull();
  });

  it("lists the actions column as a separated row: eye + one-click end pin", async () => {
    const layout = fakeLayout();
    render(
      <ColumnMenu
        allColumns={cols}
        layout={layout}
        labels={labels}
        hasRowActions
        onAutoSize={() => undefined}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");

    // The actions row never reorders: no draggable row, no keyboard grip.
    expect(screen.getByText("Actions").closest("[draggable]")).toBeNull();
    expect(
      document.querySelector(
        '[aria-label="Move to start / Move to end: Actions"]'
      )
    ).toBeNull();

    // The standard eye toggle targets the reserved "actions" layout key.
    const eye = byLabel("Hide column: Actions");
    expect(eye).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(eye);
    expect(layout.toggleVisible).toHaveBeenCalledWith("actions");

    // ONE click pins to the end — no left stop in the cycle.
    fireEvent.click(byLabel("Pin to end: Actions"));
    expect(layout.setPinned).toHaveBeenCalledWith("actions", "end");
  });

  it("unpins a right-pinned actions column with one click", async () => {
    const layout = fakeLayout();
    layout.state = {
      hidden: [],
      order: [],
      pinned: { actions: "end" },
      widths: {},
    };
    render(
      <ColumnMenu
        allColumns={cols}
        layout={layout}
        labels={labels}
        hasRowActions
        onAutoSize={() => undefined}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");
    // Pinned right → the one-click toggle goes straight back to unpinned.
    fireEvent.click(byLabel("Unpin: Actions"));
    expect(layout.setPinned).toHaveBeenCalledWith("actions", undefined);
  });

  it("offers to show a hidden actions column", async () => {
    const layout = fakeLayout();
    layout.isHidden = (key) => key === "actions";
    render(
      <ColumnMenu
        allColumns={cols}
        layout={layout}
        labels={labels}
        hasRowActions
        onAutoSize={() => undefined}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");
    const eye = byLabel("Show column: Actions");
    expect(eye).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(eye);
    expect(layout.toggleVisible).toHaveBeenCalledWith("actions");
  });

  it("lists a leading reorder row with an eye and a start pin", async () => {
    const layout = fakeLayout();
    render(
      <ColumnMenu
        allColumns={cols}
        layout={layout}
        labels={labels}
        hasRowReorder
        onAutoSize={() => undefined}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");
    expect(screen.getByText("Reorder")).toBeInTheDocument();
    fireEvent.click(byLabel("Hide column: Reorder"));
    expect(layout.toggleVisible).toHaveBeenCalledWith("reorder");
    fireEvent.click(byLabel("Pin to start: Reorder"));
    expect(layout.setPinned).toHaveBeenCalledWith("reorder", "start");
  });

  it("omits the actions row when the table has no row actions", async () => {
    render(
      <ColumnMenu
        allColumns={cols}
        layout={fakeLayout()}
        labels={labels}
        onAutoSize={() => undefined}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");
    expect(screen.queryByText("Actions")).toBeNull();
  });

  it("renders the hidden-column state (strike-through, eye-off, text button)", async () => {
    const layout = fakeLayout();
    layout.state = { hidden: ["b"], order: [], pinned: {}, widths: {} };
    layout.isHidden = (key) => key === "b";
    render(
      <ColumnMenu
        allColumns={cols}
        layout={layout}
        labels={labels}
        onAutoSize={() => undefined}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");

    // The hidden column's eye toggle offers to show it.
    const hiddenEye = byLabel("Show column: Bravo");
    expect(hiddenEye).toHaveAttribute("aria-pressed", "false");
    // A visible column's eye toggle offers to hide it.
    expect(byLabel("Hide column: Alpha")).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    fireEvent.click(hiddenEye);
    expect(layout.toggleVisible).toHaveBeenCalledWith("b");
  });

  it("filters the chooser by the search box", async () => {
    render(
      <ColumnMenu
        allColumns={cols}
        layout={fakeLayout()}
        labels={labels}
        onAutoSize={() => undefined}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");
    fireEvent.change(
      document.querySelector('[data-adapttable-part="column-menu-search"]')!,
      { target: { value: "bravo" } }
    );
    expect(screen.getByText("Bravo")).toBeInTheDocument();
    expect(screen.queryByText("Alpha")).toBeNull();
  });

  it("renames a data column with AntD controls and announces it", async () => {
    const onRenameColumn = vi.fn();
    render(
      <ColumnMenu
        allColumns={cols}
        layout={fakeLayout()}
        labels={labels}
        onRenameColumn={onRenameColumn}
        onAutoSize={() => undefined}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");
    fireEvent.click(byLabel("Column actions: Alpha"));

    const renameAction = screen.getByRole("button", {
      name: "Rename column",
    });
    fireEvent.click(renameAction);
    expect(renameAction).toBeDisabled();

    const input = screen.getByRole("textbox", { name: "Column name" });
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: " " } });
    fireEvent.blur(input);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Column name is required"
    );

    fireEvent.change(input, { target: { value: "  Account owner  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save name" }));
    expect(onRenameColumn).toHaveBeenCalledWith("a", "Account owner");
    expect(
      document.querySelector('[data-adapttable-part="column-rename-announcer"]')
    ).toHaveTextContent("Alpha renamed to Account owner");
    expect(
      document.querySelector('[data-adapttable-part="column-rename-form"]')
    ).toBeNull();
    const restoredAction = screen.getByRole("button", {
      name: "Rename column",
    });
    expect(restoredAction).toBeEnabled();

    restoredAction.focus();
    fireEvent.click(restoredAction);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(restoredAction).toHaveFocus());

    fireEvent.click(screen.getByRole("button", { name: "Reset column" }));
    expect(screen.queryByRole("button", { name: "Rename column" })).toBeNull();
  });

  it("does not offer rename without the host callback", async () => {
    render(
      <ColumnMenu
        allColumns={cols}
        layout={fakeLayout()}
        labels={labels}
        onAutoSize={() => undefined}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");
    fireEvent.click(byLabel("Column actions: Alpha"));
    expect(screen.queryByRole("button", { name: "Rename column" })).toBeNull();
  });
});
