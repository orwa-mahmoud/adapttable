/**
 * The fill gesture's arithmetic, away from any DOM.
 *
 * What matters here is what a spreadsheet user expects: which way a drag is
 * going, which cells it covers, and whether the values count on or repeat.
 */
import { describe, expect, it } from "vitest";

import type { ColumnModel } from "../columnModel";
import { fillDirection, fillRangeEdits, fillTargetRange } from "./fillRange";

interface Row {
  id: string;
  name: string;
  score: number;
}
const ROWS: Row[] = [
  { id: "1", name: "Ada", score: 1 },
  { id: "2", name: "Linus", score: 2 },
  { id: "3", name: "Grace", score: 9 },
  { id: "4", name: "Alan", score: 9 },
  { id: "5", name: "Edsger", score: 9 },
];
const COLUMNS: ColumnModel<Row>[] = [
  { key: "name", header: "Name", editable: true },
  {
    key: "score",
    header: "Score",
    editable: true,
    parseValue: (draft) => Number(draft),
  },
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

describe("fillDirection", () => {
  it("is nothing while the pointer is still inside the selection", () => {
    expect(fillDirection(rect(0, 0, 1, 1), { row: 1, col: 1 })).toBeNull();
  });

  it("reads down, up, right and left from where the drag reached", () => {
    const source = rect(1, 1, 2, 2);
    expect(fillDirection(source, { row: 4, col: 2 })).toBe("down");
    expect(fillDirection(source, { row: 0, col: 1 })).toBe("up");
    expect(fillDirection(source, { row: 2, col: 4 })).toBe("right");
    expect(fillDirection(source, { row: 1, col: 0 })).toBe("left");
  });

  it("lets the larger overflow decide when a drag wanders", () => {
    // Three rows down and one column across is a downward fill; a stray pixel
    // sideways must not turn it into a sideways one.
    expect(fillDirection(rect(0, 0, 0, 0), { row: 3, col: 1 })).toBe("down");
  });
});

describe("fillTargetRange", () => {
  it("covers the selection plus what the drag added", () => {
    expect(fillTargetRange(rect(1, 0, 1, 1), { row: 3, col: 1 })).toEqual(
      rect(1, 0, 3, 1)
    );
  });

  it("grows backwards for an upward fill", () => {
    expect(fillTargetRange(rect(2, 0, 2, 0), { row: 0, col: 0 })).toEqual(
      rect(0, 0, 2, 0)
    );
  });

  it("is the selection itself when nothing was added", () => {
    const source = rect(0, 0, 1, 1);
    expect(fillTargetRange(source, { row: 0, col: 0 })).toBe(source);
  });
});

describe("fillRangeEdits", () => {
  const fill = (
    source: ReturnType<typeof rect>,
    to: { row: number; col: number }
  ) => fillRangeEdits({ source, to, rows: ROWS, columns: COLUMNS });

  it("repeats a single value down the drag", () => {
    const edits = fill(rect(0, 0, 0, 0), { row: 2, col: 0 });
    expect(edits).toEqual([
      { row: ROWS[1], columnKey: "name", value: "Ada" },
      { row: ROWS[2], columnKey: "name", value: "Ada" },
    ]);
  });

  it("continues a series when the source counts", () => {
    // 1, 2 → 3, 4: the behaviour that makes the handle worth having.
    const edits = fill(rect(0, 1, 1, 1), { row: 3, col: 1 });
    expect(edits.map((edit) => edit.value)).toEqual([3, 4]);
  });

  it("repeats rather than guessing a step from one number", () => {
    const edits = fill(rect(2, 1, 2, 1), { row: 4, col: 1 });
    expect(edits.map((edit) => edit.value)).toEqual([9, 9]);
  });

  it("cycles a multi-value block that is not a series", () => {
    const edits = fill(rect(0, 0, 1, 0), { row: 4, col: 0 });
    expect(edits.map((edit) => edit.value)).toEqual(["Ada", "Linus", "Ada"]);
  });

  it("counts backwards when the fill runs upwards", () => {
    // Source rows 2 and 3 hold 9 and 9 — a flat run repeats; rows 0 and 1 hold
    // 1 and 2, and dragging that pair upwards continues 0, -1.
    const edits = fillRangeEdits({
      source: rect(1, 1, 2, 1),
      to: { row: 0, col: 1 },
      rows: [
        { id: "a", name: "a", score: 4 },
        { id: "b", name: "b", score: 3 },
        { id: "c", name: "c", score: 2 },
      ],
      columns: COLUMNS,
    });
    expect(edits.map((edit) => edit.value)).toEqual([4]);
  });

  it("fills sideways across the columns of a row", () => {
    const edits = fill(rect(0, 0, 0, 0), { row: 0, col: 1 });
    expect(edits).toEqual([
      { row: ROWS[0], columnKey: "score", value: Number("Ada") },
    ]);
  });

  it("writes nothing when the drag never left the selection", () => {
    expect(fill(rect(0, 0, 1, 1), { row: 1, col: 1 })).toEqual([]);
  });

  it("skips rows the browser has not loaded", () => {
    const edits = fillRangeEdits({
      source: rect(5, 0, 5, 0),
      to: { row: 9, col: 0 },
      rows: [ROWS[0]!],
      columns: COLUMNS,
      firstRowIndex: 5,
    });
    expect(edits).toEqual([]);
  });

  it("skips a column that is not editable", () => {
    const edits = fillRangeEdits({
      source: rect(0, 0, 0, 0),
      to: { row: 2, col: 0 },
      rows: ROWS,
      columns: [{ key: "name", header: "Name" }],
    });
    expect(edits).toEqual([]);
  });

  it("ignores a lane whose source cell is not there", () => {
    // A column index past the rendered columns has no seed to carry.
    const edits = fillRangeEdits({
      source: rect(0, 5, 0, 5),
      to: { row: 2, col: 5 },
      rows: ROWS,
      columns: COLUMNS,
    });
    expect(edits).toEqual([]);
  });

  it("skips a seed row the browser has not loaded", () => {
    const edits = fillRangeEdits({
      source: rect(0, 0, 0, 0),
      to: { row: 1, col: 0 },
      rows: [],
      columns: COLUMNS,
    });
    expect(edits).toEqual([]);
  });

  it("treats a blank cell as no series", () => {
    // "" and 2 are not a run counting by two — blank is not zero.
    const rows: Row[] = [
      { id: "a", name: "", score: 0 },
      { id: "b", name: "x", score: 0 },
      { id: "c", name: "y", score: 0 },
    ];
    const edits = fillRangeEdits({
      source: rect(0, 0, 1, 0),
      to: { row: 2, col: 0 },
      rows,
      columns: COLUMNS,
    });
    expect(edits.map((edit) => edit.value)).toEqual([""]);
  });

  it("offsets by where the page starts", () => {
    const edits = fillRangeEdits({
      source: rect(10, 0, 10, 0),
      to: { row: 11, col: 0 },
      rows: [ROWS[0]!, ROWS[1]!],
      columns: COLUMNS,
      firstRowIndex: 10,
    });
    expect(edits).toEqual([{ row: ROWS[1], columnKey: "name", value: "Ada" }]);
  });
});
