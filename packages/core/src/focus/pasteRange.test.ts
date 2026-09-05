/**
 * Pasting a spreadsheet's clipboard into the table.
 *
 * Paste is not its own commit path: it produces the same edits an inline edit
 * produces, so whatever later wraps that path — validation, async saves,
 * conflict handling — applies to a paste without paste knowing. These check the
 * parsing a spreadsheet actually writes, and the limits a paste must respect.
 */
import type { ColumnModel } from "../columnModel";
import { describe, expect, it, vi } from "vitest";

import {
  cellPasteHandler,
  parseClipboardTable,
  pasteRangeEdits,
} from "./pasteRange";

interface Row {
  id: string;
  name: string;
  budget: number;
}
const ROWS: Row[] = [
  { id: "1", name: "Ada", budget: 10 },
  { id: "2", name: "Linus", budget: 20 },
  { id: "3", name: "Grace", budget: 30 },
];
const COLUMNS: ColumnModel<Row>[] = [
  { key: "name", header: "Name", editable: true },
  {
    key: "budget",
    header: "Budget",
    editable: true,
    parseValue: (draft) => Number(draft),
  },
];
const at = (row: number, col: number) => ({
  anchor: { row, col },
  head: { row, col },
});

describe("parseClipboardTable", () => {
  it("splits tabs into cells and newlines into rows", () => {
    expect(parseClipboardTable("a\tb\nc\td")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("keeps a quoted field's tabs and newlines intact", () => {
    // A spreadsheet writes `"a\tb"` for a cell containing a tab; splitting
    // naively would make it two cells and shift every column after it.
    expect(parseClipboardTable('"a\tb"\tc')).toEqual([["a\tb", "c"]]);
    expect(parseClipboardTable('"line1\nline2"\tc')).toEqual([
      ["line1\nline2", "c"],
    ]);
  });

  it("reads a doubled quote as one literal quote", () => {
    expect(parseClipboardTable('"say ""hi"""')).toEqual([['say "hi"']]);
  });

  it("treats CRLF as one row break", () => {
    // Windows and Excel write \r\n; counting it twice pastes a blank row.
    expect(parseClipboardTable("a\r\nb")).toEqual([["a"], ["b"]]);
  });

  it("keeps what an unterminated quote carries", () => {
    // A clipboard truncated mid-cell is still worth its content; throwing it
    // away would lose the whole paste over one missing character.
    expect(parseClipboardTable('"a\tb')).toEqual([["a\tb"]]);
  });

  it("has nothing to say about empty text", () => {
    expect(parseClipboardTable("")).toEqual([]);
  });
});

describe("pasteRangeEdits", () => {
  it("writes from the selection's top-left cell", () => {
    const edits = pasteRangeEdits({
      text: "X\t5",
      range: at(1, 0),
      rows: ROWS,
      columns: COLUMNS,
    });
    expect(edits).toEqual([
      { row: ROWS[1], columnKey: "name", value: "X" },
      { row: ROWS[1], columnKey: "budget", value: 5 },
    ]);
  });

  it("lets the clipboard's shape win over the selection's", () => {
    // Pasting a 2×2 block into one selected cell writes 2×2 — what every
    // spreadsheet does.
    const edits = pasteRangeEdits({
      text: "A\t1\nB\t2",
      range: at(0, 0),
      rows: ROWS,
      columns: COLUMNS,
    });
    expect(edits).toHaveLength(4);
    expect(edits[3]).toEqual({ row: ROWS[1], columnKey: "budget", value: 2 });
  });

  it("commits through the column's parser, exactly as typing would", () => {
    const edits = pasteRangeEdits({
      text: "42",
      range: at(0, 1),
      rows: ROWS,
      columns: COLUMNS,
    });
    expect(edits[0]?.value).toBe(42);
  });

  it("drops cells that fall past the loaded rows", () => {
    // Three pasted rows starting at the last one: only the loaded row is
    // written. A paste must never invent a row the browser has not got.
    const edits = pasteRangeEdits({
      text: "A\nB\nC",
      range: at(2, 0),
      rows: ROWS,
      columns: COLUMNS,
    });
    expect(edits).toHaveLength(1);
    expect(edits[0]?.row).toBe(ROWS[2]);
  });

  it("drops cells that fall past the rendered columns", () => {
    const edits = pasteRangeEdits({
      text: "A\t1\tEXTRA",
      range: at(0, 0),
      rows: ROWS,
      columns: COLUMNS,
    });
    expect(edits).toHaveLength(2);
  });

  it("skips a column that is not editable — a paste is still an edit", () => {
    const columns: ColumnModel<Row>[] = [
      { key: "name", header: "Name" },
      { key: "budget", header: "Budget", editable: true },
    ];
    const edits = pasteRangeEdits({
      text: "X\t5",
      range: at(0, 0),
      rows: ROWS,
      columns,
    });
    expect(edits).toEqual([{ row: ROWS[0], columnKey: "budget", value: "5" }]);
  });

  it("respects a per-row editable predicate", () => {
    const columns: ColumnModel<Row>[] = [
      { key: "name", header: "Name", editable: (row) => row.id !== "2" },
    ];
    const edits = pasteRangeEdits({
      text: "A\nB",
      range: at(0, 0),
      rows: ROWS,
      columns,
    });
    expect(edits).toEqual([{ row: ROWS[0], columnKey: "name", value: "A" }]);
  });

  it("offsets by where the page starts", () => {
    const edits = pasteRangeEdits({
      text: "Z",
      range: at(5, 0),
      rows: [ROWS[2]!],
      columns: COLUMNS,
      firstRowIndex: 5,
    });
    expect(edits).toEqual([{ row: ROWS[2], columnKey: "name", value: "Z" }]);
  });

  it("produces nothing from empty text", () => {
    expect(
      pasteRangeEdits({
        text: "",
        range: at(0, 0),
        rows: ROWS,
        columns: COLUMNS,
      })
    ).toEqual([]);
  });
});

describe("cellPasteHandler", () => {
  it("sends every cell through the ordinary edit channel", () => {
    // The point of the default: wiring editing wires pasting.
    const onCellEdit = vi.fn();
    const handler = cellPasteHandler<Row>({ onCellEdit });
    handler?.([
      { row: ROWS[0]!, columnKey: "name", value: "A" },
      { row: ROWS[1]!, columnKey: "budget", value: 5 },
    ]);
    expect(onCellEdit).toHaveBeenCalledTimes(2);
    expect(onCellEdit).toHaveBeenLastCalledWith(ROWS[1], "budget", 5);
  });

  it("hands the batch whole to a host that asked for it", () => {
    const onCellPaste = vi.fn();
    const onCellEdit = vi.fn();
    const handler = cellPasteHandler<Row>({ onCellPaste, onCellEdit });
    handler?.([{ row: ROWS[0]!, columnKey: "name", value: "A" }]);
    expect(onCellPaste).toHaveBeenCalledOnce();
    expect(onCellEdit).not.toHaveBeenCalled();
  });

  it("leaves Ctrl/Cmd+V to the browser when the table takes no edits", () => {
    expect(cellPasteHandler<Row>({})).toBeUndefined();
  });
});
