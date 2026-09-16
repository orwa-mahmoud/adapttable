/**
 * The spreadsheet writer.
 *
 * Two things are being checked: that the archive contains the five documents
 * Excel requires under the exact names it looks for, and that values keep their
 * type. The second is where hand-rolled exporters usually fail — a postal code
 * arriving as a number is a data-loss bug the user cannot undo.
 */

import {
  buildExportTable,
  buildTableXlsx,
  columnLetter,
  safeSheetName,
  xlsxWriter,
} from "@adapttable/core";
import { describe, expect, it } from "vitest";

import type { ColumnDef } from "../columnDef";

interface Row {
  name: string;
  age: number;
  zip: string;
  active: boolean;
}

const ROWS: Row[] = [
  { name: "Ada", age: 36, zip: "01730", active: true },
  { name: "Grace <&>", age: 45, zip: "02139", active: false },
];

const COLUMNS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
  { key: "age", header: "Age", accessor: (row) => row.age },
  { key: "zip", header: "Zip", accessor: (row) => row.zip },
  { key: "active", header: "Active", accessor: (row) => row.active },
];

/** Read a little-endian unsigned integer — every ZIP field is one. */
function readInt(bytes: Uint8Array, offset: number, size: number): number {
  let value = 0;
  for (let i = size - 1; i >= 0; i--) {
    value = value * 256 + bytes[offset + i]!;
  }
  return value;
}

/**
 * Unpack the archive by walking its local headers. Entries are stored, so the
 * bytes between the headers are the documents themselves.
 */
function unzip(zip: Uint8Array): Map<string, string> {
  const decoder = new TextDecoder();
  const files = new Map<string, string>();
  let at = 0;
  while (readInt(zip, at, 4) === 0x04034b50) {
    const size = readInt(zip, at + 18, 4);
    const nameLength = readInt(zip, at + 26, 2);
    const extraLength = readInt(zip, at + 28, 2);
    const name = decoder.decode(zip.slice(at + 30, at + 30 + nameLength));
    const start = at + 30 + nameLength + extraLength;
    files.set(name, decoder.decode(zip.slice(start, start + size)));
    at = start + size;
  }
  return files;
}

const sheetOf = (rows: Row[] = ROWS, columns = COLUMNS) =>
  unzip(buildTableXlsx({ rows, columns })).get("xl/worksheets/sheet1.xml") ??
  "";

