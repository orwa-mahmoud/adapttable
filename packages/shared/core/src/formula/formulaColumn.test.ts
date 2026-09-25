/**
 * What a binding renders a formula cell from.
 *
 * A formula column's key names no field on the row — `cost` is a derivation,
 * not a property — so the column has to carry the value itself. A binding that
 * finds no `accessor` falls back to reading the row by the column key, which
 * for a formula column is always nothing, and every cell in it draws empty.
 */
import { describe, expect, it } from "vitest";

import { buildFormulaColumns } from "./formulaColumn";

interface Row {
  id: string;
  hours: number;
  rate: number;
}

const ROW: Row = { id: "1", hours: 3, rate: 20 };

describe("a formula column's four surfaces", () => {
  it("renders, formats, sorts and exports the same derivation", () => {
    const { columns, errors, cycles } = buildFormulaColumns<Row>([
      { key: "cost", formula: "=hours * rate" },
    ]);
    expect(errors).toEqual({});
    expect(cycles).toEqual([]);
    const column = columns[0]!;
    expect(column.accessor?.(ROW)).toBe("60");
    expect(column.formatValue?.(ROW)).toBe("60");
    expect(column.exportValue?.(ROW)).toBe("60");
    // The comparator gets the number underneath the text.
    expect(column.sortValue?.(ROW)).toBe(60);
    expect(column.sortable).toBe(true);
  });

  it("shows the formatted text in the cell and sorts on the raw value", () => {
    const { columns } = buildFormulaColumns<Row>([
      {
        key: "cost",
        formula: "=hours * rate",
        format: (value) =>
          value.kind === "number" ? "$" + value.value.toFixed(2) : "",
      },
    ]);
    const column = columns[0]!;
    expect(column.accessor?.(ROW)).toBe("$60.00");
    expect(column.sortValue?.(ROW)).toBe(60);
  });

  it("draws its error in the cell rather than leaving it blank", () => {
    const { columns } = buildFormulaColumns<Row>([
      { key: "cost", formula: "=hours / 0" },
    ]);
    expect(String(columns[0]?.accessor?.(ROW))).toMatch(/#/);
  });
});
