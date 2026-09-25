/**
 * Find with cell navigation: walking the matches moves the grid's focus — the
 * focus is what brings the cell into view — and the count is spoken.
 */
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { cellNavigation } from "./cell-navigation";
import { DataTable } from "./DataTable";
import { findInTable } from "./find-in-table";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "1", name: "Ada" },
  { id: "2", name: "Zoe" },
  { id: "3", name: "Adam" },
];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
];

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);
const findInput = () =>
  document.querySelector<HTMLInputElement>(
    '[data-adapttable-part="find-bar"] input'
  )!;
const current = () =>
  document.querySelector<HTMLElement>("[data-cell-match-current]");
const gridCell = (row: number, col: number) =>
  document.querySelector<HTMLElement>(`[data-grid-cell="${row}:${col}"]`)!;

function table() {
  render(
    <DataTable<Row>
      data={ROWS}
      columns={COLS}
      rowKey={(r) => r.id}
      urlSync={false}
      forceMobile={false}
      features={[cellNavigation(), findInTable({ button: true })]}
    />
  );
}

describe("find with cell navigation (shadcn)", () => {
  it("opens from the toolbar control", () => {
    table();
    fireEvent.click(part("find-button")!);
    expect(part("find-bar")).not.toBeNull();
  });

  it.each([
    ["Ctrl", { ctrlKey: true }],
    ["Cmd", { metaKey: true }],
  ])("opens on %s+F with focus on a cell", (_, modifier) => {
    table();
    act(() => gridCell(0, 0).focus());
    fireEvent.keyDown(gridCell(0, 0), { key: "f", ...modifier });
    expect(part("find-bar")).not.toBeNull();
  });

  it("walks the matches by moving grid focus to the current one", async () => {
    table();
    fireEvent.click(part("find-button")!);
    fireEvent.change(findInput(), { target: { value: "ad" } });

    await waitFor(() => {
      expect(current()).toHaveTextContent("Ada");
    });
    expect(document.activeElement).toBe(current());
    expect(part("find-count")).toHaveTextContent("1 of 2");
    expect(part("find-count")?.tagName).toBe("OUTPUT");

    fireEvent.click(part("find-next")!);
    await waitFor(() => {
      expect(current()).toHaveTextContent("Adam");
    });
    expect(document.activeElement).toBe(current());
    expect(part("find-count")).toHaveTextContent("2 of 2");

    fireEvent.keyDown(findInput(), { key: "Enter" });
    await waitFor(() => {
      expect(current()).toHaveTextContent("Ada");
    });
    expect(document.activeElement).toBe(current());
  });
});
