/**
 * Copying the selected rectangle.
 *
 * The format is not a preference: Excel, Sheets, Numbers and LibreOffice all
 * read and write tab-separated text, so TSV is what makes paste work between a
 * table and the thing people actually use. These check the escaping those
 * applications expect, and that a copy never invents rows the browser lacks.
 */
import { describe, expect, it, vi } from "vitest";

import type { ColumnModel } from "../types";
import { clipboardRangeText, writeClipboardText } from "./clipboardRange";

interface Row {
  name: string;
  team: string;
  budget: number;
}
const ROWS: Row[] = [
  { name: "Ada", team: "Core", budget: 1240 },
  { name: "Linus", team: "Web", budget: 90 },
  { name: "Grace", team: "Core", budget: 500 },
];
const COLUMNS: ColumnModel<Row>[] = [
  { key: "name", header: "Name", exportValue: (r) => r.name },
  { key: "team", header: "Team", exportValue: (r) => r.team },
  { key: "budget", header: "Budget", exportValue: (r) => r.budget },
];
const range = (a: [number, number], h: [number, number]) => ({
  anchor: { row: a[0], col: a[1] },
  head: { row: h[0], col: h[1] },
});

describe("clipboardRangeText", () => {
  it("writes the rectangle as tab-separated rows", () => {
    const text = clipboardRangeText({
      range: range([0, 0], [1, 1]),
      rows: ROWS,
      columns: COLUMNS,
    });
    expect(text).toBe("Ada\tCore\nLinus\tWeb");
  });

  it("reads an inverted rectangle the same way", () => {
    const text = clipboardRangeText({
      range: range([1, 1], [0, 0]),
      rows: ROWS,
      columns: COLUMNS,
    });
    expect(text).toBe("Ada\tCore\nLinus\tWeb");
  });

  it("includes a header row when asked", () => {
    const text = clipboardRangeText({
      range: range([0, 0], [0, 1]),
      rows: ROWS,
      columns: COLUMNS,
      headers: true,
    });
    expect(text).toBe("Name\tTeam\nAda\tCore");
  });

  it("quotes a cell carrying a tab, a newline or a quote", () => {
    // Unquoted, each of these would end the field or the row and shift every
    // cell after it into the wrong column.
    const rows: Row[] = [{ name: "a\tb", team: "c\nd", budget: 0 }];
    const columns: ColumnModel<Row>[] = [
      { key: "name", header: "Name", exportValue: (r) => r.name },
      { key: "team", header: "Team", exportValue: (r) => r.team },
    ];
    const text = clipboardRangeText({
      range: range([0, 0], [0, 1]),
      rows,
      columns,
    });
    expect(text).toBe('"a\tb"\t"c\nd"');
  });

  it("offsets the rectangle by where the page starts", () => {
    // Cell navigation numbers rows within the DATASET; row 5 of page 3 is
    // rows[0] here. Getting it wrong copies the wrong people.
    const text = clipboardRangeText({
      range: range([5, 0], [5, 0]),
      rows: [ROWS[2]!],
      columns: COLUMNS,
      firstRowIndex: 5,
    });
    expect(text).toBe("Grace");
  });

  it("skips rows the browser does not hold rather than pasting blanks", () => {
    const text = clipboardRangeText({
      range: range([2, 0], [9, 0]),
      rows: ROWS,
      columns: COLUMNS,
    });
    expect(text).toBe("Grace");
  });

  it("prefers a column's exportValue, so a copy matches the file", () => {
    const columns: ColumnModel<Row>[] = [
      {
        key: "budget",
        header: "Budget",
        formatValue: (r: (typeof ROWS)[number]) => `$${r.budget}`,
        exportValue: (r: (typeof ROWS)[number]) => r.budget,
      },
    ];
    const text = clipboardRangeText({
      range: range([0, 0], [0, 0]),
      rows: ROWS,
      columns,
    });
    expect(text).toBe("1240");
  });

  it("copies an empty field when exportValue is not a primitive", () => {
    const text = clipboardRangeText({
      range: range([0, 0], [0, 0]),
      rows: ROWS,
      columns: [
        {
          key: "name",
          header: "Name",
          formatValue: (row: (typeof ROWS)[number]) => row.name,
          exportValue: () => ({ nested: 1 }),
        },
      ],
    });
    expect(text).toBe("");
  });

  it("writes nothing when the range names no rendered column", () => {
    expect(
      clipboardRangeText({
        range: range([0, 9], [0, 9]),
        rows: ROWS,
        columns: COLUMNS,
      })
    ).toBe("");
  });
});

describe("writeClipboardText", () => {
  it("reports success when the clipboard accepts the text", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await expect(writeClipboardText("a\tb")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("a\tb");
    vi.unstubAllGlobals();
  });

  it("reports failure rather than throwing when permission is refused", async () => {
    // A copy that silently did nothing is the thing worth avoiding: the caller
    // has to be able to say so.
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    await expect(writeClipboardText("x")).resolves.toBe(false);
    vi.unstubAllGlobals();
  });

  it("reports failure where there is no clipboard at all", async () => {
    vi.stubGlobal("navigator", {});
    await expect(writeClipboardText("x")).resolves.toBe(false);
    vi.unstubAllGlobals();
  });
});
