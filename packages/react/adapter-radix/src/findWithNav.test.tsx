/**
 * Find with cell navigation: walking the matches moves the grid's focus — the
 * focus is what brings the cell into view — and the count is spoken.
 */
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { cellNavigation } from "./cell-navigation";
import { DataTable } from "./DataTable";
import { findInTable } from "./find-in-table";
import type { ColumnDef } from "./index";
import { renderRadix } from "./test-utils";

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

function table(navigable = true) {
  renderRadix(
    <DataTable<Row>
      data={ROWS}
      columns={COLS}
      rowKey={(r) => r.id}
      urlSync={false}
      forceMobile={false}
      tableLabel="People"
      classNames={{ table: "navigation-table" }}
      features={[
        ...(navigable ? [cellNavigation()] : []),
        findInTable({ button: true }),
      ]}
    />
  );
}

describe("find with cell navigation (radix)", () => {
  it("names the existing grid root and preserves table focus", () => {
    table();
    const grid = part("grid")!;
    const semanticTable = part("table")!;

    expect(
      document.querySelectorAll('[data-adapttable-part="grid"]')
    ).toHaveLength(1);
    expect(grid.tagName).toBe("DIV");
    expect(grid).toHaveClass("navigation-table");
    expect(grid.querySelector('[data-adapttable-part="table"]')).toBe(
      semanticTable
    );
    expect(semanticTable.tagName).toBe("TABLE");
    expect(screen.getAllByRole("grid")).toEqual([semanticTable]);
    expect(screen.getByRole("grid", { name: "People" })).toBe(semanticTable);
    expect(semanticTable).toHaveAttribute("aria-rowcount", "3");
    expect(semanticTable).toHaveAttribute("aria-colcount", "1");
    expect(grid).not.toHaveAttribute("role");
    expect(grid).not.toHaveAttribute("tabindex");
    expect(grid).not.toHaveAttribute("aria-label");
    expect(grid).not.toHaveAttribute("aria-rowcount");
    expect(grid).not.toHaveAttribute("aria-colcount");

    act(() => gridCell(0, 0).focus());
    fireEvent.keyDown(gridCell(0, 0), { key: "ArrowDown" });
    expect(gridCell(1, 0)).toHaveFocus();
    expect(gridCell(1, 0)).toHaveAttribute("tabindex", "0");
    expect(gridCell(0, 0)).toHaveAttribute("tabindex", "-1");
    expect(
      grid.querySelectorAll('[data-grid-cell][tabindex="0"]')
    ).toHaveLength(1);
  });

  it("omits the grid hook without cell navigation", () => {
    table(false);
    expect(part("grid")).toBeNull();
    expect(screen.queryByRole("grid")).toBeNull();
    expect(screen.getByRole("table", { name: "People" })).toBe(part("table"));
    expect(part("table")?.closest(".navigation-table")).not.toBeNull();
  });

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
