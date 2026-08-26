import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
  budget: number;
}

const ROWS: Row[] = [
  { id: "r1", name: "Ada", budget: 10 },
  { id: "r2", name: "Grace", budget: 20 },
];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
  { key: "budget", header: "Budget", accessor: (r) => r.budget },
];

/**
 * The pulse on a cell a patch just changed.
 *
 * The table never owns the marks: the host computes `isCellFlashing` from
 * `useChangedCellFlash` and passes it in, the same way `rowClassName` is
 * the seam for `useHighlight`. These check that the attribute lands on the
 * cell and on the card value, and that an omitted reader paints nothing.
 */
describe("changed-cell flash (unstyled)", () => {
  it("marks only the cell the host says is flashing", () => {
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(row) => row.id}
        urlSync={false}
        isCellFlashing={(rowId, columnKey) =>
          rowId === "r1" && columnKey === "budget"
        }
      />
    );
    const cells = [
      ...document.querySelectorAll<HTMLElement>(
        '[data-adapttable-part="cell"]'
      ),
    ];
    const flashing = cells.filter((cell) => cell.hasAttribute("data-flash"));
    expect(flashing).toHaveLength(1);
    expect(flashing[0]).toHaveAttribute("data-column-key", "budget");
  });

  it("marks the matching card value on the mobile list", () => {
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(row) => row.id}
        urlSync={false}
        forceMobile
        isCellFlashing={(rowId, columnKey) =>
          rowId === "r2" && columnKey === "name"
        }
      />
    );
    const values = [
      ...document.querySelectorAll<HTMLElement>(
        '[data-adapttable-part="card-value"]'
      ),
    ];
    const flashing = values.filter((node) => node.hasAttribute("data-flash"));
    expect(flashing).toHaveLength(1);
    expect(flashing[0]).toHaveTextContent("Grace");
  });

  it("paints nothing when the host omits the reader", () => {
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(row) => row.id}
        urlSync={false}
      />
    );
    expect(document.querySelector("[data-flash]")).toBeNull();
  });
});
