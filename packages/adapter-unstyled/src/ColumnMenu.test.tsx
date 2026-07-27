import type { ColumnDef, UseColumnLayoutResult } from "@adapttable/core";
import { COLUMN_DND_MIME } from "@adapttable/core/adapter";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ColumnMenu } from "./components/ColumnMenu";

interface Row {
  id: string;
}
const cols: ColumnDef<Row>[] = [
  { key: "a", header: "Alpha", accessor: (r) => r.id },
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
    pinOffset: () => undefined,
    reset: vi.fn(),
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
  showColumn: "Show column",
  hideColumn: "Hide column",
  actions: "Actions",
};

function open(layout: UseColumnLayoutResult<Row>, hasRowActions = false) {
  const view = render(
    <ColumnMenu
      allColumns={cols}
      layout={layout}
      labels={labels}
      classNames={{}}
      hasRowActions={hasRowActions}
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
});
