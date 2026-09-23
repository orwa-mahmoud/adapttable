/**
 * The spreadsheet writer, read back out of the workbook it produces.
 *
 * Entries are stored rather than deflated, so the sheet XML is legible inside
 * the bytes and can be asserted directly. What matters is the typing: a value
 * arrives in the cell as what it IS, because a number turned into text cannot
 * be summed and a postal code turned into a number cannot be recovered.
 */
import { describe, expect, it } from "vitest";

import type { ColumnMetadata } from "../columnModel";
import type { ExportTable } from "./exportWriter";
import {
  buildTableXlsx,
  columnLetter,
  safeSheetName,
  xlsxWriter,
} from "./xlsx";

interface Row {
  id: string;
  name: string;
  zip: string;
  salary: number;
  active: boolean;
  joined: Date;
}

const ROWS: Row[] = [
  {
    id: "1",
    name: "Ada <Lovelace> & co",
    zip: "01730",
    salary: 1200.5,
    active: true,
    joined: new Date(Date.UTC(2026, 0, 15)),
  },
];

const COLUMNS: ColumnMetadata<Row>[] = [
  { key: "name", header: "Name", exportValue: (row) => row.name },
  { key: "zip", header: "ZIP", exportValue: (row) => row.zip },
  { key: "salary", header: "Salary", exportValue: (row) => row.salary },
  { key: "active", header: "Active", exportValue: (row) => row.active },
  { key: "joined", header: "Joined", exportValue: (row) => row.joined },
];

/** The stored entries are plain bytes, so the XML reads straight out. */
function textOf(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

describe("columnLetter", () => {
  it("counts in spreadsheet columns, past the first alphabet", () => {
    expect(columnLetter(0)).toBe("A");
    expect(columnLetter(25)).toBe("Z");
    expect(columnLetter(26)).toBe("AA");
    expect(columnLetter(27)).toBe("AB");
    expect(columnLetter(701)).toBe("ZZ");
    expect(columnLetter(702)).toBe("AAA");
  });
});

describe("safeSheetName", () => {
  it("drops the characters Excel refuses and keeps the name inside 31", () => {
    expect(safeSheetName("Q1: profit/loss [draft]")).toBe(
      "Q1  profit loss  draft"
    );
    expect(safeSheetName("   ")).toBe("Sheet1");
    expect(safeSheetName("x".repeat(50))).toHaveLength(31);
  });
});

describe("buildTableXlsx", () => {
  const sheet = textOf(buildTableXlsx({ rows: ROWS, columns: COLUMNS }));

  it("writes a workbook whose parts a reader expects", () => {
    for (const name of [
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/workbook.xml",
      "xl/styles.xml",
      "xl/worksheets/sheet1.xml",
    ]) {
      expect(sheet).toContain(name);
    }
  });

  it("keeps a number a number and a numeric-looking string a string", () => {
    expect(sheet).toContain("<v>1200.5</v>");
    expect(sheet).toContain('t="inlineStr"><is><t xml:space="preserve">01730');
  });

  it("keeps a boolean a boolean", () => {
    expect(sheet).toContain('t="b"><v>1</v>');
  });

  it("keeps a date a date, as an Excel serial", () => {
    // 2026-01-15 is 46037 days after the 1899-12-30 epoch.
    expect(sheet).toContain("<v>46037</v>");
  });

  it("escapes markup rather than letting it reach the reader as XML", () => {
    expect(sheet).toContain("Ada &lt;Lovelace&gt; &amp; co");
    expect(sheet).not.toContain("<Lovelace>");
  });

  it("names the sheet, defaulting to Sheet1", () => {
    expect(sheet).toContain("Sheet1");
    const named = textOf(
      buildTableXlsx({ rows: ROWS, columns: COLUMNS, sheetName: "Payroll" })
    );
    expect(named).toContain("Payroll");
  });

  it("writes an empty cell rather than an empty string", () => {
    const blanks = textOf(
      buildTableXlsx({
        rows: [{ id: "1" } as Row],
        columns: [{ key: "name", header: "Name", exportValue: () => "" }],
      })
    );
    expect(blanks).toContain('<c r="A2"/>');
  });

  it("carries a grouped view's outline levels and bolds its group rows", () => {
    const grouped = textOf(
      buildTableXlsx({
        rows: ROWS,
        columns: COLUMNS,
        view: [
          { kind: "group", label: "ops", level: 0, row: undefined },
          { kind: "row", row: ROWS[0]!, level: 1 },
        ] as never,
      })
    );
    expect(grouped).toContain('outlineLevel="1"');
    expect(grouped).toContain('outlineLevelRow="1"');
  });
});

describe("xlsxWriter", () => {
  const table: ExportTable = {
    headers: ["Name", "Salary"],
    keys: ["name", "salary"],
    rows: [["Ada", 1200.5]],
    widths: [20, undefined],
  };

  it("declares the extension and MIME type a browser saves it under", () => {
    const writer = xlsxWriter();
    expect(writer.extension).toBe("xlsx");
    const built = writer.build({ table } as never);
    expect(built.mimeType).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    // Binary: the bytes are the file, so there is no text form of them.
    expect(built.text).toBe("");
    expect(built.parts[0]).toBeInstanceOf(Uint8Array);
  });

  it("carries a declared column width into the sheet", () => {
    const built = xlsxWriter({ sheetName: "Report" }).build({ table } as never);
    const sheet = textOf(built.parts[0] as Uint8Array);
    expect(sheet).toContain("<cols>");
    expect(sheet).toContain("Report");
  });
});

describe("text XML cannot carry", () => {
  /** The worksheet part, parsed as XML the way a spreadsheet reader does. */
  function parsedSheet(bytes: Uint8Array): Document {
    const sheet = /<worksheet[\s\S]*?<\/worksheet>/.exec(textOf(bytes))?.[0];
    expect(sheet).toBeDefined();
    return new DOMParser().parseFromString(sheet!, "application/xml");
  }

  it("drops U+FFFE, U+FFFF and lone surrogates, so the sheet parses", () => {
    const bytes = buildTableXlsx({
      rows: [{ id: "1", text: "a￾b￿c\uD800d" }],
      columns: [
        { key: "text", header: "Text", exportValue: (row) => row.text },
      ],
    });
    const sheet = parsedSheet(bytes);

    expect(sheet.getElementsByTagName("parsererror")).toHaveLength(0);
    expect(sheet.getElementsByTagName("t")[1]?.textContent).toBe("abcd");
  });

  it("keeps Arabic, emoji, tabs and line breaks", () => {
    const text = "مرحبا 🙂\tone\ntwo\r";
    const bytes = buildTableXlsx({
      rows: [{ id: "1", text }],
      columns: [
        { key: "text", header: "Text", exportValue: (row) => row.text },
      ],
    });
    const sheet = parsedSheet(bytes);

    expect(sheet.getElementsByTagName("parsererror")).toHaveLength(0);
    // A parser reads a carriage return back as a line feed, as XML requires;
    // the written sheet still carries it.
    expect(sheet.getElementsByTagName("t")[1]?.textContent).toBe(
      text.replace("\r", "\n")
    );
    expect(textOf(bytes)).toContain(text);
  });

  it("cuts a long sheet name without splitting an emoji", () => {
    const name = `${"x".repeat(30)}🙂`;
    const safe = safeSheetName(name);
    expect(safe).toBe("x".repeat(30));
    expect(safeSheetName("tab￾name")).toBe("tabname");
  });
});
