import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./testDataTable";
import type { ColumnDef } from "./index";

interface Order {
  id: string;
  item: string;
}
interface Person {
  id: string;
  name: string;
  orders: Order[];
}

const PEOPLE: Person[] = [
  {
    id: "1",
    name: "Ada",
    orders: [
      { id: "o1", item: "Analytical Engine" },
      { id: "o2", item: "Punch cards" },
    ],
  },
  { id: "2", name: "Grace", orders: [] },
];
const COLS: ColumnDef<Person>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
];
const ORDER_COLS: ColumnDef<Order>[] = [
  { key: "item", header: "Item", accessor: (r) => r.item },
];

/**
 * A real table under a row.
 *
 * The point of the feature is that the panel holds the SAME component the page
 * does — so what these check is that a full table renders in there, with the
 * defaults a table inside a row must have, and that the parent still behaves
 * like a table with expandable rows.
 */
describe("nested table (unstyled)", () => {
  const table = () =>
    render(
      <DataTable
        data={PEOPLE}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        density="compact"
        nestedTable={(row) =>
          row.orders.length === 0
            ? undefined
            : {
                label: `Orders for ${row.name}`,
                table: (defaults) => (
                  <DataTable
                    {...defaults}
                    data={row.orders}
                    columns={ORDER_COLS}
                    rowKey={(order) => order.id}
                  />
                ),
              }
        }
      />
    );
  const expandButtons = () =>
    document.querySelectorAll<HTMLElement>(
      '[data-adapttable-part="expand-button"]'
    );

  it("gives every row a chevron, and renders nothing until one is opened", () => {
    table();
    expect(expandButtons()).toHaveLength(2);
    expect(
      document.querySelector('[data-adapttable-part="nested-table"]')
    ).toBeNull();
  });

  it("renders a real table in the panel, named for the row", () => {
    table();
    fireEvent.click(expandButtons()[0]!);
    const region = document.querySelector<HTMLElement>(
      '[data-adapttable-part="nested-table"]'
    );
    expect(region).toHaveAttribute("aria-label", "Orders for Ada");
    // A table, with the child columns and a sortable header — not a slot.
    const nested = screen.getByRole("table", { name: "Orders for Ada" });
    expect(nested.querySelectorAll('td[data-column-key="item"]')).toHaveLength(
      2
    );
    expect(nested).toHaveTextContent("Analytical Engine");
    // Its own header, its own column — the whole table, not a rendered slot.
    expect(
      nested.querySelector('thead [data-column-key="item"]')
    ).toHaveTextContent("Item");
  });

  it("keeps its own state out of the parent's search box", () => {
    table();
    fireEvent.click(expandButtons()[0]!);
    // One search box on the page: the parent's. A second inside a row would
    // read as chrome rather than as a feature.
    expect(
      document.querySelectorAll('[data-adapttable-part="search-field"]')
    ).toHaveLength(1);
  });

  it("renders no panel for a row that declared none", () => {
    table();
    fireEvent.click(expandButtons()[1]!);
    expect(
      document.querySelector('[data-adapttable-part="nested-table"]')
    ).toBeNull();
  });
});
