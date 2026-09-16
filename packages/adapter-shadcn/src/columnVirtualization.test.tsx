import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  [key: string]: string;
}
const COLS: ColumnDef<Row>[] = Array.from({ length: 40 }, (_, i) => ({
  key: `c${i}`,
  header: `C${i}`,
  accessor: (row: Row) => row[`c${i}`] ?? "",
}));
const ROWS: Row[] = Array.from({ length: 3 }, (_, r) => ({
  id: String(r),
  ...Object.fromEntries(COLS.map((c) => [c.key, `${c.key}-${r}`])),
}));

/**
 * Windowing the horizontal axis, through a real table.
 *
 * jsdom measures nothing, so the window only arms once a scroll box reports a
 * width — which is exactly the guard that keeps an unmeasured table from
 * rendering as two spacers and no columns.
 */
describe("column virtualization (shadcn)", () => {
  const table = (extra?: Record<string, unknown>) =>
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        maxHeight={300}
        {...extra}
      />
    );
  const headerCells = () =>
    document.querySelectorAll('thead [data-adapttable-part="header-cell"]');
  const spacers = () =>
    document.querySelectorAll('[data-adapttable-part^="column-spacer"]');

  it("renders every column when the prop is absent", () => {
    table();
    expect(headerCells()).toHaveLength(40);
    expect(spacers()).toHaveLength(0);
  });

  it("renders every column until the scroll box has a width", () => {
    // An unmeasured box means an unknown viewport: showing everything is the
    // only honest answer, and it is what a table without JS layout gets.
    table({ virtualizeColumns: true });
    expect(headerCells()).toHaveLength(40);
  });

  it("windows the columns once the box reports a width", () => {
    const { container } = table({ virtualizeColumns: true });
    const box = container.querySelector<HTMLElement>(
      '[data-adapttable-part="scroll-box"]'
    )!;
    Object.defineProperty(box, "clientWidth", {
      value: 480,
      configurable: true,
    });
    fireEvent.scroll(box);
    expect(headerCells().length).toBeLessThan(40);
    expect(headerCells().length).toBeGreaterThan(0);
    // Two spacers hold open everything the window skipped.
    expect(spacers().length).toBeGreaterThan(0);
  });

  it("keeps the row and header cell counts in step", () => {
    const { container } = table({ virtualizeColumns: true });
    const box = container.querySelector<HTMLElement>(
      '[data-adapttable-part="scroll-box"]'
    )!;
    Object.defineProperty(box, "clientWidth", {
      value: 480,
      configurable: true,
    });
    fireEvent.scroll(box);
    const bodyCells = document.querySelectorAll(
      'tbody tr:first-child [data-adapttable-part="cell"]'
    );
    expect(bodyCells).toHaveLength(headerCells().length);
  });

  it("never windows out a pinned column", () => {
    const { container } = table({
      virtualizeColumns: true,
      defaultColumnLayout: { pinned: { c0: "start" } },
    });
    const box = container.querySelector<HTMLElement>(
      '[data-adapttable-part="scroll-box"]'
    )!;
    Object.defineProperty(box, "clientWidth", {
      value: 480,
      configurable: true,
    });
    box.scrollLeft = 4000;
    fireEvent.scroll(box);
    const headers = [...headerCells()].map((el) => el.textContent);
    expect(headers[0]).toContain("C0");
  });
});
