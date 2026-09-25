/**
 * What the built-in context-menu entries actually do.
 *
 * Opening the menu proves the binding; choosing an entry proves the wiring
 * behind it. Each kit passes its own handlers down to the live gate, so a
 * mis-wired entry — sorting the wrong column, hiding nothing, opening no
 * filter surface — is only visible from a real table.
 */
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";
import { renderChakra as renderKit } from "./test-utils";

interface Row {
  id: string;
  name: string;
  team: string;
}

const ROWS: Row[] = [
  { id: "1", name: "Zoe", team: "Core" },
  { id: "2", name: "Ada", team: "Docs" },
];
const COLS: ColumnDef<Row>[] = [
  {
    key: "name",
    header: "Name",
    accessor: (r) => r.name,
    sortable: true,
    filter: { type: "text" },
  },
  { key: "team", header: "Team", accessor: (r) => r.team, sortable: true },
];

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

const headerCells = () => [
  ...document.querySelectorAll<HTMLElement>(
    '[data-adapttable-part="header-cell"]'
  ),
];

const bodyText = () =>
  [
    ...document.querySelectorAll<HTMLElement>('[data-adapttable-part="cell"]'),
  ].map((cell) => cell.textContent ?? "");

function table(): void {
  renderKit(
    <DataTable
      data={ROWS}
      columns={COLS}
      rowKey={(r) => r.id}
      urlSync={false}
      cellNavigation
      contextMenu
      filters={[{ key: "name", type: "text", label: "Name" }]}
    />
  );
}

/** Open the menu over the first header cell and choose one entry. */
function chooseOnHeader(label: string): void {
  table();
  fireEvent.contextMenu(headerCells()[0]!, { clientX: 5, clientY: 5 });
  fireEvent.click(screen.getByText(label));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("context menu entries (chakra)", () => {
  it("sorts the column the menu was opened over", async () => {
    chooseOnHeader("Sort ascending");
    await waitFor(() => {
      expect(headerCells()[0]).toHaveAttribute("aria-sort", "ascending");
    });
    expect(bodyText()[0]).toBe("Ada");
  });

  it("hides the column the menu was opened over", async () => {
    chooseOnHeader("Hide column");
    await waitFor(() => {
      expect(headerCells()).toHaveLength(1);
    });
    expect(headerCells()[0]?.textContent).toContain("Team");
  });

  it("opens the filter surface for that column", async () => {
    chooseOnHeader("Filter column");
    await waitFor(() => {
      expect(part("filters-form")).not.toBeNull();
    });
  });

  it("copies the selected cells from a cell menu", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    table();
    const cell = document.querySelector<HTMLElement>('[data-grid-cell="0:0"]')!;
    cell.focus();
    fireEvent.keyDown(cell, { key: "ArrowRight", shiftKey: true });
    fireEvent.contextMenu(cell, { clientX: 5, clientY: 5 });
    fireEvent.click(screen.getByText("Copy"));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("Zoe\tCore");
    });
  });
});
