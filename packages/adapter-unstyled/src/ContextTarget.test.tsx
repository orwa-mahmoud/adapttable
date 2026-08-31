import { resolveContextTarget } from "@adapttable/core/adapter";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./testDataTable";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
  city: string;
}
const ROWS: Row[] = [
  { id: "r1", name: "Ada", city: "London" },
  { id: "r2", name: "Grace", city: "New York" },
];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
  {
    key: "city",
    header: "City",
    accessor: (r) => r.city,
    Cell: ({ row }) => <span data-testid={`chip-${row.id}`}>{row.city}</span>,
  },
];

/**
 * The context-menu resolver, against a real table rather than a fixture.
 *
 * Its unit tests build the DOM by hand, which proves the precedence rules
 * and nothing about whether a rendered table actually carries the
 * attributes they read. That gap is exactly where this feature would have
 * failed silently: six kits named no row at all, so a resolver that passed
 * every unit test would have returned null for every right-click.
 */
describe("resolving a context target from a rendered table", () => {
  const rowFor = (id: string) => ROWS.find((row) => row.id === id);

  function table() {
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
      />
    );
  }

  it("finds the cell a click landed in, and which row and column it is", () => {
    table();
    const cell = document.querySelectorAll(
      '[data-adapttable-part="cell"]'
    )[3] as HTMLElement;

    expect(resolveContextTarget<Row>(cell, rowFor)?.target).toEqual({
      kind: "cell",
      row: ROWS[1],
      rowId: "r2",
      columnKey: "city",
    });
  });

  it("finds the column a header click landed in", () => {
    table();
    const header = document.querySelectorAll(
      '[data-adapttable-part="header-cell"]'
    )[1] as HTMLElement;

    expect(resolveContextTarget<Row>(header, rowFor)?.target).toEqual({
      kind: "header",
      columnKey: "city",
    });
  });

  it("finds the cell from a click on what a custom cell rendered", () => {
    table();
    // A click's target is whatever element is under the pointer, which for
    // a custom cell is the host's own markup rather than the cell itself.
    const chip = document.querySelector('[data-testid="chip-r1"]')!;

    expect(resolveContextTarget<Row>(chip, rowFor)?.target).toEqual({
      kind: "cell",
      row: ROWS[0],
      rowId: "r1",
      columnKey: "city",
    });
  });

  it("has no answer for a click outside the table", () => {
    table();

    expect(resolveContextTarget<Row>(document.body, rowFor)).toBeNull();
  });
});
