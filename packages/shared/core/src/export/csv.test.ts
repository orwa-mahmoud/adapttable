import { describe, expect, it, vi } from "vitest";

import type { ColumnModel } from "../columnModel";
import * as env from "../utils/env";
import { downloadCsv, matrixToCsv, rowsToCsv } from "./csv";

interface Row {
  id: string;
  name: string;
  amount: number;
}

const ROWS: Row[] = [
  { id: "a", name: "Alice", amount: 1200 },
  { id: "b", name: 'Bob "the builder", Jr.', amount: 7 },
];

const COLS: ColumnModel<Row>[] = [
  { key: "name", header: "Name", exportValue: (r) => r.name },
  { key: "amount", header: "Amount", exportValue: (r) => r.amount },
];

describe("rowsToCsv cell resolution", () => {
  it("reads a column that only declares an accessor", () => {
    const columns: ColumnModel<Row>[] = [
      { key: "name", header: "Name", accessor: (r) => r.name },
      { key: "amount", header: "Amount", accessor: (r) => r.amount },
    ];
    const csv = rowsToCsv(ROWS, columns);
    expect(csv.split("\r\n")[1]).toBe("Alice,1200");
  });

  it("prefers exportValue, then the accessor, then sortValue", () => {
    const both: ColumnModel<Row>[] = [
      {
        key: "name",
        header: "Name",
        exportValue: () => "from-export",
        accessor: () => "from-accessor",
        sortValue: () => "from-sort",
      },
    ];
    expect(rowsToCsv([ROWS[0]!], both).split("\r\n")[1]).toBe("from-export");

    const accessorFirst: ColumnModel<Row>[] = [
      {
        key: "name",
        header: "Name",
        accessor: () => "from-accessor",
        sortValue: () => "from-sort",
      },
    ];
    expect(rowsToCsv([ROWS[0]!], accessorFirst).split("\r\n")[1]).toBe(
      "from-accessor"
    );
  });

  it("falls through to sortValue when a binding drew the cell instead", () => {
    // A React accessor returning an element is not data — the export keeps
    // looking rather than writing "[object Object]" into the file.
    const drawn: ColumnModel<Row>[] = [
      {
        key: "name",
        header: "Name",
        accessor: () => ({ type: "span", props: {} }),
        sortValue: (r) => r.name,
      },
    ];
    expect(rowsToCsv([ROWS[0]!], drawn).split("\r\n")[1]).toBe("Alice");
  });
});

describe("rowsToCsv", () => {
  it("emits a header row from string headers and resolves accessors", () => {
    const csv = rowsToCsv(ROWS, COLS);
    const [head, first] = csv.split("\r\n");
    expect(head).toBe("Name,Amount");
    expect(first).toBe("Alice,1200");
  });

  it("quotes delimiters, quotes, and newlines per RFC 4180", () => {
    const csv = rowsToCsv(ROWS, COLS);
    expect(csv).toContain('"Bob ""the builder"", Jr."');
    const multiline = rowsToCsv(
      [{ id: "c", name: "line1\nline2", amount: 0 }],
      COLS
    );
    expect(multiline).toContain('"line1\nline2"');
  });

  it("falls back to sortValue for JSX cells, else empty", () => {
    const cols: ColumnModel<Row>[] = [
      {
        key: "rich",
        header: "Rich",
        exportValue: (r) => ({ jsx: r.name }),
        sortValue: (r) => r.amount,
      },
      { key: "cellOnly", header: "Cell only" },
    ];
    const csv = rowsToCsv([ROWS[0]!], cols);
    expect(csv.split("\r\n")[1]).toBe("1200,");
  });

  it("neutralises every dangerous formula prefix by default", () => {
    const cols: ColumnModel<{ v: string }>[] = [
      { key: "v", header: "V", exportValue: (r) => r.v },
    ];
    for (const payload of [
      "=1+2",
      "+SUM(A1:A9)",
      "-2+3",
      "@cmd",
      "\tleading-tab",
      "\rleading-cr",
    ]) {
      const line = rowsToCsv([{ v: payload }], cols).split("\r\n")[1]!;
      // The cell now starts with a quote-as-text apostrophe (possibly
      // inside RFC-4180 quoting when the payload needed wrapping).
      const cell = line.startsWith('"')
        ? line.slice(1, -1).replaceAll('""', '"')
        : line;
      expect(cell).toBe(`'${payload}`);
    }
  });

  it("a HYPERLINK formula round-trips as text, not a formula", () => {
    const cols: ColumnModel<{ v: string }>[] = [
      { key: "v", header: "V", exportValue: (r) => r.v },
    ];
    const payload = '=HYPERLINK("http://evil.test","click")';
    const line = rowsToCsv([{ v: payload }], cols).split("\r\n")[1]!;
    expect(line).toBe(`"'=HYPERLINK(""http://evil.test"",""click"")"`);
  });

  it("never touches numeric cells (negative numbers stay numbers)", () => {
    const cols: ColumnModel<Row>[] = [
      { key: "amount", header: "Amount", exportValue: (r) => -r.amount },
    ];
    const csv = rowsToCsv([ROWS[0]!], cols);
    expect(csv.split("\r\n")[1]).toBe("-1200");
  });

  it("escapeFormulas: false emits raw cells for machine consumers", () => {
    const cols: ColumnModel<{ v: string }>[] = [
      { key: "v", header: "V", exportValue: (r) => r.v },
    ];
    const csv = rowsToCsv([{ v: "=1+2" }], cols, { escapeFormulas: false });
    expect(csv.split("\r\n")[1]).toBe("=1+2");
  });

  it("uses non-string headers' keys and a custom delimiter/getValue", () => {
    const cols: ColumnModel<Row>[] = [{ key: "k", header: 1 as never }];
    const csv = rowsToCsv([ROWS[0]!], cols, {
      delimiter: ";",
      getValue: (row) => row.id,
    });
    expect(csv).toBe("k\r\na");
  });
});

describe("downloadCsv", () => {
  it("creates and clicks a download link in the browser", () => {
    const createObjectURL = vi.fn(() => "blob:x");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    downloadCsv("people.csv", "Name\r\nAlice");
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:x");
    vi.unstubAllGlobals();
    click.mockRestore();
  });
});

describe("cell value edge cases", () => {
  it("writes a Date as its ISO day", () => {
    // `rowsToCsv` resolves through `accessor` / `sortValue`, and neither can
    // carry a Date by type — a typed value reaches a file through the writer,
    // which is what hands a matrix down to here.
    const due = new Date("2026-08-15T13:45:00.000Z");
    const csv = matrixToCsv({ headers: ["Due"], rows: [[due]] });
    expect(csv.split("\r\n")[1]).toBe("2026-08-15");
  });

  it("stringifies booleans and blanks objects (never [object Object])", () => {
    const cols: ColumnModel<Row>[] = [{ key: "k", header: "K" }];
    const csv = rowsToCsv([ROWS[0]!], cols, {
      getValue: () => true,
    });
    expect(csv.split("\r\n")[1]).toBe("true");
    const objCsv = rowsToCsv([ROWS[0]!], cols, {
      getValue: () => ({ nested: 1 }),
    });
    expect(objCsv.split("\r\n")[1]).toBe("");
  });
});

describe("downloadCsv under SSR", () => {
  it("is a no-op without a browser", () => {
    const spy = vi.spyOn(env, "isBrowser").mockReturnValue(false);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    downloadCsv("x.csv", "a");
    expect(click).not.toHaveBeenCalled();
    spy.mockRestore();
    click.mockRestore();
  });
});
