import { act, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";
import { renderChakra } from "./test-utils";

interface Row {
  id: string;
  name: string;
  team: string;
}
const ROWS: Row[] = [
  { id: "1", name: "A", team: "X" },
  { id: "2", name: "B", team: "Y" },
];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "N", accessor: (r) => r.name },
  { key: "team", header: "T", accessor: (r) => r.team },
];

/**
 * A range the user can SEE. The model shipped in 2.2.0 marking selected cells,
 * but every row memo compared its props without `gridFocus`, so a row never
 * re-rendered when the range moved: the live region announced the new cell while
 * the table showed nothing. This asserts the attribute reaches the DOM.
 */
describe("selected cells are visible (chakra)", () => {
  it("marks the extended range on the cells themselves", () => {
    const { container } = renderChakra(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        cellNavigation
      />
    );
    const cells = container.querySelectorAll<HTMLElement>("[data-grid-cell]");
    expect(cells.length).toBeGreaterThan(0);
    act(() => cells[0]!.focus());
    fireEvent.keyDown(cells[0]!, { key: "ArrowRight", shiftKey: true });
    // Two cells: the anchor and the head.
    expect(container.querySelectorAll("[data-cell-selected]")).toHaveLength(2);
    // And the focus moved with it.
    expect(container.querySelector('[data-grid-cell="0:1"]')).toHaveAttribute(
      "tabindex",
      "0"
    );
  });
});
