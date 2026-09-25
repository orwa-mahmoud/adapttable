/**
 * The focus arithmetic, with no React and no DOM involved.
 *
 * Every edge lives here — clamping, RTL, paging past the end — because these
 * are the cases a rendered test would cover by accident at best.
 */
import { describe, expect, it } from "vitest";

import {
  type GridBounds,
  gridFocusMoveForKey,
  moveGridFocus,
  sameGridCell,
} from "./gridFocus";

/** A 10,000-row, 5-column grid showing 24 rows — the virtualized case. */
const BOUNDS: GridBounds = { rowCount: 10000, colCount: 5, pageSize: 24 };
const AT = (row: number, col: number) => ({ row, col });

describe("moveGridFocus", () => {
  it("steps in all four directions", () => {
    expect(moveGridFocus(AT(5, 2), "up", BOUNDS)).toEqual(AT(4, 2));
    expect(moveGridFocus(AT(5, 2), "down", BOUNDS)).toEqual(AT(6, 2));
    expect(moveGridFocus(AT(5, 2), "left", BOUNDS)).toEqual(AT(5, 1));
    expect(moveGridFocus(AT(5, 2), "right", BOUNDS)).toEqual(AT(5, 3));
  });

  it("stops at an edge instead of wrapping to another record", () => {
    // Wrapping right off the last column would land the user on a different
    // row — a silent change of record, which a screen reader would not explain.
    expect(moveGridFocus(AT(0, 4), "right", BOUNDS)).toEqual(AT(0, 4));
    expect(moveGridFocus(AT(0, 0), "left", BOUNDS)).toEqual(AT(0, 0));
    expect(moveGridFocus(AT(0, 2), "up", BOUNDS)).toEqual(AT(0, 2));
    expect(moveGridFocus(AT(9999, 2), "down", BOUNDS)).toEqual(AT(9999, 2));
  });

  it("takes Home and End to the ends of the row, keeping the row", () => {
    expect(moveGridFocus(AT(42, 3), "rowStart", BOUNDS)).toEqual(AT(42, 0));
    expect(moveGridFocus(AT(42, 3), "rowEnd", BOUNDS)).toEqual(AT(42, 4));
  });

  it("takes the grid corners with a modifier", () => {
    expect(moveGridFocus(AT(42, 3), "gridStart", BOUNDS)).toEqual(AT(0, 0));
    expect(moveGridFocus(AT(42, 3), "gridEnd", BOUNDS)).toEqual(AT(9999, 4));
  });

  it("pages by a viewport's worth of rows", () => {
    expect(moveGridFocus(AT(100, 1), "pageDown", BOUNDS)).toEqual(AT(124, 1));
    expect(moveGridFocus(AT(100, 1), "pageUp", BOUNDS)).toEqual(AT(76, 1));
  });

  it("clamps a page that would overshoot either end", () => {
    expect(moveGridFocus(AT(10, 1), "pageUp", BOUNDS)).toEqual(AT(0, 1));
    expect(moveGridFocus(AT(9990, 1), "pageDown", BOUNDS)).toEqual(AT(9999, 1));
  });

  it("survives a grid with one cell", () => {
    const one: GridBounds = { rowCount: 1, colCount: 1, pageSize: 24 };
    for (const move of ["up", "down", "left", "right", "gridEnd"] as const) {
      expect(moveGridFocus(AT(0, 0), move, one)).toEqual(AT(0, 0));
    }
  });

  it("survives an empty grid without producing a negative address", () => {
    const none: GridBounds = { rowCount: 0, colCount: 0, pageSize: 24 };
    expect(moveGridFocus(AT(0, 0), "gridEnd", none)).toEqual(AT(0, 0));
    expect(moveGridFocus(AT(0, 0), "up", none)).toEqual(AT(0, 0));
  });

  it("skips a cell covered by a span and stops if the rest is covered", () => {
    const covered = (cell: { row: number; col: number }) =>
      cell.row === 5 && cell.col === 3;
    expect(moveGridFocus(AT(5, 2), "right", BOUNDS, covered)).toEqual(AT(5, 4));
    const wholeRow = (cell: { row: number; col: number }) => cell.row === 0;
    expect(moveGridFocus(AT(0, 0), "right", BOUNDS, wholeRow)).toEqual(
      AT(0, 0)
    );
  });

  it("treats a zero page size as one row, never as a no-op", () => {
    const flat: GridBounds = { rowCount: 100, colCount: 3, pageSize: 0 };
    expect(moveGridFocus(AT(10, 0), "pageDown", flat)).toEqual(AT(11, 0));
  });
});

describe("gridFocusMoveForKey", () => {
  it("maps the arrow keys", () => {
    expect(gridFocusMoveForKey({ key: "ArrowUp" })).toBe("up");
    expect(gridFocusMoveForKey({ key: "ArrowDown" })).toBe("down");
    expect(gridFocusMoveForKey({ key: "ArrowLeft" })).toBe("left");
    expect(gridFocusMoveForKey({ key: "ArrowRight" })).toBe("right");
  });

  it("swaps left and right under RTL, because arrows describe the screen", () => {
    expect(gridFocusMoveForKey({ key: "ArrowLeft" }, "rtl")).toBe("right");
    expect(gridFocusMoveForKey({ key: "ArrowRight" }, "rtl")).toBe("left");
  });

  it("leaves up and down alone under RTL", () => {
    expect(gridFocusMoveForKey({ key: "ArrowUp" }, "rtl")).toBe("up");
    expect(gridFocusMoveForKey({ key: "ArrowDown" }, "rtl")).toBe("down");
  });

  it("keeps Home and End as row ends in both directions", () => {
    // Home means "start of this row" — in RTL that is its right-hand end,
    // which is what the user is asking for either way.
    expect(gridFocusMoveForKey({ key: "Home" })).toBe("rowStart");
    expect(gridFocusMoveForKey({ key: "Home" }, "rtl")).toBe("rowStart");
    expect(gridFocusMoveForKey({ key: "End" }, "rtl")).toBe("rowEnd");
  });

  it("takes Ctrl or Cmd with Home/End to the grid corners", () => {
    expect(gridFocusMoveForKey({ key: "Home", ctrlKey: true })).toBe(
      "gridStart"
    );
    expect(gridFocusMoveForKey({ key: "Home", metaKey: true })).toBe(
      "gridStart"
    );
    expect(gridFocusMoveForKey({ key: "End", ctrlKey: true })).toBe("gridEnd");
  });

  it("maps the page keys", () => {
    expect(gridFocusMoveForKey({ key: "PageUp" })).toBe("pageUp");
    expect(gridFocusMoveForKey({ key: "PageDown" })).toBe("pageDown");
  });

  it("ignores every other key, so typing and shortcuts still work", () => {
    for (const key of ["a", "Enter", "Escape", "Tab", " ", "F2", "z"]) {
      expect(gridFocusMoveForKey({ key })).toBeNull();
    }
  });
});

describe("sameGridCell", () => {
  it("compares by address, not identity", () => {
    expect(sameGridCell(AT(1, 2), AT(1, 2))).toBe(true);
    expect(sameGridCell(AT(1, 2), AT(2, 1))).toBe(false);
  });

  it("handles the no-focus state", () => {
    expect(sameGridCell(null, null)).toBe(true);
    expect(sameGridCell(null, AT(0, 0))).toBe(false);
    expect(sameGridCell(AT(0, 0), null)).toBe(false);
  });
});
