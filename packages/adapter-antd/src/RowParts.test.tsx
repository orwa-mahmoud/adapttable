import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";

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
describe("structural row parts (antd)", () => {
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

  // The structural contract: the same seven names on the same elements in
  // every kit, whatever each kit's own component tree looks like on the way
  // down to the table.
  it("names the table, its sections and the toolbar", () => {
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
    const part = (name: string) =>
      document.querySelector(`[data-adapttable-part="${name}"]`);

    expect(part("table")?.tagName).toBe("TABLE");
    expect(part("thead")?.tagName).toBe("THEAD");
    expect(part("tbody")?.tagName).toBe("TBODY");
    expect(part("toolbar")).not.toBeNull();
    expect(part("cell")?.tagName).toBe("TD");
  });

  it("names every table antd draws, header and body alike", () => {
    // A bounded height splits antd's grid into a header table and a body
    // table. Both are tables of ours, so the name is on both — an app's
    // `[data-adapttable-part="table"]` rule cannot hit one and miss the other.
    render(
      <>
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          maxHeight={200}
          urlSync={false}
        />
      </>
    );
    const tables = [...document.querySelectorAll("table")];

    expect(tables.length).toBeGreaterThan(1);
    for (const table of tables) {
      expect(table.getAttribute("data-adapttable-part")).toBe("table");
    }
  });
});
