import { act, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";
import { renderAntd } from "./test-utils";

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
 * antd builds its cells through `onCell` rather than a memoized row component,
 * so it reaches the same result by a different route — which is exactly why it
 * needs its own test rather than trusting the shared one.
 */
describe("selected cells are visible (antd)", () => {
  it("marks the extended range on the cells themselves", () => {
    const { container } = renderAntd(
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
    expect(container.querySelectorAll("[data-cell-selected]")).toHaveLength(2);
    expect(container.querySelector('[data-grid-cell="0:1"]')).toHaveAttribute(
      "tabindex",
      "0"
    );
  });
});