describe("buildTableXlsx", () => {
  it("contains the five documents a workbook is made of", () => {
    expect([
      ...unzip(buildTableXlsx({ rows: ROWS, columns: COLUMNS })).keys(),
    ]).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/workbook.xml",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/worksheets/sheet1.xml",
    ]);
  });

  it("declares the sheet in both the content types and the relationships", () => {
    // A part present in the archive but missing from either index is invisible
    // to Excel, which reports the whole file as corrupt rather than that part.
    const files = unzip(buildTableXlsx({ rows: ROWS, columns: COLUMNS }));
    expect(files.get("[Content_Types].xml")).toContain(
      'PartName="/xl/worksheets/sheet1.xml"'
    );
    expect(files.get("xl/_rels/workbook.xml.rels")).toContain(
      'Target="worksheets/sheet1.xml"'
    );
    expect(files.get("xl/workbook.xml")).toContain('r:id="rId1"');
    expect(files.get("[Content_Types].xml")).toContain(
      'PartName="/xl/styles.xml"'
    );
    expect(files.get("xl/_rels/workbook.xml.rels")).toContain(
      'Target="styles.xml"'
    );
  });

  it("writes a header row from the column headers", () => {
    expect(sheetOf()).toContain(
      '<row r="1"><c r="A1" s="1" t="inlineStr"><is><t xml:space="preserve">Name</t></is></c>'
    );
  });

  it("falls back to a column's key when its header is not text", () => {
    const sheet = sheetOf(ROWS, [
      { key: "name", header: <b>Name</b>, accessor: (row) => row.name },
    ]);
    expect(sheet).toContain(">name</t>");
  });

  it("keeps numbers numeric so the spreadsheet can sum them", () => {
    expect(sheetOf()).toContain('<c r="B2"><v>36</v></c>');
  });

  it("keeps text that looks numeric as text", () => {
    // "01730" is a zip code. Parsing it to 1730 is the classic export bug.
    expect(sheetOf()).toContain(
      '<c r="C2" t="inlineStr"><is><t xml:space="preserve">01730</t></is></c>'
    );
  });

  it("writes booleans as booleans", () => {
    const sheet = sheetOf();
    expect(sheet).toContain('<c r="D2" t="b"><v>1</v></c>');
    expect(sheet).toContain('<c r="D3" t="b"><v>0</v></c>');
  });

  it("escapes XML rather than producing a broken document", () => {
    expect(sheetOf()).toContain("Grace &lt;&amp;&gt;");
  });

  it("writes an empty cell as an empty cell", () => {
    const sheet = sheetOf([{ name: "", age: 1, zip: "", active: false }]);
    expect(sheet).toContain('<c r="A2"/>');
  });

  it("drops control characters that would make the file unopenable", () => {
    const sheet = sheetOf([
      { name: "a\u0001b", age: 1, zip: "", active: false },
    ]);
    expect(sheet).toContain(">ab</t>");
  });

  it("writes an empty cell for a value that is not a primitive", () => {
    // A JSX cell with an `exportValue` that returns nothing lands here; the
    // alternative is the string "[object Object]" in someone's spreadsheet.
    const sheet = sheetOf(ROWS, [
      { key: "name", header: "Name", exportValue: () => null },
    ]);
    expect(sheet).toContain('<c r="A2"/>');
  });

  it("prefers a column's exportValue, exactly as CSV does", () => {
    const sheet = sheetOf(ROWS, [
      {
        key: "name",
        header: "Name",
        accessor: (row) => row.name,
        exportValue: (row) => `${row.name} (exported)`,
      },
    ]);
    expect(sheet).toContain("Ada (exported)");
  });

  it("names the sheet, correcting what Excel would reject", () => {
    const files = unzip(
      buildTableXlsx({
        rows: ROWS,
        columns: COLUMNS,
        sheetName: "Q1/Q2 [draft]",
      })
    );
    expect(files.get("xl/workbook.xml")).toContain('name="Q1 Q2  draft"');
  });

  it("writes a date-and-time as an Excel serial with the datetime style", () => {
    const due = new Date("2026-08-15T13:45:00.000Z");
    const sheet = unzip(
      buildTableXlsx({
        rows: [{ due }],
        columns: [
          {
            key: "due",
            header: "Due",
            exportValue: (row: { due: Date }) => row.due,
          },
        ],
      })
    ).get("xl/worksheets/sheet1.xml");
    const serial = (due.getTime() - Date.UTC(1899, 11, 30)) / 86_400_000;
    expect(sheet).toContain(`<c r="A2" s="3"><v>${String(serial)}</v></c>`);
  });

  it("writes a Date as an Excel serial with a date style", () => {
    const due = new Date("2026-08-15T00:00:00.000Z");
    const sheet = unzip(
      buildTableXlsx({
        rows: [{ name: "Ada", age: 1, zip: "", active: true, due }],
        columns: [
          {
            key: "due",
            header: "Due",
            exportValue: (row: { due: Date }) => row.due,
          },
        ],
      })
    ).get("xl/worksheets/sheet1.xml");
    const serial = (due.getTime() - Date.UTC(1899, 11, 30)) / 86_400_000;
    expect(sheet).toContain(`<c r="A2" s="2"><v>${String(serial)}</v></c>`);
  });

  it("types a Date the accessor returned, without exportValue", () => {
    const due = new Date("2026-08-15T00:00:00.000Z");
    const sheet = unzip(
      buildTableXlsx({
        rows: [{ due }],
        columns: [
          {
            key: "when",
            header: "When",
            exportValue: (row: { due: Date }) => row.due,
          },
        ],
      })
    ).get("xl/worksheets/sheet1.xml");
    const serial = (due.getTime() - Date.UTC(1899, 11, 30)) / 86_400_000;
    expect(sheet).toContain(`<c r="A2" s="2"><v>${String(serial)}</v></c>`);
  });

  it("writes a local midnight Date as a day, not a clock time", () => {
    const due = new Date(2026, 7, 15);
    const sheet = unzip(
      buildTableXlsx({
        rows: [{ due }],
        columns: [
          {
            key: "due",
            header: "Due",
            exportValue: (row: { due: Date }) => row.due,
          },
        ],
      })
    ).get("xl/worksheets/sheet1.xml");
    expect(sheet).toContain('s="2"');
    expect(sheet).not.toContain('s="3"');
  });

  it("writes an invalid Date as an empty cell, not a NaN serial", () => {
    const sheet = unzip(
      buildTableXlsx({
        rows: [{ due: new Date(Number.NaN) }],
        columns: [
          {
            key: "due",
            header: "Due",
            exportValue: (row: { due: Date }) => row.due,
          },
        ],
      })
    ).get("xl/worksheets/sheet1.xml");
    expect(sheet).toContain('<c r="A2"/>');
    expect(sheet).not.toContain("NaN");
  });

  it("writes NaN and Infinity as empty cells, not numbers a sheet would sum", () => {
    const sheet = unzip(
      buildTableXlsx({
        rows: [{ n: Number.NaN }, { n: Number.POSITIVE_INFINITY }],
        columns: [
          {
            key: "n",
            header: "N",
            exportValue: (row: { n: number }) => row.n,
          },
        ],
      })
    ).get("xl/worksheets/sheet1.xml");
    expect(sheet).toContain('<c r="A2"/>');
    expect(sheet).toContain('<c r="A3"/>');
    expect(sheet).not.toContain("Infinity");
    expect(sheet).not.toContain("NaN");
  });

  it("writes a leading-equals string as text, never a formula element", () => {
    const sheet = sheetOf(
      [{ name: "=CMD()", age: 1, zip: "", active: false }],
      [{ key: "name", header: "Name", accessor: (row) => row.name }]
    );
    expect(sheet).toContain("=CMD()");
    expect(sheet).not.toContain("<f>");
  });

  it("freezes the header and sizes columns", () => {
    const sheet = sheetOf();
    expect(sheet).toContain('state="frozen"');
    expect(sheet).toContain("<cols>");
    expect(sheet).toContain('customWidth="1"');
  });

  it("ships date formats and a header fill in the stylesheet", () => {
    const styles = unzip(buildTableXlsx({ rows: ROWS, columns: COLUMNS })).get(
      "xl/styles.xml"
    );
    expect(styles).toContain('formatCode="yyyy-mm-dd"');
    expect(styles).toContain('formatCode="yyyy-mm-dd hh:mm"');
    expect(styles).toContain('patternType="solid"');
    expect(styles).toContain('fillId="2"');
    expect(styles).toContain('applyFill="1"');
  });

  it("records the deepest outline level on the sheet", () => {
    const sheet = unzip(
      buildTableXlsx({
        rows: ROWS,
        columns: COLUMNS,
        view: [
          { role: "group", label: "Core", level: 0, labelKey: "name" },
          { role: "data", row: ROWS[0]!, level: 1 },
        ],
      })
    ).get("xl/worksheets/sheet1.xml");
    expect(sheet).toContain('outlineLevelRow="1"');
    expect(sheet).toContain('summaryBelow="0"');
  });

  it("outlines a tree row at its depth", () => {
    const sheet = unzip(
      buildTableXlsx({
        rows: ROWS,
        columns: COLUMNS,
        view: [
          { role: "data", row: ROWS[0]!, level: 0 },
          { role: "data", row: ROWS[1]!, level: 2 },
        ],
      })
    ).get("xl/worksheets/sheet1.xml");
    expect(sheet).toContain('outlineLevel="2"');
    expect(sheet).toContain('outlineLevelRow="2"');
  });

  it("outlines group leaves and bolds headers and totals", () => {
    const sheet = unzip(
      buildTableXlsx({
        rows: ROWS,
        columns: COLUMNS,
        view: [
          { role: "group", label: "Core", level: 0, labelKey: "name" },
          { role: "data", row: ROWS[0]!, level: 1 },
          {
            role: "aggregate",
            label: "Core total",
            level: 0,
            labelKey: "name",
            values: { age: 36 },
          },
        ],
      })
    ).get("xl/worksheets/sheet1.xml");
    expect(sheet).toContain('outlineLevel="1"');
    expect(sheet).toContain("Core");
    expect(sheet).toContain("Core total");
    expect(sheet).toContain('s="1"');
    expect(sheet).toContain("<v>36</v>");
  });

  it("appends a grand-total row from summary values", () => {
    const sheet = unzip(
      buildTableXlsx({
        rows: ROWS,
        columns: COLUMNS,
        summary: { age: 81 },
      })
    ).get("xl/worksheets/sheet1.xml");
    expect(sheet).toContain("<v>81</v>");
  });

  it("exports the same bytes for the same table twice", () => {
    expect(buildTableXlsx({ rows: ROWS, columns: COLUMNS })).toEqual(
      buildTableXlsx({ rows: ROWS, columns: COLUMNS })
    );
  });
});

