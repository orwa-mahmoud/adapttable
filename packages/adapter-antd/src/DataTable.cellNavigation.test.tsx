/**
 * Cell navigation parity for the antd adapter.
 *
 * Core owns the behaviour; what each adapter has to get right is the wiring —
 * that the grid role reaches the table element, that cells carry the roving
 * tab stop and their ABSOLUTE column index, that a row carries its absolute
 * row index, and that omitting the prop leaves all of it absent.
 */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
  team: string;
}

const ROWS: Row[] = [
  { id: "a", name: "Ada", team: "Core" },
  { id: "b", name: "Grace", team: "Web" },
];

const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
  { key: "team", header: "Team", accessor: (r) => r.team },
];

const table = (extra?: { cellNavigation?: boolean }) => (
  <>
    <DataTable
      data={ROWS}
      columns={columns}
      rowKey={(r) => r.id}
      urlSync={false}
      forceMobile={false}
      {...extra}
    />
  </>
);

const cellAt = (row: number, col: number) =>
  document.querySelector<HTMLElement>(`[data-grid-cell="${row}:${col}"]`);

describe("antd cell navigation", () => {
  it("marks the table as a grid and carries the dataset dimensions", () => {
    render(table({ cellNavigation: true }));
    const grid = screen.getByRole("grid");
    expect(grid).toHaveAttribute("aria-rowcount", "2");
    expect(grid).toHaveAttribute("aria-colcount", "2");
  });

  it("gives cells the roving tab stop and absolute indices", () => {
    render(table({ cellNavigation: true }));
    expect(cellAt(0, 0)).toHaveAttribute("tabindex", "0");
    expect(cellAt(0, 1)).toHaveAttribute("tabindex", "-1");
    expect(cellAt(0, 0)).toHaveAttribute("aria-colindex", "1");
    expect(cellAt(0, 1)).toHaveAttribute("aria-colindex", "2");
  });

  it("numbers rows absolutely", () => {
    render(table({ cellNavigation: true }));
    const rows = screen.getAllByRole("row");
    // The header row is row 1, so the first body row is 1-based index 1 here
    // (this adapter's own header handling decides which element that is).
    expect(rows.some((r) => r.getAttribute("aria-rowindex") === "1")).toBe(
      true
    );
  });

  it("moves focus with the arrow keys", () => {
    render(table({ cellNavigation: true }));
    fireEvent.keyDown(screen.getByRole("grid"), { key: "ArrowRight" });
    expect(cellAt(0, 1)).toHaveFocus();
  });

  it("renders the announcer only when navigation is on", () => {
    const on = render(table({ cellNavigation: true }));
    expect(
      on.container.querySelector('[data-adapttable-part="grid-announcer"]')
    ).not.toBeNull();
    on.unmount();

    const off = render(table());
    expect(
      off.container.querySelector('[data-adapttable-part="grid-announcer"]')
    ).toBeNull();
  });

  it("costs nothing when omitted", () => {
    render(table());
    // No grid role, no focusable cells, no key handling.
    expect(screen.queryByRole("grid")).toBeNull();
    expect(cellAt(0, 0)).toBeNull();
  });
});

/**
 * antd builds its own chrome instead of using the shell, so its clipboard
 * wiring is a second place that has to be right — and the only way to know is
 * to paste into the real table.
 */
describe("antd — paste reaches the edit channel", () => {
  it("commits a pasted block through onCellEdit", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { readText: vi.fn().mockResolvedValue("P\tQ") },
    });
    const onCellEdit = vi.fn();
    render(
      <DataTable
        data={ROWS}
        columns={columns.map((c) => ({ ...c, editable: true }))}
        rowKey={(r) => r.id}
        urlSync={false}
        forceMobile={false}
        cellNavigation
        onCellEdit={onCellEdit}
      />
    );
    act(() => cellAt(0, 0)!.focus());
    fireEvent.keyDown(cellAt(0, 0)!, { key: "v", ctrlKey: true });
    await waitFor(() => expect(onCellEdit).toHaveBeenCalledTimes(2));
    expect(onCellEdit).toHaveBeenNthCalledWith(1, ROWS[0], "name", "P");
    vi.unstubAllGlobals();
  });
});
