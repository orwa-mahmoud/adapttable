/**
 * A windowed COLUMN axis states its real shape, the way the row axis does.
 *
 * Only a slice of the columns is in the DOM, so a reader that counts rendered
 * cells reports the wrong position — column 17 of 40 announces as "3 of 9".
 * The count on the table and the absolute index on every cell have to ship
 * together: the count alone would be worse than neither.
 */
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";
import { renderMantine } from "./test-utils";

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

/** The kit's own cells, never the spacers that hold open the skipped width. */
const realCells = (selector: string) =>
  [...document.querySelectorAll(selector)].filter(
    (cell) =>
      !cell.getAttribute("data-adapttable-part")?.startsWith("column-spacer")
  );
const bodyCells = () => realCells("tbody tr:first-child td");

function mount(extra?: Record<string, unknown>) {
  const view = renderMantine(
    <DataTable
      data={ROWS}
      columns={COLS}
      rowKey={(r) => r.id}
      urlSync={false}
      maxHeight={300}
      {...extra}
    />
  );
  return view;
}

/**
 * jsdom measures nothing, so the window only arms once the scroll box reports a
 * width. Scrolling right as well proves the indices are absolute rather than a
 * count that happens to start at one.
 */
function armWindow(container: HTMLElement) {
  const box = container.querySelector<HTMLElement>(
    '[data-adapttable-part="scroll-box"]'
  );
  if (!box) throw new Error("no scroll box to window");
  Object.defineProperty(box, "clientWidth", {
    value: 480,
    configurable: true,
  });
  Object.defineProperty(box, "scrollWidth", {
    value: COLUMN_COUNT * 160,
    configurable: true,
  });
  box.scrollLeft = 2400;
  fireEvent.scroll(box);
}

describe("windowed column axis — dataset width (mantine)", () => {
  it("states the column count and every cell's absolute index", () => {
    const { container } = mount({ virtualizeColumns: true });
    armWindow(container);

    const cells = bodyCells();
    // The point of the test: a slice, not the whole axis.
    expect(cells.length).toBeLessThan(COLUMN_COUNT);
    expect(cells.length).toBeGreaterThan(0);
    expect(container.querySelector("table")).toHaveAttribute(
      "aria-colcount",
      String(COLUMN_COUNT)
    );
    // Each cell names its own column in its text, so the expected index comes
    // from the cell rather than from an assumption about where the window sits.
    for (const cell of cells) {
      const column = /c(\d+)-/.exec(cell.textContent ?? "")?.[1];
      expect(column, cell.textContent ?? "").toBeDefined();
      expect(cell, cell.textContent ?? "").toHaveAttribute(
        "aria-colindex",
        String(Number(column) + 1)
      );
    }
  });

  it("numbers the header cells from the same absolute positions", () => {
    const { container } = mount({ virtualizeColumns: true });
    armWindow(container);

    const headers = realCells("thead th");
    expect(headers.length).toBeLessThan(COLUMN_COUNT);
    // A header names its column, so the header row has to agree with the body
    // row beneath it — otherwise a reader hears two different positions for one
    // column.
    for (const header of headers) {
      const column = /^C(\d+)$/.exec(header.textContent?.trim() ?? "")?.[1];
      expect(column, header.textContent ?? "").toBeDefined();
      expect(header, header.textContent ?? "").toHaveAttribute(
        "aria-colindex",
        String(Number(column) + 1)
      );
    }
  });

  it("claims no grid keyboard contract on the way", () => {
    const { container } = mount({ virtualizeColumns: true });
    armWindow(container);

    expect(screen.queryByRole("grid")).toBeNull();
  });

  it("says nothing when every column is in the DOM", () => {
    const { container } = mount();

    expect(bodyCells()).toHaveLength(COLUMN_COUNT);
    expect(container.querySelector("table")).not.toHaveAttribute(
      "aria-colcount"
    );
    expect(bodyCells()[0]).not.toHaveAttribute("aria-colindex");
  });
});