describe("columnLetter", () => {
  it("counts in base-26 with no zero digit", () => {
    // The off-by-one here is why column 26 becomes "BA" in naive writers.
    expect([0, 1, 25, 26, 27, 51, 52, 701, 702].map(columnLetter)).toEqual([
      "A",
      "B",
      "Z",
      "AA",
      "AB",
      "AZ",
      "BA",
      "ZZ",
      "AAA",
    ]);
  });
});

describe("safeSheetName", () => {
  it("replaces the characters Excel forbids", () => {
    expect(safeSheetName("a:b\\c/d?e*f[g]h")).toBe("a b c d e f g h");
  });

  it("truncates to the 31 characters Excel allows", () => {
    expect(safeSheetName("x".repeat(40))).toHaveLength(31);
  });

  it("falls back rather than writing a nameless sheet", () => {
    expect(safeSheetName("  ")).toBe("Sheet1");
  });
});

describe("xlsxWriter", () => {
  it("names itself so the download gets the right extension", () => {
    expect(xlsxWriter().extension).toBe("xlsx");
  });

  it("builds a spreadsheet payload with no text form", () => {
    const payload = xlsxWriter().build({
      table: buildExportTable(ROWS, COLUMNS),
      filename: "people.xlsx",
    });
    expect(payload.mimeType).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(payload.text).toBe("");
    expect(payload.parts).toHaveLength(1);
  });

  it("passes the sheet name through to the workbook", () => {
    const payload = xlsxWriter({ sheetName: "People" }).build({
      table: buildExportTable(ROWS, COLUMNS),
      filename: "people.xlsx",
    });
    const [part] = payload.parts;
    expect(part).toBeInstanceOf(Uint8Array);
    const bytes = part instanceof Uint8Array ? part : new Uint8Array();
    expect(unzip(bytes).get("xl/workbook.xml")).toContain('name="People"');
  });
});

