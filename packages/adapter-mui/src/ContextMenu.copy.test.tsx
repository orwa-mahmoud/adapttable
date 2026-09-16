/**
 * What the context menu's Copy actually copies.
 *
 * The menu names what was clicked by row key and column key. Copying needs a
 * grid address, and the two only agree by accident: a row's position on
 * screen follows the sort, the filter and the page. So each case here right-
 * clicks a specific cell and reads the clipboard, and one of them sorts and
 * pages the table first so a source-array index would be provably wrong.
 */
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";
import { renderMui as renderKit } from "./test-utils";

interface Row {
  id: string;
  name: string;
  team: string;
}

const ROWS: Row[] = [
  { id: "1", name: "Zoe", team: "Platform" },
  { id: "2", name: "Ada", team: "Core" },
  { id: "3", name: "Ravi", team: "Docs" },
];

const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
  { key: "team", header: "Team", accessor: (r) => r.team, sortable: true },
];

function clipboard(): ReturnType<typeof vi.fn> {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  return writeText;
}

const cell = (row: number, col: number) =>
  document.querySelector<HTMLElement>(`[data-grid-cell="${row}:${col}"]`)!;

function table(): void {
  renderKit(
    <DataTable
      data={ROWS}
      columns={COLS}
      rowKey={(r) => r.id}
      urlSync={false}
      cellNavigation
      contextMenu
    />
  );
}

/** Open the menu over one cell and choose Copy. */
function copyOver(target: HTMLElement): void {
  fireEvent.contextMenu(target, { clientX: 5, clientY: 5 });
  fireEvent.click(screen.getByText("Copy"));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("context menu copy targeting (mui)", () => {
  it("copies the clicked cell when nothing is selected", async () => {
    const writeText = clipboard();
    table();

    copyOver(cell(1, 0));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledExactlyOnceWith("Ada");
    });
  });

  it("keeps the selection when the click lands inside it", async () => {
    const writeText = clipboard();
    table();
    const start = cell(0, 0);
    start.focus();
    fireEvent.keyDown(start, { key: "ArrowRight", shiftKey: true });

    copyOver(cell(0, 1));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledExactlyOnceWith("Zoe\tPlatform");
    });
  });

  it("takes the clicked cell when the click lands outside the selection", async () => {
    const writeText = clipboard();
    table();
    const start = cell(0, 0);
    start.focus();
    fireEvent.keyDown(start, { key: "ArrowRight", shiftKey: true });

    copyOver(cell(2, 1));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledExactlyOnceWith("Docs");
    });
  });

  it("follows the displayed order, not the source array", async () => {
    const writeText = clipboard();
    renderKit(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        cellNavigation
        contextMenu
      />
    );
    // Sort by name: Ada, Ravi, Zoe. The first displayed row is source index 1,
    // so a source index would copy "Zoe" here.
    fireEvent.click(screen.getByText("Name"));
    await waitFor(() => {
      expect(cell(0, 0).textContent).toBe("Ada");
    });

    copyOver(cell(0, 0));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledExactlyOnceWith("Ada");
    });
  });

  it("greys Copy out on a menu that names no cell", () => {
    const writeText = clipboard();
    table();
    // A right-click on the row outside any cell — a pinned spacer, the row's
    // own padding — names a row but no column.
    const row = document.querySelector<HTMLElement>(
      '[data-adapttable-part="row"]'
    )!;
    fireEvent.contextMenu(row, { clientX: 5, clientY: 5 });

    const entry = screen
      .getByText("Copy")
      .closest("[disabled], [aria-disabled], button, [role='menuitem']");
    expect(entry).not.toBeNull();
    expect(
      entry?.hasAttribute("disabled") === true ||
        entry?.getAttribute("aria-disabled") === "true"
    ).toBe(true);
    expect(writeText).not.toHaveBeenCalled();
  });
});
