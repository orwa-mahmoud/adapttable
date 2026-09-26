/**
 * The grid-focus controller, driven the way a binding drives it: configure,
 * forward key presses and pointer events, read the snapshot.
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";

import type { ColumnModel } from "../types";
import type { CellEdit } from "./cellEdits";
import {
  createGridFocusController,
  GRID_CELL_ATTR,
  gridCellAttr,
  gridCellAttributes,
  gridColumnHeaderAttributes,
  gridContainerAttributes,
  gridFillHandleCell,
  type GridFocusControllerOptions,
  type GridKeyEvent,
  gridRowAttributes,
  isGridColumnSelected,
} from "./gridFocusController";

interface Row {
  id: string;
  name: string;
  score: number;
}

const ROWS: Row[] = [
  { id: "r1", name: "Ada", score: 1 },
  { id: "r2", name: "Linus", score: 2 },
  { id: "r3", name: "Grace", score: 3 },
];

const COLUMNS: ColumnModel<Row>[] = [
  { key: "name", header: "Name", editable: true, accessor: (row) => row.name },
  {
    key: "score",
    header: "Score",
    editable: true,
    accessor: (row) => row.score,
    parseValue: (draft) => Number(draft),
  },
];

const base = (
  overrides: Partial<GridFocusControllerOptions<Row>> = {}
): GridFocusControllerOptions<Row> => ({
  enabled: true,
  rowCount: ROWS.length,
  rows: ROWS,
  columns: COLUMNS,
  getRowId: (row) => row.id,
  ...overrides,
});

const key = (
  name: string,
  extra: Partial<Omit<GridKeyEvent, "key" | "preventDefault">> = {}
): GridKeyEvent & { preventDefault: Mock<() => void> } => ({
  key: name,
  preventDefault: vi.fn<() => void>(),
  ...extra,
});

/** Let the clipboard promise settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const clipboard = { writeText: vi.fn(), readText: vi.fn() };

beforeEach(() => {
  clipboard.writeText.mockReset().mockResolvedValue(undefined);
  clipboard.readText.mockReset().mockResolvedValue("");
  Object.assign(navigator, { clipboard });
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("gridCellAttr", () => {
  it("addresses a cell as row:col", () => {
    expect(GRID_CELL_ATTR).toBe("data-grid-cell");
    expect(gridCellAttr({ row: 4, col: 2 })).toBe("4:2");
  });
});

describe("key dispatch", () => {
  it("enters the grid at its first cell and announces the landing", () => {
    const grid = createGridFocusController(base());
    const event = key("ArrowDown");
    grid.keyDown(event);
    const snapshot = grid.getSnapshot();
    expect(snapshot.active).toEqual({ row: 1, col: 0 });
    expect(snapshot.range).toEqual({
      anchor: { row: 1, col: 0 },
      head: { row: 1, col: 0 },
    });
    expect(snapshot.announcement).toBe("Name, Linus, row 2 of 3");
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("swallows an edge move without changing anything", () => {
    const grid = createGridFocusController(base());
    grid.focusCell({ row: 0, col: 0 });
    const before = grid.getSnapshot();
    const event = key("ArrowUp");
    grid.keyDown(event);
    expect(event.preventDefault).toHaveBeenCalled();
    grid.keyDown(key("ArrowLeft"));
    expect(grid.getSnapshot()).toBe(before);
  });

  it("names a cell with no value by column and position only", () => {
    const grid = createGridFocusController(
      base({ rows: [{ id: "r1", name: "", score: 1 }], rowCount: 1 })
    );
    grid.focusCell({ row: 0, col: 0 });
    expect(grid.getSnapshot().announcement).toBe("Name, row 1 of 1");
  });

  it("names a column without a string header by its key", () => {
    const grid = createGridFocusController(
      base({ columns: [{ key: "name", header: 7 }] })
    );
    grid.focusCell({ row: 0, col: 0 });
    expect(grid.getSnapshot().announcement).toBe("name, Ada, row 1 of 3");
  });

  it("announces nothing for a column that does not exist", () => {
    const grid = createGridFocusController(base());
    grid.focusCell({ row: 0, col: 9 });
    expect(grid.getSnapshot().announcement).toBe("");
  });

  it("announces the position of a row outside the loaded window", () => {
    const grid = createGridFocusController(base({ rowCount: 100 }));
    grid.focusCell({ row: 50, col: 0 });
    expect(grid.getSnapshot().announcement).toBe("Name, row 51 of 100");
  });

  it("extends the selection with Shift and announces the rectangle", () => {
    const grid = createGridFocusController(base());
    grid.focusCell({ row: 0, col: 0 });
    grid.keyDown(key("ArrowDown", { shiftKey: true }));
    grid.keyDown(key("ArrowRight", { shiftKey: true }));
    const { range, announcement } = grid.getSnapshot();
    expect(range).toEqual({
      anchor: { row: 0, col: 0 },
      head: { row: 1, col: 1 },
    });
    expect(announcement).toBe("selected rows 1 to 2, columns 1 to 2, 4 cells");
  });

  it("jumps to the grid's end within the loaded rows", () => {
    const grid = createGridFocusController(base({ rowCount: 1000 }));
    grid.keyDown(key("End", { ctrlKey: true }));
    expect(grid.getSnapshot().active).toEqual({ row: 2, col: 1 });
  });

  it("pages by the configured page size", () => {
    const grid = createGridFocusController(base({ pageSize: 2 }));
    grid.keyDown(key("PageDown"));
    expect(grid.getSnapshot().active).toEqual({ row: 2, col: 0 });
  });

  it("flips the horizontal arrows right to left", () => {
    const grid = createGridFocusController(base({ dir: "rtl" }));
    grid.keyDown(key("ArrowLeft"));
    expect(grid.getSnapshot().active).toEqual({ row: 0, col: 1 });
  });

  it("holds the floor of a window that does not start at row zero", () => {
    const grid = createGridFocusController(base({ firstRowIndex: 10 }));
    grid.keyDown(key("ArrowDown"));
    expect(grid.getSnapshot().active).toEqual({ row: 11, col: 0 });
    grid.keyDown(key("Home", { ctrlKey: true }));
    expect(grid.getSnapshot().active).toEqual({ row: 10, col: 0 });
  });

  it("skips a cell covered by a span", () => {
    const grid = createGridFocusController(
      base({ isCoveredCell: (cell) => cell.row === 1 && cell.col === 0 })
    );
    grid.keyDown(key("ArrowDown"));
    expect(grid.getSnapshot().active).toEqual({ row: 2, col: 0 });
  });

  it("ignores a key that is not a move", () => {
    const grid = createGridFocusController(base());
    const event = key("a");
    grid.keyDown(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(grid.getSnapshot().active).toBeNull();
  });

  it("does nothing while disabled", () => {
    const grid = createGridFocusController(base({ enabled: false }));
    grid.keyDown(key("ArrowDown"));
    expect(grid.getSnapshot().active).toBeNull();
  });

  it("notifies once per key press", () => {
    const grid = createGridFocusController(base());
    const listener = vi.fn();
    const unsubscribe = grid.subscribe(listener);
    grid.keyDown(key("ArrowDown", { shiftKey: true }));
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    grid.keyDown(key("ArrowDown"));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("uses the configured labels", () => {
    const grid = createGridFocusController(
      base({
        labels: {
          gridCellPosition: (row, total) => `${row}/${total}`,
          gridRangeSelection: ({ cells }) => `${cells} picked`,
        },
      })
    );
    grid.focusCell({ row: 0, col: 0 });
    expect(grid.getSnapshot().announcement).toBe("Name, Ada, 1/3");
    grid.keyDown(key("ArrowDown", { shiftKey: true }));
    expect(grid.getSnapshot().announcement).toBe("2 picked");
  });

  it("reads a reconfigured window", () => {
    const grid = createGridFocusController(base());
    grid.focusCell({ row: 0, col: 0 });
    grid.configure(base({ rows: ROWS.slice(0, 1), rowCount: 1 }));
    const before = grid.getSnapshot();
    grid.keyDown(key("ArrowDown"));
    expect(grid.getSnapshot()).toBe(before);
  });
});

describe("activation", () => {
  it("opens the focused cell on Enter or F2 from the cell itself", () => {
    const onActivate = vi.fn();
    const grid = createGridFocusController(base({ onActivate }));
    const cell = document.createElement("td");
    cell.setAttribute(GRID_CELL_ATTR, "0:0");
    const enter = key("Enter", { target: cell });
    grid.keyDown(enter);
    grid.keyDown(key("F2", { target: cell }));
    expect(onActivate).toHaveBeenCalledTimes(2);
    expect(onActivate).toHaveBeenCalledWith({ row: 0, col: 0 });
    expect(enter.preventDefault).toHaveBeenCalled();
  });

  it("leaves Enter to a control inside the cell", () => {
    const onActivate = vi.fn();
    const grid = createGridFocusController(base({ onActivate }));
    const input = document.createElement("input");
    const event = key("Enter", { target: input });
    grid.keyDown(event);
    expect(onActivate).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("leaves Enter alone without an activation handler", () => {
    const grid = createGridFocusController(base());
    const event = key("Enter", { target: document.createElement("td") });
    grid.keyDown(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});

describe("DOM focus", () => {
  const mount = () => {
    const container = document.createElement("div");
    const cell = document.createElement("div");
    cell.tabIndex = -1;
    cell.setAttribute(GRID_CELL_ATTR, "1:0");
    container.append(cell);
    document.body.append(container);
    return { container, cell };
  };

  it("asks for the row, then focuses the cell once it is mounted", () => {
    const scrollToRow = vi.fn();
    const grid = createGridFocusController(base({ scrollToRow }));
    const container = document.createElement("div");
    document.body.append(container);
    grid.attach(container);
    grid.focusCell({ row: 1, col: 0 });
    expect(scrollToRow).toHaveBeenCalledWith(1);
    grid.syncFocus();
    const cell = document.createElement("div");
    cell.tabIndex = -1;
    cell.setAttribute(GRID_CELL_ATTR, "1:0");
    container.append(cell);
    grid.syncFocus();
    expect(document.activeElement).toBe(cell);
  });

  it("focuses a pending cell only once", () => {
    const grid = createGridFocusController(base());
    const { container, cell } = mount();
    grid.attach(container);
    grid.focusCell({ row: 1, col: 0 });
    grid.syncFocus();
    cell.blur();
    grid.syncFocus();
    expect(document.activeElement).not.toBe(cell);
  });

  it("moves no focus without a container or while disabled", () => {
    const grid = createGridFocusController(base());
    const { container, cell } = mount();
    grid.focusCell({ row: 1, col: 0 });
    grid.syncFocus();
    expect(document.activeElement).not.toBe(cell);
    grid.configure(base({ enabled: false }));
    grid.attach(container);
    grid.syncFocus();
    expect(document.activeElement).not.toBe(cell);
  });

  it("follows focus that arrives without a key press", () => {
    const grid = createGridFocusController(base());
    const listener = vi.fn();
    grid.subscribe(listener);
    grid.trackFocus({ row: 2, col: 1 });
    expect(grid.getSnapshot().active).toEqual({ row: 2, col: 1 });
    grid.trackFocus({ row: 2, col: 1 });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("history keys", () => {
  it("announces undo and both redo spellings", () => {
    const onUndo = vi.fn(() => 2);
    const onRedo = vi.fn(() => 1);
    const grid = createGridFocusController(base({ onUndo, onRedo }));
    const undo = key("z", { ctrlKey: true });
    grid.keyDown(undo);
    expect(undo.preventDefault).toHaveBeenCalled();
    expect(grid.getSnapshot().announcement).toBe("2 cells restored");
    grid.keyDown(key("Z", { metaKey: true, shiftKey: true }));
    expect(grid.getSnapshot().announcement).toBe("1 cell redone");
    grid.keyDown(key("y", { ctrlKey: true }));
    expect(onRedo).toHaveBeenCalledTimes(2);
  });

  it("says when there is nothing to undo", () => {
    const grid = createGridFocusController(base({ onUndo: () => 0 }));
    grid.keyDown(key("z", { ctrlKey: true }));
    expect(grid.getSnapshot().announcement).toBe("Nothing to undo");
  });

  it("leaves the key to the browser without a history", () => {
    const grid = createGridFocusController(base());
    const event = key("z", { ctrlKey: true });
    grid.keyDown(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});

describe("modified keys", () => {
  it("opens the find bar on Ctrl/Cmd+F when there is one", () => {
    const onFind = vi.fn();
    const grid = createGridFocusController(base({ onFind }));
    const event = key("f", { metaKey: true });
    grid.keyDown(event);
    expect(onFind).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
    const plain = createGridFocusController(base());
    const browser = key("f", { ctrlKey: true });
    plain.keyDown(browser);
    expect(browser.preventDefault).not.toHaveBeenCalled();
  });

  it("still moves on a modified navigation key", () => {
    const grid = createGridFocusController(base());
    grid.keyDown(key("End", { ctrlKey: true }));
    expect(grid.getSnapshot().active).toEqual({ row: 2, col: 1 });
  });

  it("copies the selection as tab-separated text", async () => {
    const grid = createGridFocusController(base());
    grid.selectRange({ anchor: { row: 0, col: 0 }, head: { row: 1, col: 1 } });
    grid.keyDown(key("c", { ctrlKey: true }));
    await settle();
    expect(clipboard.writeText).toHaveBeenCalledWith("Ada\t1\nLinus\t2");
    expect(grid.getSnapshot().announcement).toBe("4 cells copied");
  });

  it("leaves copy to the browser with nothing selected", () => {
    const grid = createGridFocusController(base());
    const event = key("c", { ctrlKey: true });
    grid.keyDown(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("tells the host about a cut only once the copy succeeded", async () => {
    const onCut = vi.fn();
    const grid = createGridFocusController(base({ onCut }));
    const range = { anchor: { row: 0, col: 0 }, head: { row: 0, col: 1 } };
    grid.selectRange(range);
    clipboard.writeText.mockRejectedValueOnce(new Error("denied"));
    grid.keyDown(key("x", { ctrlKey: true }));
    await settle();
    expect(onCut).not.toHaveBeenCalled();
    expect(grid.getSnapshot().announcement).toBe("Copy failed");
    grid.keyDown(key("x", { ctrlKey: true }));
    await settle();
    expect(onCut).toHaveBeenCalledWith(range);
  });

  it("fills a multi-row selection down from its top row", () => {
    const onFill = vi.fn<(edits: CellEdit<Row>[]) => void>();
    const grid = createGridFocusController(base({ onFill }));
    grid.selectRange({ anchor: { row: 0, col: 0 }, head: { row: 2, col: 0 } });
    const event = key("d", { ctrlKey: true });
    grid.keyDown(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(onFill.mock.calls[0]?.[0]).toEqual([
      { row: ROWS[1], columnKey: "name", value: "Ada" },
      { row: ROWS[2], columnKey: "name", value: "Ada" },
    ]);
    expect(grid.getSnapshot().announcement).toBe("2 cells filled");
  });

  it("leaves fill down to the browser on a one-row selection", () => {
    const onFill = vi.fn();
    const grid = createGridFocusController(base({ onFill }));
    grid.selectRange({ anchor: { row: 0, col: 0 }, head: { row: 0, col: 1 } });
    const event = key("d", { ctrlKey: true });
    grid.keyDown(event);
    expect(onFill).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("pastes into the focused cell when nothing is selected", async () => {
    const onPaste = vi.fn<(edits: CellEdit<Row>[]) => void>();
    const grid = createGridFocusController(base({ onPaste }));
    clipboard.readText.mockResolvedValue("Zed\t9");
    grid.keyDown(key("v", { ctrlKey: true }));
    await settle();
    expect(onPaste.mock.calls[0]?.[0]).toEqual([
      { row: ROWS[0], columnKey: "name", value: "Zed" },
      { row: ROWS[0], columnKey: "score", value: 9 },
    ]);
    expect(grid.getSnapshot().announcement).toBe("2 cells pasted");
  });

  it("says when the clipboard cannot be read", async () => {
    const grid = createGridFocusController(base({ onPaste: vi.fn() }));
    clipboard.readText.mockRejectedValue(new Error("denied"));
    grid.keyDown(key("v", { ctrlKey: true }));
    await settle();
    expect(grid.getSnapshot().announcement).toBe("Paste failed");
  });

  it("leaves paste to the browser without a paste handler", () => {
    const grid = createGridFocusController(base());
    const event = key("v", { ctrlKey: true });
    grid.keyDown(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});

describe("pointer selection", () => {
  it("collapses on a press and extends while dragging", () => {
    const grid = createGridFocusController(base());
    grid.pressCell({ row: 0, col: 0 }, {});
    grid.enterCell({ row: 1, col: 1 });
    expect(grid.getSnapshot().range).toEqual({
      anchor: { row: 0, col: 0 },
      head: { row: 1, col: 1 },
    });
    grid.releaseCell();
    grid.enterCell({ row: 2, col: 1 });
    expect(grid.getSnapshot().range?.head).toEqual({ row: 1, col: 1 });
  });

  it("extends from the active cell on a Shift press", () => {
    const grid = createGridFocusController(base());
    grid.focusCell({ row: 0, col: 0 });
    grid.pressCell({ row: 2, col: 1 }, { shiftKey: true });
    expect(grid.getSnapshot().range).toEqual({
      anchor: { row: 0, col: 0 },
      head: { row: 2, col: 1 },
    });
  });

  it("extends from the pressed cell before the grid is entered", () => {
    const grid = createGridFocusController(base());
    grid.pressCell({ row: 1, col: 1 }, { shiftKey: true });
    expect(grid.getSnapshot().range).toEqual({
      anchor: { row: 1, col: 1 },
      head: { row: 1, col: 1 },
    });
  });

  it("ignores hovering without a drag", () => {
    const grid = createGridFocusController(base());
    grid.enterCell({ row: 1, col: 1 });
    expect(grid.getSnapshot().range).toBeNull();
  });

  it("ends a drag released outside the table", () => {
    const grid = createGridFocusController(base());
    const stop = grid.watchPointerRelease(window);
    grid.pressCell({ row: 0, col: 0 }, {});
    window.dispatchEvent(new MouseEvent("mouseup"));
    grid.enterCell({ row: 1, col: 1 });
    expect(grid.getSnapshot().range?.head).toEqual({ row: 0, col: 0 });
    stop();
    grid.pressCell({ row: 0, col: 0 }, {});
    window.dispatchEvent(new MouseEvent("mouseup"));
    grid.enterCell({ row: 1, col: 0 });
    expect(grid.getSnapshot().range?.head).toEqual({ row: 1, col: 0 });
  });

  it("reports every range change to the host", () => {
    const onRangeChange = vi.fn();
    const grid = createGridFocusController(base({ onRangeChange }));
    grid.selectRange(null);
    expect(onRangeChange).toHaveBeenCalledWith(null);
  });
});

describe("fill drag", () => {
  const press = { preventDefault: vi.fn(), stopPropagation: vi.fn() };

  it("previews, then commits the fill on release", () => {
    const onFill = vi.fn<(edits: CellEdit<Row>[]) => void>();
    const grid = createGridFocusController(base({ onFill }));
    grid.selectRange({ anchor: { row: 0, col: 1 }, head: { row: 0, col: 1 } });
    grid.pressFillHandle(press);
    expect(press.preventDefault).toHaveBeenCalled();
    expect(press.stopPropagation).toHaveBeenCalled();
    grid.enterCell({ row: 2, col: 1 });
    expect(grid.getSnapshot().fillPreview).toEqual({
      anchor: { row: 0, col: 1 },
      head: { row: 2, col: 1 },
    });
    grid.releasePointer();
    expect(onFill.mock.calls[0]?.[0]).toEqual([
      { row: ROWS[1], columnKey: "score", value: 1 },
      { row: ROWS[2], columnKey: "score", value: 1 },
    ]);
    const snapshot = grid.getSnapshot();
    expect(snapshot.fillPreview).toBeNull();
    expect(snapshot.range).toEqual({
      anchor: { row: 0, col: 1 },
      head: { row: 2, col: 1 },
    });
    expect(snapshot.announcement).toBe("2 cells filled");
  });

  it("keeps the preview on the current selection", () => {
    const grid = createGridFocusController(base({ onFill: vi.fn() }));
    grid.selectRange({ anchor: { row: 0, col: 0 }, head: { row: 0, col: 0 } });
    grid.pressFillHandle(press);
    grid.enterCell({ row: 1, col: 0 });
    grid.selectRange({ anchor: { row: 0, col: 1 }, head: { row: 0, col: 1 } });
    expect(grid.getSnapshot().fillPreview).toEqual({
      anchor: { row: 0, col: 1 },
      head: { row: 1, col: 1 },
    });
  });

  it("writes nothing for a fill that never left the selection", () => {
    const onFill = vi.fn();
    const grid = createGridFocusController(base({ onFill }));
    grid.selectRange({ anchor: { row: 0, col: 0 }, head: { row: 0, col: 0 } });
    grid.pressFillHandle(press);
    grid.enterCell({ row: 0, col: 0 });
    grid.releasePointer();
    expect(onFill).not.toHaveBeenCalled();
    grid.pressFillHandle(press);
    grid.releasePointer();
    expect(onFill).not.toHaveBeenCalled();
  });

  it("writes nothing without a fill handler", () => {
    const grid = createGridFocusController(base());
    grid.selectRange({ anchor: { row: 0, col: 0 }, head: { row: 0, col: 0 } });
    grid.pressFillHandle(press);
    grid.enterCell({ row: 2, col: 0 });
    grid.releasePointer();
    expect(grid.getSnapshot().range?.head).toEqual({ row: 0, col: 0 });
  });
});

describe("columns", () => {
  it("selects a column over the loaded rows and focuses its top", () => {
    const grid = createGridFocusController(base({ rowCount: 1000 }));
    grid.selectColumn(1);
    const { range, active } = grid.getSnapshot();
    expect(range).toEqual({
      anchor: { row: 0, col: 1 },
      head: { row: 2, col: 1 },
    });
    expect(active).toEqual({ row: 0, col: 1 });
  });

  it("extends the selection to a column", () => {
    const grid = createGridFocusController(base());
    grid.selectColumn(0);
    grid.selectColumn(1, true);
    expect(grid.getSnapshot().range).toEqual({
      anchor: { row: 0, col: 0 },
      head: { row: 2, col: 1 },
    });
  });

  it("toggles a column on and off", () => {
    const grid = createGridFocusController(base());
    grid.toggleColumn(0);
    expect(grid.getSnapshot().range?.head).toEqual({ row: 2, col: 0 });
    grid.toggleColumn(0);
    expect(grid.getSnapshot().range).toBeNull();
  });

  it("selects from a header click unless the header sorts", () => {
    const grid = createGridFocusController(base());
    grid.clickHeader(0, {}, true);
    expect(grid.getSnapshot().range).toBeNull();
    grid.clickHeader(0, {});
    expect(grid.getSnapshot().range?.head).toEqual({ row: 2, col: 0 });
    grid.clickHeader(1, { ctrlKey: true }, true);
    expect(grid.getSnapshot().range).toEqual({
      anchor: { row: 0, col: 0 },
      head: { row: 2, col: 1 },
    });
    grid.clickHeader(1, { metaKey: true });
    expect(grid.getSnapshot().range?.anchor).toEqual({ row: 0, col: 0 });
  });
});

describe("copyCells and cellAt", () => {
  it("copies a given cell, else the selection, else nothing", async () => {
    const grid = createGridFocusController(base());
    grid.copyCells();
    await settle();
    expect(clipboard.writeText).not.toHaveBeenCalled();
    grid.copyCells({ row: 2, col: 0 });
    await settle();
    expect(clipboard.writeText).toHaveBeenLastCalledWith("Grace");
    grid.selectRange({ anchor: { row: 0, col: 1 }, head: { row: 1, col: 1 } });
    grid.copyCells(undefined, false);
    await settle();
    expect(clipboard.writeText).toHaveBeenLastCalledWith("1\n2");
  });

  it("resolves a row key and a column key to a grid address", () => {
    const grid = createGridFocusController(base({ firstRowIndex: 20 }));
    expect(grid.cellAt("r2", "score")).toEqual({ row: 21, col: 1 });
    expect(grid.cellAt("r9", "score")).toBeUndefined();
    expect(grid.cellAt("r2", "missing")).toBeUndefined();
    grid.configure(base({ getRowId: undefined }));
    expect(grid.cellAt("r2", "score")).toBeUndefined();
  });
});

describe("attributes", () => {
  it("states a windowed table's sizes without claiming the grid role", () => {
    expect(
      gridContainerAttributes({
        enabled: false,
        windowed: true,
        columnsWindowed: true,
        rowCount: 500,
        colCount: 40,
      })
    ).toEqual({ "aria-rowcount": 500, "aria-colcount": 40 });
    expect(
      gridContainerAttributes({
        enabled: false,
        windowed: false,
        columnsWindowed: false,
        rowCount: 3,
        colCount: 2,
      })
    ).toEqual({});
    expect(
      gridContainerAttributes({
        enabled: true,
        windowed: false,
        columnsWindowed: false,
        rowCount: 3,
        colCount: 2,
      })
    ).toEqual({ role: "grid", "aria-rowcount": 3, "aria-colcount": 2 });
  });

  const input = {
    enabled: true,
    columnsWindowed: false,
    active: null,
    firstRowIndex: 0,
    range: null,
    fillPreview: null,
  };

  it("makes the first cell tabbable before the grid is entered", () => {
    expect(gridCellAttributes(input, { row: 0, col: 0 })).toEqual({
      "data-grid-cell": "0:0",
      role: "gridcell",
      tabIndex: 0,
      "aria-colindex": 1,
      "aria-selected": undefined,
      "data-cell-selected": undefined,
      "data-cell-match": undefined,
      "data-cell-match-current": undefined,
    });
    expect(gridCellAttributes(input, { row: 0, col: 1 }).tabIndex).toBe(-1);
  });

  it("moves the tab stop to the active cell", () => {
    const active = { row: 1, col: 1 };
    expect(gridCellAttributes({ ...input, active }, active).tabIndex).toBe(0);
    expect(
      gridCellAttributes({ ...input, active }, { row: 0, col: 0 }).tabIndex
    ).toBe(-1);
  });

  it("marks selection only inside a multi-cell rectangle", () => {
    const single = { anchor: { row: 0, col: 0 }, head: { row: 0, col: 0 } };
    const cell = gridCellAttributes({ ...input, range: single }, single.anchor);
    expect(cell["aria-selected"]).toBeUndefined();
    expect(cell["data-cell-selected"]).toBe("");
    const wide = { anchor: { row: 0, col: 0 }, head: { row: 1, col: 1 } };
    expect(
      gridCellAttributes({ ...input, range: wide }, { row: 1, col: 1 })[
        "aria-selected"
      ]
    ).toBe(true);
    expect(
      gridCellAttributes({ ...input, range: wide }, { row: 2, col: 0 })[
        "aria-selected"
      ]
    ).toBe(false);
  });

  it("highlights a fill preview in place of the selection", () => {
    const range = { anchor: { row: 0, col: 0 }, head: { row: 0, col: 0 } };
    const fillPreview = {
      anchor: { row: 0, col: 0 },
      head: { row: 2, col: 0 },
    };
    expect(
      gridCellAttributes({ ...input, range, fillPreview }, { row: 2, col: 0 })[
        "data-cell-selected"
      ]
    ).toBe("");
  });

  it("marks find matches and the current one", () => {
    const withMatches = {
      ...input,
      matchKeys: new Set(["0:0", "1:0"]),
      currentMatch: { row: 1, col: 0 },
    };
    const first = gridCellAttributes(withMatches, { row: 0, col: 0 });
    expect(first["data-cell-match"]).toBe("");
    expect(first["data-cell-match-current"]).toBeUndefined();
    expect(
      gridCellAttributes(withMatches, { row: 1, col: 0 })[
        "data-cell-match-current"
      ]
    ).toBe("");
    const noWalk = gridCellAttributes(
      { ...input, matchKeys: new Set(["0:0"]) },
      { row: 0, col: 0 }
    );
    expect(noWalk["data-cell-match"]).toBe("");
    expect(noWalk["data-cell-match-current"]).toBeUndefined();
  });

  it("states only the column position while disabled", () => {
    const off = { ...input, enabled: false };
    expect(gridCellAttributes(off, { row: 0, col: 3 })).toEqual({});
    expect(
      gridCellAttributes({ ...off, columnsWindowed: true }, { row: 0, col: 3 })
    ).toEqual({ "aria-colindex": 4 });
  });

  it("numbers rows and headers absolutely where the table needs it", () => {
    expect(gridRowAttributes({ enabled: true, windowed: false }, 9)).toEqual({
      "aria-rowindex": 10,
    });
    expect(gridRowAttributes({ enabled: false, windowed: true }, 0)).toEqual({
      "aria-rowindex": 1,
    });
    expect(gridRowAttributes({ enabled: false, windowed: false }, 0)).toEqual(
      {}
    );
    expect(
      gridColumnHeaderAttributes({ enabled: false, columnsWindowed: true }, 2)
    ).toEqual({ "aria-colindex": 3 });
    expect(
      gridColumnHeaderAttributes({ enabled: false, columnsWindowed: false }, 2)
    ).toEqual({});
  });

  it("says a column is selected only over every loaded row", () => {
    const column = { anchor: { row: 0, col: 1 }, head: { row: 2, col: 1 } };
    const window = { enabled: true, firstRowIndex: 0, loadedRows: 3 };
    expect(isGridColumnSelected({ ...window, range: column }, 1)).toBe(true);
    expect(isGridColumnSelected({ ...window, range: column }, 0)).toBe(false);
    expect(
      isGridColumnSelected(
        {
          ...window,
          range: { anchor: { row: 0, col: 1 }, head: { row: 1, col: 1 } },
        },
        1
      )
    ).toBe(false);
    expect(isGridColumnSelected({ ...window, range: null }, 1)).toBe(false);
    expect(
      isGridColumnSelected({ ...window, enabled: false, range: column }, 1)
    ).toBe(false);
  });

  it("puts the fill handle on the selection's bottom inline-end corner", () => {
    const range = { anchor: { row: 2, col: 1 }, head: { row: 0, col: 0 } };
    expect(gridFillHandleCell({ enabled: true, range, canFill: true })).toEqual(
      { row: 2, col: 1 }
    );
    expect(
      gridFillHandleCell({ enabled: true, range, canFill: false })
    ).toBeNull();
    expect(
      gridFillHandleCell({ enabled: true, range: null, canFill: true })
    ).toBeNull();
    expect(
      gridFillHandleCell({ enabled: false, range, canFill: true })
    ).toBeNull();
  });
});
