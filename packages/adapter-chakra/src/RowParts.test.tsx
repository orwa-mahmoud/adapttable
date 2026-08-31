import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./testDataTable";
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
 * `row` is not written in this package at all: it arrives with the rest of the
 * row's identity from core's `getRowProps`, which this kit spreads on its body
 * row. `header-cell` is the opposite case — written on the kit's own header
 * element. A grep over adapter source can only see the second kind, so both
 * are asserted here on the DOM the host actually gets.
 */
describe("structural row parts (chakra)", () => {
  it("names its body rows and says which row each one is", () => {
    render(
      <ChakraProvider value={defaultSystem}>
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
        />
      </ChakraProvider>
    );
    const rows = document.querySelectorAll('[data-adapttable-part="row"]');

    expect(rows).toHaveLength(2);
    expect([...rows].map((el) => el.getAttribute("data-row-id"))).toEqual([
      "r1",
      "r2",
    ]);
    // The whole spread landed, not just the name: the row's role and its
    // dataset index come from the same getter.
    expect([...rows].map((el) => el.getAttribute("role"))).toEqual([
      "row",
      "row",
    ]);
    expect([...rows].map((el) => el.getAttribute("data-index"))).toEqual([
      "0",
      "1",
    ]);
  });

  it("names its header cells", () => {
    render(
      <ChakraProvider value={defaultSystem}>
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
        />
      </ChakraProvider>
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
      <ChakraProvider value={defaultSystem}>
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
        />
      </ChakraProvider>
    );
    const part = (name: string) =>
      document.querySelector(`[data-adapttable-part="${name}"]`);

    expect(part("table")?.tagName).toBe("TABLE");
    expect(part("thead")?.tagName).toBe("THEAD");
    expect(part("tbody")?.tagName).toBe("TBODY");
    expect(part("toolbar")).not.toBeNull();
    expect(part("cell")?.tagName).toBe("TD");
  });
});
