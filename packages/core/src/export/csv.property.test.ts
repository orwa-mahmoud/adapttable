import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { matrixToCsv } from "./csv";

function flushCell(
  row: string[],
  cell: string
): { row: string[]; cell: string } {
  row.push(cell);
  return { row, cell: "" };
}

function flushRow(
  rows: string[][],
  row: string[],
  cell: string
): { rows: string[][]; row: string[]; cell: string } {
  const flushed = flushCell(row, cell);
  rows.push(flushed.row);
  return { rows, row: [], cell: "" };
}

/** RFC-4180 reader used only to invert {@link matrixToCsv}. */
function parseCsv(text: string, delimiter: string): string[][] {
  let rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    const next = text[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      ({ row, cell } = flushCell(row, cell));
    } else if (ch === "\r" && next === "\n") {
      ({ rows, row, cell } = flushRow(rows, row, cell));
      i += 1;
    } else {
      cell += ch;
    }
  }
  return flushRow(rows, row, cell).rows;
}

const cellArb = fc.string({ maxLength: 24 });
const delimArb = fc.constantFrom(",", ";", "\t");

describe("CSV escaping — properties", () => {
  it("round-trips string cells through RFC-4180 quoting", () => {
    fc.assert(
      fc.property(
        fc.array(cellArb, { minLength: 1, maxLength: 4 }),
        fc.array(fc.array(cellArb, { minLength: 1, maxLength: 4 }), {
          minLength: 0,
          maxLength: 6,
        }),
        delimArb,
        (headers, rows, delimiter) => {
          const width = headers.length;
          const body = rows.map((row) =>
            Array.from({ length: width }, (_, i) => row[i] ?? "")
          );
          const csv = matrixToCsv(
            { headers, rows: body },
            { delimiter, escapeFormulas: false }
          );
          expect(parseCsv(csv, delimiter)).toEqual([headers, ...body]);
        }
      )
    );
  });

  it("prefixes spreadsheet-formula strings and leaves numbers alone", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("=", "+", "-", "@", "\t", "\r"),
        fc.string({ maxLength: 12 }),
        fc.integer({ min: -20, max: 20 }).filter((n) => n !== 0),
        (prefix, rest, amount) => {
          const payload = `${prefix}${rest}`;
          const csv = matrixToCsv({
            headers: ["V", "N"],
            rows: [[payload, amount]],
          });
          const [, line] = parseCsv(csv, ",");
          expect(line?.[0]).toBe(`'${payload}`);
          expect(line?.[1]).toBe(String(amount));
        }
      )
    );
  });
});
