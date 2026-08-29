/**
 * antd is the one adapter whose column axis is never windowed: it renders rows
 * inside its own fixed-height scroller and never hands core a scroll box to
 * measure, so `virtualizeColumns` has nothing to window against and every
 * column stays in the DOM.
 *
 * That makes silence the correct answer here — a count and per-cell indices
 * would describe a window that does not exist. The other eight adapters state
 * both; this pins antd's contract so a change to either side is visible.
 */
import { describe, expect, it } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";
import { renderAntd } from "./test-utils";

interface Row {
  id: string;
  [key: string]: string;
}
const COLUMN_COUNT = 40;
const COLS: ColumnDef<Row>[] = Array.from({ length: COLUMN_COUNT }, (_, i) => ({
  key: `c${i}`,
  header: `C${i}`,
  accessor: (row: Row) => row[`c${i}`] ?? "",
}));
const ROWS: Row[] = Array.from({ length: 3 }, (_, r) => ({
  id: String(r),
  ...Object.fromEntries(COLS.map((c) => [c.key, `${c.key}-${r}`])),
}));

const bodyCells = () => [
  ...document.querySelectorAll("tbody tr:first-child td"),
];

describe("windowed column axis — dataset width (antd)", () => {
  function mount() {
    return renderAntd(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        maxHeight={300}
        virtualizeColumns
      />
    );
  }

  it("keeps every column in the DOM, so there is no window to describe", () => {
    const { container } = mount();

    expect(bodyCells()).toHaveLength(COLUMN_COUNT);
    expect(
      container.querySelector('[data-adapttable-part="scroll-box"]')
    ).toBeNull();
    expect(
      document.querySelectorAll('[data-adapttable-part^="column-spacer"]')
    ).toHaveLength(0);
  });

  it("states no column count and no per-cell index", () => {
    const { container } = mount();

    expect(container.querySelector("table")).not.toHaveAttribute(
      "aria-colcount"
    );
    expect(bodyCells()[0]).not.toHaveAttribute("aria-colindex");
    expect(document.querySelector("thead th")).not.toHaveAttribute(
      "aria-colindex"
    );
  });
});
