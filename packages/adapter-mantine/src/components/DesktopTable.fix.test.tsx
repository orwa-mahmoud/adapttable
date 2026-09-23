import { act, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "../data-table.test-utils";
import type { ColumnDef } from "../index";
import { renderMantine } from "../test-utils";

interface Row {
  id: string;
  name: string;
  amount: number;
}
const ROWS: Row[] = [
  { id: "1", name: "A", amount: 10 },
  { id: "2", name: "B", amount: 20 },
];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
  {
    key: "amount",
    header: "Amount",
    accessor: (r) => r.amount,
    align: "end",
  },
];

function amountCells(container: HTMLElement): HTMLElement[] {
  return [
    ...container.querySelectorAll<HTMLElement>(
      'td[data-adapttable-part="cell"][data-column-key="amount"]'
    ),
  ];
}

describe("mantine body cells keep the column's cell style", () => {
  it('aligns an `align: "end"` column\'s body cells to the end', () => {
    const { container } = renderMantine(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
      />
    );
    const cells = amountCells(container);
    expect(cells).toHaveLength(2);
    for (const cell of cells) {
      expect(["end", "right"]).toContain(cell.style.textAlign);
    }
  });

  it("keeps the alignment while a highlighted cell carries the highlight fill", () => {
    const { container } = renderMantine(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        cellNavigation
      />
    );
    const first = container.querySelector<HTMLElement>(
      '[data-grid-cell="0:0"]'
    );
    expect(first).not.toBeNull();
    act(() => first!.focus());
    fireEvent.keyDown(first!, { key: "ArrowRight", shiftKey: true });

    const selected = container.querySelector<HTMLElement>(
      'td[data-column-key="amount"][data-cell-selected]'
    );
    expect(selected).not.toBeNull();
    expect(["end", "right"]).toContain(selected!.style.textAlign);
    expect(selected!.style.background).toContain(
      "var(--mantine-primary-color-light)"
    );
  });
});