/**
 * One workbook carrying every part of the feature at once — styles, a frozen
 * header, outline levels, typed dates and a group total — so a regression in
 * how they combine shows up here even when each part still passes alone.
 */
describe("a complete workbook", () => {
  it("carries styling, freeze, outline, typed cells and totals together", () => {
    const joined = new Date(2026, 7, 15);
    const due = new Date("2026-08-15T13:45:00.000Z");
    const ada = {
      name: "Ada",
      age: 36,
      joined,
      active: true,
      budget: 10,
    };
    const grace = {
      name: "Grace",
      age: 45,
      joined: due,
      active: false,
      budget: 20,
    };
    const bytes = buildTableXlsx({
      rows: [ada, grace],
      columns: [
        {
          key: "name",
          header: "Name",
          accessor: (row: typeof ada) => row.name,
          width: 160,
        },
        {
          key: "age",
          header: "Age",
          accessor: (row: typeof ada) => row.age,
          width: 80,
        },
        {
          key: "joined",
          header: "Joined",
          exportValue: (row: typeof ada) => row.joined,
          width: 140,
        },
        {
          key: "active",
          header: "Active",
          accessor: (row: typeof ada) => row.active,
        },
        {
          key: "budget",
          header: "Budget",
          accessor: (row: typeof ada) => row.budget,
        },
      ] as ColumnDef<typeof ada>[],
      sheetName: "People",
      view: [
        {
          role: "group",
          label: "Core",
          level: 0,
          labelKey: "name",
          values: { budget: 30 },
        },
        { role: "data", row: ada, level: 1 },
        { role: "data", row: grace, level: 1 },
        {
          role: "aggregate",
          label: "Core total",
          level: 0,
          labelKey: "name",
          values: { budget: 30 },
        },
      ],
      summary: { name: "All", budget: 30 },
    });
    const files = unzip(bytes);
    const sheet = files.get("xl/worksheets/sheet1.xml") ?? "";
    const styles = files.get("xl/styles.xml") ?? "";
    const workbook = files.get("xl/workbook.xml") ?? "";
    expect(workbook).toContain('name="People"');
    expect(styles).toContain('patternType="solid"');
    expect(styles).toContain("yyyy-mm-dd");
    expect(sheet).toContain('state="frozen"');
    expect(sheet).toContain('outlineLevel="1"');
    expect(sheet).toContain("Core total");
    expect(sheet).toContain("<v>30</v>");
    expect(sheet).toContain('s="2"');
    expect(sheet).toContain('s="3"');
    expect(sheet).toContain('t="b"');
    expect(bytes.byteLength).toBeGreaterThan(1000);
  });
});
