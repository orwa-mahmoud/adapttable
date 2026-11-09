/**
 * Base navigation, with no range, clipboard, fill or history handlers.
 */
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import type { ColumnModel } from "../contracts/columns";
import {
  createGridNavigation,
  type GridFocusControllerOptions,
  type GridKeyEvent,
} from "./gridNavigation";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "r1", name: "Ada" },
  { id: "r2", name: "Linus" },
];

const COLUMNS: ColumnModel<Row>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
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

const writeText = vi.fn();

beforeEach(() => {
  writeText.mockReset();
  Object.assign(navigator, { clipboard: { writeText, readText: vi.fn() } });
});

describe("base navigation", () => {
  it("moves and announces without building a selection", () => {
    const grid = createGridNavigation(base());
    const event = key("ArrowDown");
    grid.keyDown(event);
    expect(grid.getSnapshot().active).toEqual({ row: 1, col: 0 });
    expect(grid.getSnapshot().range).toBeNull();
    expect(grid.getSnapshot().announcement).toBe("Name, Linus, row 2 of 2");
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("does not extend a range when Shift is held", () => {
    const grid = createGridNavigation(base());
    grid.focusCell({ row: 0, col: 0 });
    grid.keyDown(key("ArrowDown", { shiftKey: true }));
    expect(grid.getSnapshot().active).toEqual({ row: 1, col: 0 });
    expect(grid.getSnapshot().range).toBeNull();
  });

  it("flips the horizontal arrow when the grid is right to left", () => {
    const grid = createGridNavigation(
      base({
        dir: "rtl",
        columns: [
          ...COLUMNS,
          { key: "id", header: "Id", accessor: (row) => row.id },
        ],
      })
    );
    grid.keyDown(key("ArrowLeft"));
    expect(grid.getSnapshot().active).toEqual({ row: 0, col: 1 });
    expect(grid.getSnapshot().announcement).toBe("Id, r1, row 1 of 2");
  });

  it("leaves copy and undo to the browser", async () => {
    const onUndo = vi.fn(() => 1);
    const grid = createGridNavigation(base({ onUndo }));
    grid.focusCell({ row: 0, col: 0 });
    const range = {
      anchor: { row: 0, col: 0 },
      head: { row: 1, col: 0 },
    };
    grid.selectRange(range);
    const copy = key("c", { ctrlKey: true });
    const undo = key("z", { ctrlKey: true });
    grid.keyDown(copy);
    grid.keyDown(undo);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(copy.preventDefault).not.toHaveBeenCalled();
    expect(undo.preventDefault).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
    expect(onUndo).not.toHaveBeenCalled();
    expect(grid.getSnapshot().range).toEqual(range);
  });
});
