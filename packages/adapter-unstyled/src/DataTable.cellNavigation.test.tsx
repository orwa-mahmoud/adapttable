/**
 * Cell navigation parity for the unstyled adapter.
 *
 * Core owns the behaviour; what each adapter has to get right is the wiring —
 * that the grid role reaches the table element, that cells carry the roving
 * tab stop and their ABSOLUTE column index, that a row carries its absolute
 * row index, and that omitting the prop leaves all of it absent.
 */
import { createMemoryAdapter } from "@adapttable/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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

/**
 * A page is a window over the dataset, so the size has to reach assistive tech
 * whether or not cell navigation is on — core decides, the adapter only has to
 * carry it to the element.
 */
describe("unstyled windowed dataset size", () => {
  it("states the dataset size and absolute row index without cell navigation", () => {
    render(
      <DataTable
        data={ROWS}
        columns={columns}
        rowKey={(r) => r.id}
        urlAdapter={createMemoryAdapter("limit=1")}
        forceMobile={false}
      />
    );
    const rendered = document.querySelectorAll("tbody tr");
    expect(rendered).toHaveLength(1);
    expect(document.querySelector("table")).toHaveAttribute(
      "aria-rowcount",
      "2"
    );
    expect(rendered[0]).toHaveAttribute("aria-rowindex", "1");
    // Nothing here claims the grid keyboard contract.
    expect(screen.queryByRole("grid")).toBeNull();
  });

  it("says nothing when the whole dataset is on the page", () => {
    render(table());
    expect(document.querySelector("table")).not.toHaveAttribute(
      "aria-rowcount"
    );
  });
});

describe("unstyled cell navigation", () => {
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
