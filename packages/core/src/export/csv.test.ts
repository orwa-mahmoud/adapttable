import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../types";
import * as env from "../utils/env";
import { downloadCsv, rowsToCsv } from "./csv";

interface Row {
  id: string;
  name: string;
  amount: number;
}

const ROWS: Row[] = [
  { id: "a", name: "Alice", amount: 1200 },
  { id: "b", name: 'Bob "the builder", Jr.', amount: 7 },
];

const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
  { key: "amount", header: "Amount", accessor: (r) => r.amount },
];

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
    const cols: ColumnDef<Row>[] = [
      {
        key: "rich",
        header: "Rich",
        accessor: (r) => ({ jsx: r.name }) as unknown as string,
        sortValue: (r) => r.amount,
      },
      { key: "cellOnly", header: "Cell only" },
    ];
    const csv = rowsToCsv([ROWS[0]!], cols);
    expect(csv.split("\r\n")[1]).toBe("1200,");
  });

  it("neutralises every dangerous formula prefix by default", () => {
    const cols: ColumnDef<{ v: string }>[] = [
      { key: "v", header: "V", accessor: (r) => r.v },
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
    const cols: ColumnDef<{ v: string }>[] = [
      { key: "v", header: "V", accessor: (r) => r.v },
    ];
    const payload = '=HYPERLINK("http://evil.test","click")';
    const line = rowsToCsv([{ v: payload }], cols).split("\r\n")[1]!;
    expect(line).toBe(`"'=HYPERLINK(""http://evil.test"",""click"")"`);
  });

  it("never touches numeric cells (negative numbers stay numbers)", () => {
    const cols: ColumnDef<Row>[] = [
      { key: "amount", header: "Amount", accessor: (r) => -r.amount },
    ];
    const csv = rowsToCsv([ROWS[0]!], cols);
    expect(csv.split("\r\n")[1]).toBe("-1200");
  });

  it("escapeFormulas: false emits raw cells for machine consumers", () => {
    const cols: ColumnDef<{ v: string }>[] = [
      { key: "v", header: "V", accessor: (r) => r.v },
    ];
    const csv = rowsToCsv([{ v: "=1+2" }], cols, { escapeFormulas: false });
    expect(csv.split("\r\n")[1]).toBe("=1+2");
  });

  it("uses non-string headers' keys and a custom delimiter/getValue", () => {
    const cols: ColumnDef<Row>[] = [{ key: "k", header: 1 as never }];
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
  it("stringifies booleans and blanks objects (never [object Object])", () => {
    const cols: ColumnDef<Row>[] = [{ key: "k", header: "K" }];
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
