import type { ColumnDef, UseColumnLayoutResult } from "@adapttable/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { columnMenu } from "./column-menu";
import { ColumnMenu } from "./components/ColumnMenu";
import { DataTable } from "./data-table.test-utils";
import { DataTable as BareDataTable } from "./DataTable";

interface Row {
  id: string;
}
const cols: ColumnDef<Row>[] = [
  { key: "a", header: "Alpha", accessor: (r) => r.id },
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
  sortAscending: "Sort ascending",
  sortDescending: "Sort descending",
  filterColumn: "Filter column",
  columnActions: "Column actions",
  actions: "Actions",
  reorderRow: "Reorder",
};

const byLabel = (name: string) =>
  document.querySelector<HTMLElement>(`[aria-label="${name}"]`)!;

describe("mui ColumnMenu", () => {
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

    // visibility via the eye control (verb-prefixed accessible name)
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

  it("renders a hidden column with strike-through and disabled colors", async () => {
    const layout = fakeLayout();
    // `r.hidden` is derived from `layout.isHidden(key)`; mark "b" hidden so the
    // hidden-side branches (eye color, text color, line-through) are exercised.
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

    const bravo = screen.getByText("Bravo");
    expect(bravo).toHaveStyle({ textDecoration: "line-through" });
    // The eye toggle for a hidden column offers to show it.
    expect(byLabel("Show column: Bravo")).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    // A visible column offers to hide it.
    expect(byLabel("Hide column: Charlie")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("lists a trailing Actions row with the eye + a one-click end-pin", async () => {
    const layout = fakeLayout();
    render(
      <ColumnMenu
        allColumns={cols}
        onAutoSize={() => undefined}
        layout={layout}
        labels={labels}
        hasRowActions
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");

    // The standard eye toggle, wired to the reserved "actions" layout key.
    fireEvent.click(byLabel("Hide column: Actions"));
    expect(layout.toggleVisible).toHaveBeenCalledWith("actions");
    // ONE click pins to the end — no left step in the actions pin cycle.
    fireEvent.click(byLabel("Pin to end: Actions"));
    expect(layout.setPinned).toHaveBeenCalledWith("actions", "end");
    // No reorder grip: the row is not draggable and has no move control.
    expect(screen.queryByLabelText(/Move to start.*Actions/)).toBeNull();
    expect(screen.getByText("Actions").closest("[draggable]")).toBeNull();
  });

  it("unpins an end-pinned Actions row in one click, struck through when hidden", async () => {
    const layout = fakeLayout();
    layout.state = { ...layout.state, pinned: { actions: "end" } };
    layout.isHidden = (key) => key === "actions";
    render(
      <ColumnMenu
        allColumns={cols}
        onAutoSize={() => undefined}
        layout={layout}
        labels={labels}
        hasRowActions
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");

    // Hidden state renders exactly like a hidden data column.
    expect(screen.getByText("Actions")).toHaveStyle({
      textDecoration: "line-through",
    });
    expect(byLabel("Show column: Actions")).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    // Pinned right → the single pin action is "Unpin".
    fireEvent.click(byLabel("Unpin: Actions"));
    expect(layout.setPinned).toHaveBeenCalledWith("actions", undefined);
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

  it("omits the Actions row when the table has no row actions", async () => {
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

  // Regression: the menu portals to <body>, so it does not inherit the
  // table's direction. Under an Arabic locale the grip and pin controls
  // stayed on the LTR sides while the table itself mirrored. Only Chakra
  // passed `dir` through; the rest silently dropped it.
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
    fireEvent.change(screen.getByLabelText("Search columns"), {
      target: { value: "bravo" },
    });
    expect(screen.getByText("Bravo")).toBeInTheDocument();
    expect(screen.queryByText("Alpha")).toBeNull();
  });

  it("forwards dir to the portalled menu", async () => {
    render(
      <ColumnMenu
        allColumns={cols}
        onAutoSize={() => undefined}
        layout={fakeLayout()}
        labels={labels}
        dir="rtl"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    const reset = await screen.findByText("Reset columns");
    expect(reset.closest('[dir="rtl"]')).not.toBeNull();
  });
});

describe("column menu feature (mui)", () => {
  it("draws no Columns button when the feature was never imported", () => {
    // The shipped component, not the harness: the harness turns v2 props into
    // features, which is exactly what this test must not have happen. v3
    // removed those props, so there is no second way in to pass either.
    render(
      <BareDataTable
        data={[{ id: "1" }]}
        columns={cols}
        rowKey={(r) => r.id}
        urlSync={false}
      />
    );
    expect(
      screen.queryByRole("button", { name: "Columns" })
    ).not.toBeInTheDocument();
  });

  it("draws the Columns button when the feature is composed", () => {
    render(
      <DataTable
        data={[{ id: "1" }]}
        columns={cols}
        rowKey={(r) => r.id}
        urlSync={false}
        enableColumnMenu
        features={[columnMenu()]}
      />
    );
    expect(screen.getByRole("button", { name: "Columns" })).toBeInTheDocument();
  });
});
