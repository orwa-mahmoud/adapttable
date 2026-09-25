/**
 * The range model.
 *
 * The cases that matter are the ones where a naive "set of selected cells"
 * gets it wrong: shrinking a range back toward its origin, and ranges dragged
 * upward or leftward.
 */
import { describe, expect, it } from "vitest";

import {
  type CellRange,
  cellRangeBounds,
  cellRangeIndices,
  cellRangeSize,
  extendCellRange,
  isInCellRange,
  isSingleCell,
  singleCellRange,
} from "./cellRange";

const AT = (row: number, col: number) => ({ row, col });
const range = (a: [number, number], h: [number, number]): CellRange => ({
  anchor: AT(...a),
  head: AT(...h),
});

describe("cellRangeBounds", () => {
  it("sorts the corners of a range dragged down and right", () => {
    expect(cellRangeBounds(range([1, 1], [3, 4]))).toEqual({
      fromRow: 1,
      toRow: 3,
      fromCol: 1,
      toCol: 4,
    });
  });

  it("sorts the corners of a range dragged up and left", () => {
    // The anchor is below and to the right of the head — every consumer would
    // otherwise repeat this min/max and one of them would forget.
    expect(cellRangeBounds(range([3, 4], [1, 1]))).toEqual({
      fromRow: 1,
      toRow: 3,
      fromCol: 1,
      toCol: 4,
    });
  });
});

describe("isInCellRange", () => {
  it("includes both corners and the middle", () => {
    const r = range([1, 1], [3, 3]);
    expect(isInCellRange(r, AT(1, 1))).toBe(true);
    expect(isInCellRange(r, AT(2, 2))).toBe(true);
    expect(isInCellRange(r, AT(3, 3))).toBe(true);
  });

  it("excludes cells outside the rectangle", () => {
    const r = range([1, 1], [3, 3]);
    expect(isInCellRange(r, AT(0, 1))).toBe(false);
    expect(isInCellRange(r, AT(4, 2))).toBe(false);
    expect(isInCellRange(r, AT(2, 4))).toBe(false);
  });

  it("works the same for an inverted range", () => {
    expect(isInCellRange(range([3, 3], [1, 1]), AT(2, 2))).toBe(true);
  });

  it("says no when there is no range", () => {
    expect(isInCellRange(null, AT(0, 0))).toBe(false);
  });
});

describe("cellRangeSize", () => {
  it("multiplies rather than enumerating", () => {
    // A 10,000-row selection must not cost 10,000 anything.
    expect(cellRangeSize(range([0, 0], [9999, 4]))).toBe(50000);
  });

  it("counts a single cell as one", () => {
    expect(cellRangeSize(singleCellRange(AT(7, 2)))).toBe(1);
  });

  it("counts nothing as zero", () => {
    expect(cellRangeSize(null)).toBe(0);
  });
});

describe("extendCellRange", () => {
  it("anchors at the focused cell when nothing is selected yet", () => {
    const r = extendCellRange(null, AT(1, 0), AT(0, 0));
    expect(r).toEqual({ anchor: AT(0, 0), head: AT(1, 0) });
    expect(cellRangeSize(r)).toBe(2);
  });

  it("keeps the anchor while the head moves", () => {
    let r = extendCellRange(null, AT(1, 0), AT(0, 0));
    r = extendCellRange(r, AT(2, 0), AT(0, 0));
    r = extendCellRange(r, AT(3, 0), AT(0, 0));
    expect(r.anchor).toEqual(AT(0, 0));
    expect(cellRangeSize(r)).toBe(4);
  });

  it("shrinks back toward the anchor rather than starting a new range", () => {
    // Shift+Down twice then Shift+Up: three cells, not a fresh selection
    // heading the other way. This is the whole reason the anchor is kept.
    let r = extendCellRange(null, AT(1, 0), AT(0, 0));
    r = extendCellRange(r, AT(2, 0), AT(0, 0));
    expect(cellRangeSize(r)).toBe(3);
    r = extendCellRange(r, AT(1, 0), AT(0, 0));
    expect(cellRangeSize(r)).toBe(2);
    expect(r.anchor).toEqual(AT(0, 0));
  });

  it("crosses the anchor and keeps counting from it", () => {
    let r = extendCellRange(null, AT(4, 0), AT(5, 0));
    r = extendCellRange(r, AT(6, 0), AT(5, 0));
    // Anchored at row 5, head now below it.
    expect(r.anchor).toEqual(AT(5, 0));
    expect(cellRangeBounds(r)).toMatchObject({ fromRow: 5, toRow: 6 });
  });
});

describe("isSingleCell", () => {
  it("is true only when both corners agree", () => {
    expect(isSingleCell(singleCellRange(AT(2, 2)))).toBe(true);
    expect(isSingleCell(range([2, 2], [2, 3]))).toBe(false);
    expect(isSingleCell(null)).toBe(false);
  });
});

describe("cellRangeIndices", () => {
  it("lists the rows and columns a range covers", () => {
    expect(cellRangeIndices(range([2, 1], [4, 2]))).toEqual({
      rows: [2, 3, 4],
      cols: [1, 2],
    });
  });

  it("lists an inverted range in ascending order", () => {
    expect(cellRangeIndices(range([4, 2], [2, 1]))).toEqual({
      rows: [2, 3, 4],
      cols: [1, 2],
    });
  });
});
