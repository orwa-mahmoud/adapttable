/**
 * What the selected cells add up to.
 *
 * The figures come from the same value resolution copy and export use, so
 * these check the arithmetic AND that resolution: a column with an
 * `exportValue` must contribute the number it exports, not the string it
 * renders.
 */
import { describe, expect, it } from "vitest";

import type { ColumnModel } from "../columnModel";
import { selectionStats } from "./selectionStats";

interface Row {
  id: string;
  name: string;
  budget: number;
}
const ROWS: Row[] = [
  { id: "1", name: "Ada", budget: 10 },
  { id: "2", name: "Linus", budget: 30 },
  { id: "3", name: "Grace", budget: 50 },
];
// Accessors, because that is what makes a cell show anything at all — and
// the stats read exactly what copy and export read.
const COLUMNS: ColumnModel<Row>[] = [
  { key: "name", header: "Name", exportValue: (row) => row.name },
  { key: "budget", header: "Budget", exportValue: (row) => row.budget },
];
const rect = (
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number
) => ({
  anchor: { row: fromRow, col: fromCol },
  head: { row: toRow, col: toCol },
});
const stats = (range: ReturnType<typeof rect> | null, rows = ROWS) =>
  selectionStats({ range, rows, columns: COLUMNS });

describe("selectionStats", () => {
  it("has nothing to say about no selection", () => {
    expect(stats(null)).toBeNull();
  });

  it("counts, sums and averages a column of numbers", () => {
    expect(stats(rect(0, 1, 2, 1))).toEqual({
      cells: 3,
      numeric: 3,
      sum: 90,
      average: 30,
      min: 10,
      max: 50,
    });
  });

  it("counts every cell but does arithmetic on the numbers only", () => {
    // A rectangle spanning a name and a budget still has a sum; refusing one
    // because a string is in the way is the behaviour nobody wants.
    expect(stats(rect(0, 0, 1, 1))).toMatchObject({
      cells: 4,
      numeric: 2,
      sum: 40,
      average: 20,
    });
  });

  it("leaves the arithmetic empty when nothing selected is a number", () => {
    expect(stats(rect(0, 0, 2, 0))).toEqual({
      cells: 3,
      numeric: 0,
      sum: null,
      average: null,
      min: null,
      max: null,
    });
  });

  it("reads numbers written as text", () => {
    const rows = [{ id: "1", name: "12", budget: 0 }];
    expect(
      selectionStats({ range: rect(0, 0, 0, 0), rows, columns: COLUMNS })?.sum
    ).toBe(12);
  });

  it("does not add up booleans", () => {
    // Summing a column of ticks to 3 says something nobody asked.
    const columns: ColumnModel<Row>[] = [
      { key: "name", header: "Name", exportValue: () => true },
    ];
    expect(
      selectionStats({ range: rect(0, 0, 1, 0), rows: ROWS, columns })
    ).toMatchObject({ cells: 2, numeric: 0, sum: null });
  });

  it("takes the value a column exports, not the one it renders", () => {
    const columns: ColumnModel<Row>[] = [
      { key: "budget", header: "Budget", exportValue: (row) => row.budget * 2 },
    ];
    expect(
      selectionStats({ range: rect(0, 0, 2, 0), rows: ROWS, columns })?.sum
    ).toBe(180);
  });

  it("describes only the rows the browser holds", () => {
    // A column selection over 500 loaded rows of 100,000 describes the 500.
    expect(
      selectionStats({
        range: rect(0, 1, 9, 1),
        rows: ROWS,
        columns: COLUMNS,
      })
    ).toMatchObject({ numeric: 3, sum: 90 });
  });

  it("offsets by where the page starts", () => {
    expect(
      selectionStats({
        range: rect(10, 1, 11, 1),
        rows: [ROWS[0]!, ROWS[1]!],
        columns: COLUMNS,
        firstRowIndex: 10,
      })
    ).toMatchObject({ sum: 40 });
  });

  it("has nothing to say when the range names no rendered column", () => {
    expect(stats(rect(0, 7, 1, 8))).toBeNull();
  });

  it("ignores a number that is not finite", () => {
    const rows = [{ id: "1", name: "x", budget: Number.POSITIVE_INFINITY }];
    expect(
      selectionStats({ range: rect(0, 1, 0, 1), rows, columns: COLUMNS })
    ).toMatchObject({ numeric: 0 });
  });
});
