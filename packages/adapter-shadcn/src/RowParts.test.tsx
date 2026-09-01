import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ColumnDef } from "./index";
import { DataTable } from "./testDataTable";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [
  { id: "r1", name: "A" },
  { id: "r2", name: "B" },
];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "N", accessor: (r) => r.name },
];

/**
 * The structural part names, checked by rendering.
 *
 * The parts-parity script greps adapter source, so it cannot see a name that
 * arrives through one of core's prop-getters, and it compares only names at
 * least one themed kit already emits. `row` fell through both gaps. This
 * asserts on the DOM the user actually gets.
 */
describe("structural row parts (shadcn)", () => {
  it("names its body rows and says which row each one is", () => {
    render(
      <>
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
        />
      </>
    );
    const rows = document.querySelectorAll('[data-adapttable-part="row"]');

    expect(rows).toHaveLength(2);
    expect([...rows].map((el) => el.getAttribute("data-row-id"))).toEqual([
      "r1",
      "r2",
    ]);
  });

  it("names its header cells", () => {
    render(
      <>
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
        />
      </>
    );

    expect(
      document.querySelector('[data-adapttable-part="header-cell"]')
    ).not.toBeNull();
  });
});
