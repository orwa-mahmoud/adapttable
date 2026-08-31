import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./testDataTable";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  region: string;
  amount: number;
}
const ROWS: Row[] = [
  { id: "1", region: "West", amount: 10 },
  { id: "2", region: "East", amount: 90 },
  { id: "3", region: "North", amount: 40 },
];
const COLS: ColumnDef<Row>[] = [
  { key: "region", header: "Region", accessor: (r) => r.region },
  { key: "amount", header: "Amount", accessor: (r) => r.amount },
];
const total = (rows: readonly Row[]) =>
  rows.reduce((sum, row) => sum + row.amount, 0);

/**
 * Ordering and filtering groups, through the whole table.
 *
 * The pipeline is the thing worth proving here: row filters run first, then
 * grouping, then the group filter, then the group order.
 */
describe("group sorting and filtering (unstyled)", () => {
  const table = (extra?: Record<string, unknown>) =>
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        groupBy="region"
        {...extra}
      />
    );
  const groups = () =>
    [...document.querySelectorAll('[data-adapttable-part="group-label"]')].map(
      (el) => el.textContent?.trim()
    );

  it("keeps the source's own order by default", () => {
    table();
    expect(groups()).toEqual(["West", "East", "North"]);
  });

  it("orders groups by label", () => {
    table({ groupSort: "label" });
    expect(groups()).toEqual(["East", "North", "West"]);
  });

  it("orders groups by an aggregate, through their rows", () => {
    table({
      groupSort: (
        a: { leafRows: readonly Row[] },
        b: { leafRows: readonly Row[] }
      ) => total(b.leafRows) - total(a.leafRows),
    });
    expect(groups()).toEqual(["East", "North", "West"]);
  });

  it("drops groups the group filter rejects, leaves and all", () => {
    table({
      groupFilter: (g: { leafRows: readonly Row[] }) => total(g.leafRows) >= 40,
    });
    expect(groups()).toEqual(["East", "North"]);
    expect(document.querySelectorAll("tbody tr")).toHaveLength(4);
  });

  it("runs row filters first — the group filter only sees what survived", () => {
    table({
      defaults: { search: "East" },
      groupFilter: (g: { leafRows: readonly Row[] }) => g.leafRows.length > 0,
    });
    expect(groups()).toEqual(["East"]);
  });
});
