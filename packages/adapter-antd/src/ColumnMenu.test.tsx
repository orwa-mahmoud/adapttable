import type { ColumnDef, UseColumnLayoutResult } from "@adapttable/core";
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

const byLabel = (name: string) =>
  document.querySelector<HTMLElement>(`[aria-label="${name}"]`)!;

describe("antd ColumnMenu", () => {
  it("shows drop-position feedback while dragging a row", async () => {
    const layout = fakeLayout();
    render(<ColumnMenu allColumns={cols} layout={layout} labels={labels} />);
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
    render(<ColumnMenu allColumns={cols} layout={layout} labels={labels} />);
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
      <ColumnMenu allColumns={cols} layout={fakeLayout()} labels={labels} />
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
      <ColumnMenu allColumns={cols} layout={fakeLayout()} labels={labels} />
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
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");
    const eye = byLabel("Show column: Actions");
    expect(eye).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(eye);
    expect(layout.toggleVisible).toHaveBeenCalledWith("actions");
  });

  it("omits the actions row when the table has no row actions", async () => {
    render(
      <ColumnMenu allColumns={cols} layout={fakeLayout()} labels={labels} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");
    expect(screen.queryByText("Actions")).toBeNull();
  });

  it("renders the hidden-column state (strike-through, eye-off, text button)", async () => {
    const layout = fakeLayout();
    layout.state = { hidden: ["b"], order: [], pinned: {}, widths: {} };
    layout.isHidden = (key) => key === "b";
    render(<ColumnMenu allColumns={cols} layout={layout} labels={labels} />);
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
});
