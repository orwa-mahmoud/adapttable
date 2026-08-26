import { Theme } from "@radix-ui/themes";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./DataTable";
import { grouping } from "./grouping";
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

const rowKey = (row: Row) => row.id;

function table(
  extra: {
    forceMobile?: boolean;
    grouped?: boolean;
    isCellFlashing?: (rowId: string, columnKey: string) => boolean;
  } = {}
) {
  return (
    <Theme>
      <DataTable<Row>
        data={ROWS}
        columns={COLS}
        rowKey={rowKey}
        urlSync={false}
        forceMobile={extra.forceMobile}
        isCellFlashing={extra.isCellFlashing}
        features={extra.grouped ? [grouping<Row>(["name"])] : undefined}
      />
    </Theme>
  );
}

function flashing(part: "cell" | "card-value") {
  return [
    ...document.querySelectorAll<HTMLElement>(
      `[data-adapttable-part="${part}"]`
    ),
  ].filter((node) => node.hasAttribute("data-flash"));
}

/**
 * The pulse on a cell a patch just changed.
 *
 * The table never owns the marks: the host computes `isCellFlashing` from
 * `useChangedCellFlash` and passes it in. These walk the live lifecycle —
 * omitted, marked, cleared — so the memoized row and card pick up the
 * digest change instead of holding a stale `data-flash`. A grouped card
 * list is the other mobile body, so a mark has to land there too.
 */
describe("changed-cell flash (radix)", () => {
  it("marks only the cell the host says is flashing, then clears it", () => {
    const { rerender } = render(table());
    expect(document.querySelector("[data-flash]")).toBeNull();

    rerender(
      table({
        isCellFlashing: (rowId, columnKey) =>
          rowId === "r1" && columnKey === "budget",
      })
    );
    const marked = flashing("cell");
    expect(marked).toHaveLength(1);
    expect(marked[0]).toHaveAttribute("data-column-key", "budget");

    rerender(table());
    expect(document.querySelector("[data-flash]")).toBeNull();
  });

  it("marks the matching card value, then clears it", () => {
    const { rerender } = render(table({ forceMobile: true }));
    expect(document.querySelector("[data-flash]")).toBeNull();

    rerender(
      table({
        forceMobile: true,
        isCellFlashing: (rowId, columnKey) =>
          rowId === "r2" && columnKey === "name",
      })
    );
    const marked = flashing("card-value");
    expect(marked).toHaveLength(1);
    expect(marked[0]).toHaveTextContent("Grace");

    rerender(table({ forceMobile: true }));
    expect(document.querySelector("[data-flash]")).toBeNull();
  });

  it("marks a card value that sits under a group header", () => {
    render(
      table({
        forceMobile: true,
        grouped: true,
        isCellFlashing: (rowId, columnKey) =>
          rowId === "r1" && columnKey === "budget",
      })
    );
    expect(
      document.querySelector('[data-adapttable-part="group-card"]')
    ).not.toBeNull();
    const marked = flashing("card-value");
    expect(marked).toHaveLength(1);
    expect(marked[0]).toHaveTextContent("10");
  });
});
