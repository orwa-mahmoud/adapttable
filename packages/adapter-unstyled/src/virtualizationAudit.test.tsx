import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  team: string;
  name: string;
  budget: number;
}
const ROWS: Row[] = Array.from({ length: 12 }, (_, i) => ({
  id: String(i),
  team: `Team ${i % 3}`,
  name: `Person ${i}`,
  budget: i * 100,
}));
const COLS: ColumnDef<Row>[] = [
  { key: "team", header: "Team", accessor: (r) => r.team },
  { key: "name", header: "Name", accessor: (r) => r.name, editable: true },
  { key: "budget", header: "Budget", accessor: (r) => r.budget },
];

/**
 * Virtualization against everything it has to hold up under.
 *
 * Each of these combinations used to be a caveat or an unknown; the point of
 * the audit is that the combination renders and stays usable, not that the
 * window is a particular size — jsdom has no layout, so the window is the
 * whole set here and the browser proves the scrolling.
 */
describe("virtualization compatibility (unstyled)", () => {
  const table = (extra?: Record<string, unknown>) =>
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        paginationMode="infinite"
        virtualize
        {...extra}
      />
    );
  const rows = () => document.querySelectorAll('[data-adapttable-part="row"]');

  it("renders rows at all", () => {
    table();
    expect(rows().length).toBeGreaterThan(0);
  });

  it("holds up with grouping armed", () => {
    table({ groupBy: "team", groupAggregates: () => ({ budget: 1 }) });
    expect(
      document.querySelectorAll('[data-adapttable-part="group-row"]')
    ).toHaveLength(3);
    expect(rows().length).toBeGreaterThan(0);
  });

  it("holds up with group footers", () => {
    table({
      groupBy: "team",
      groupAggregates: () => ({ budget: 1 }),
      groupFooters: true,
    });
    expect(
      document.querySelectorAll('[data-adapttable-part="group-footer-row"]')
    ).toHaveLength(3);
  });

  it("expands a row without the warning it used to carry", () => {
    // The pair measurer is what removed the caveat: a detail panel is measured
    // with its row, so scroll heights stay honest while one is open.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    table({ renderRowDetail: (row: Row) => <div>detail {row.name}</div> });
    fireEvent.click(
      document.querySelectorAll('[data-adapttable-part="expand-button"]')[0]!
    );
    expect(screen.getByText("detail Person 0")).toBeInTheDocument();
    expect(warn.mock.calls.flat().join(" ")).not.toContain(
      "renderRowDetail with virtualize"
    );
    warn.mockRestore();
  });

  it("keeps pinned columns pinned", () => {
    table({ defaultColumnLayout: { pinned: { team: "start" } } });
    const pinned = document.querySelector<HTMLElement>(
      'tbody [data-adapttable-part="cell"][data-pinned="start"]'
    );
    expect(pinned).not.toBeNull();
    expect(pinned?.style.position).toBe("sticky");
  });

  it("keeps a sticky header sticky", () => {
    table({ stickyHeader: true, maxHeight: 300 });
    const header = document.querySelector<HTMLElement>(
      'thead [data-adapttable-part="header-cell"]'
    );
    expect(header?.style.position).toBe("sticky");
  });

  it("edits a cell in a windowed row", () => {
    const onCellEdit = vi.fn();
    table({ onCellEdit });
    const cell = document.querySelectorAll(
      '[data-adapttable-part="edit-cell-activate"]'
    )[0]!;
    fireEvent.doubleClick(cell);
    const input = document.querySelector(
      '[data-adapttable-part="edit-cell-editor"]'
    )!;
    fireEvent.change(input, { target: { value: "Renamed" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(
      ROWS[0],
      "name",
      "Renamed"
    );
  });

  it("navigates cells in a windowed row", () => {
    table({ cellNavigation: true });
    const first = document.querySelector<HTMLElement>(
      '[data-grid-cell="0:0"]'
    )!;
    act(() => first.focus());
    fireEvent.keyDown(first, { key: "ArrowDown" });
    expect(document.activeElement?.getAttribute("data-grid-cell")).toBe("1:0");
  });
});
