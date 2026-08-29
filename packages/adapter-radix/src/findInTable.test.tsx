import { Theme } from "@radix-ui/themes";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
  team: string;
}
const ROWS: Row[] = [
  { id: "1", name: "Ada", team: "Core" },
  { id: "2", name: "Grace", team: "Web" },
];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "N", accessor: (r) => r.name },
  { key: "team", header: "T", accessor: (r) => r.team },
];

/**
 * Find in table for the radix adapter.
 *
 * Core owns the search and the bar; each adapter has to render the bar, mark
 * the hits on its own cells, and hand Ctrl/Cmd+F to the grid.
 */
describe("find in table (radix)", () => {
  const table = (extra?: Record<string, unknown>) =>
    render(
      <Theme>
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          cellNavigation
          {...extra}
        />
      </Theme>
    );
  const cell = (row: number, col: number) =>
    document.querySelector<HTMLElement>(`[data-grid-cell="${row}:${col}"]`)!;
  const bar = () => document.querySelector('[data-adapttable-part="find-bar"]');
  const input = () =>
    document.querySelector<HTMLInputElement>(
      '[data-adapttable-part="find-input"]'
    )!;

  it("opens on Ctrl/Cmd+F and marks what it finds", () => {
    table({ findInTable: true });
    act(() => cell(0, 0).focus());
    fireEvent.keyDown(cell(0, 0), { key: "f", ctrlKey: true });
    expect(bar()).not.toBeNull();
    fireEvent.change(input(), { target: { value: "ace" } });
    // Only Grace matches, and the walk is standing on it.
    expect(document.querySelectorAll("[data-cell-match]")).toHaveLength(1);
    expect(cell(1, 0).hasAttribute("data-cell-match-current")).toBe(true);
    expect(screen.getByText("1 of 1")).toBeInTheDocument();
  });

  it("walks the hits and wraps", () => {
    table({ findInTable: true });
    act(() => cell(0, 0).focus());
    fireEvent.keyDown(cell(0, 0), { key: "f", ctrlKey: true });
    fireEvent.change(input(), { target: { value: "e" } });
    const total = document.querySelectorAll("[data-cell-match]").length;
    expect(total).toBeGreaterThan(1);
    fireEvent.click(
      document.querySelector('[data-adapttable-part="find-next"]')!
    );
    expect(screen.getByText(`2 of ${total}`)).toBeInTheDocument();
  });

  it("closes on Escape, leaving no cell marked", () => {
    table({ findInTable: true });
    act(() => cell(0, 0).focus());
    fireEvent.keyDown(cell(0, 0), { key: "f", ctrlKey: true });
    fireEvent.change(input(), { target: { value: "ace" } });
    fireEvent.keyDown(input(), { key: "Escape" });
    expect(bar()).toBeNull();
    expect(document.querySelectorAll("[data-cell-match]")).toHaveLength(0);
  });

  it("leaves Ctrl/Cmd+F to the browser without the prop", () => {
    table();
    act(() => cell(0, 0).focus());
    fireEvent.keyDown(cell(0, 0), { key: "f", ctrlKey: true });
    expect(bar()).toBeNull();
  });
});
