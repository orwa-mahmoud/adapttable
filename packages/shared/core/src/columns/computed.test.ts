import { describe, expect, it, vi } from "vitest";

import { sortRows } from "../sort/compare";
import { computed } from "./computed";

interface Order {
  id: string;
  quantity: number;
  unitPrice: number;
  first: string;
  last: string;
}

const ORDERS: Order[] = [
  { id: "a", quantity: 2, unitPrice: 620, first: "Ada", last: "Lovelace" },
  { id: "b", quantity: 1, unitPrice: 90, first: "Alan", last: "Turing" },
];

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function totalColumn() {
  return computed<Order, number>({
    key: "total",
    header: "Total",
    deps: (row) => [row.quantity, row.unitPrice],
    value: (row) => row.quantity * row.unitPrice,
    format: (total) => money.format(total),
  });
}

describe("computed columns", () => {
  it("shows the formatted value through formatValue", () => {
    const column = totalColumn();
    expect(column.formatValue?.(ORDERS[0]!)).toBe("$1,240.00");
  });

  it("sorts by the value, not by the formatting", () => {
    const { sortValue } = totalColumn();
    if (!sortValue) throw new Error("a computed column always has a sortValue");
    const sorted = sortRows(ORDERS, sortValue, "asc");
    expect(sorted.map((row) => row.id)).toEqual(["b", "a"]);
  });

  it("exports the value a spreadsheet can use", () => {
    const column = totalColumn();
    expect(column.exportValue?.(ORDERS[0]!)).toBe(1240);
  });

  it("computes once per row and reuses the result", () => {
    const value = vi.fn((row: Order) => row.quantity * row.unitPrice);
    const column = computed<Order, number>({
      key: "total",
      deps: (row) => [row.quantity, row.unitPrice],
      value,
    });

    column.formatValue?.(ORDERS[0]!);
    column.sortValue?.(ORDERS[0]!);
    column.exportValue?.(ORDERS[0]!);

    expect(value).toHaveBeenCalledTimes(1);
  });
});
