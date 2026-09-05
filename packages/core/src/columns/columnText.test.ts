/**
 * A column's cell as text.
 */
import { describe, expect, it } from "vitest";

import type { ColumnModel } from "../columnModel";
import { columnText } from "./columnText";

interface Row {
  id: string;
  name: string;
  budget: number;
  active: boolean;
  due: Date;
  nested: { city: string };
  missing?: string;
}

const ROW: Row = {
  id: "1",
  name: "Ada",
  budget: 1240,
  active: true,
  due: new Date("2026-08-12T09:30:00.000Z"),
  nested: { city: "London" },
};

describe("columnText", () => {
  it("uses formatValue when the column states its own text", () => {
    const column: ColumnModel<Row> = {
      key: "budget",
      formatValue: () => "$1,240.00",
      exportValue: (row) => row.budget,
    };
    expect(columnText(column, ROW)).toBe("$1,240.00");
  });

  it("reads exportValue for derived display columns", () => {
    const column: ColumnModel<Row> = {
      key: "budget",
      exportValue: (row) => row.budget,
    };
    expect(columnText(column, ROW)).toBe("1240");
  });

  it("falls back to sortValue when there is no export value", () => {
    const column: ColumnModel<Row> = {
      key: "name",
      sortValue: (row) => row.name,
    };
    expect(columnText(column, ROW)).toBe("Ada");
  });

  it("reads the key's data path for a bare column", () => {
    expect(columnText({ key: "name" }, ROW)).toBe("Ada");
  });

  it("reaches a nested value through a dotted key", () => {
    expect(columnText({ key: "nested.city" }, ROW)).toBe("London");
  });

  it("treats an empty string as a real answer, not a miss", () => {
    const column: ColumnModel<Row> = {
      key: "name",
      exportValue: () => "",
    };
    expect(columnText(column, ROW)).toBe("");
  });

  it("never returns undefined, whatever the column does", () => {
    const column: ColumnModel<Row> = {
      key: "missing",
      sortValue: () => null,
      exportValue: () => undefined,
    };
    expect(columnText(column, ROW)).toBe("");
  });
});
