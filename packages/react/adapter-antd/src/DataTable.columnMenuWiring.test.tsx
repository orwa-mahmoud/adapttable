/**
 * The column menu's actions reach the table, not just the menu.
 *
 * `ColumnMenu.test.tsx` renders the menu against a fake layout, which proves
 * the widget but leaves the callbacks `<DataTable>` hands it unexercised —
 * sorting, autosizing, opening the filters panel and starting a rename all
 * run through wiring only a full render can reach.
 */
import {
  type ColumnLayoutState,
  createMemoryAdapter,
  useFrontendData,
} from "@adapttable/react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";
import { renderAntd as renderHarness } from "./test-utils";

interface Row {
  id: string;
  name: string;
  city: string;
}

const ROWS: Row[] = [
  { id: "a", name: "Alice", city: "Dubai" },
  { id: "b", name: "Bob", city: "Riyadh" },
];

const columns: ColumnDef<Row>[] = [
  {
    key: "name",
    header: "Name",
    accessor: (r) => r.name,
    sortable: true,
    renameable: true,
    filter: { type: "text" },
  },
  { key: "city", header: "City", accessor: (r) => r.city },
];

function Harness(props: {
  onColumnRename?: (key: string, name: string) => void;
  onColumnLayoutChange?: (next: ColumnLayoutState) => void;
}) {
  const source = useFrontendData<Row>({
    data: ROWS,
    urlAdapter: createMemoryAdapter(""),
    columns,
    paginationMode: "paged",
  });
  return (
    <DataTable
      source={source}
      columns={columns}
      rowKey={(r) => r.id}
      enableColumnMenu
      resizableColumns
      defaultColumnLayout={{ pinned: { name: "start" } }}
      onColumnRename={props.onColumnRename}
      onColumnLayoutChange={props.onColumnLayoutChange}
    />
  );
}

/** jsdom lays nothing out, so the cells are told what their content needs. */
function measureAs(container: HTMLElement, widths: Record<string, number>) {
  for (const [key, width] of Object.entries(widths)) {
    for (const cell of container.querySelectorAll<HTMLElement>(
      `[data-column-key="${key}"]`
    )) {
      Object.defineProperty(cell, "scrollWidth", {
        value: width,
        configurable: true,
      });
    }
  }
}

/** The most recent layout the table reported to its host. */
function lastLayout(spy: ReturnType<typeof vi.fn>): ColumnLayoutState {
  return spy.mock.calls.at(-1)?.[0] as ColumnLayoutState;
}

/** The rendered text of the name column, top row first. */
function nameColumn(container: HTMLElement): string[] {
  return [
    ...container.querySelectorAll<HTMLElement>(
      'tbody [data-column-key="name"]'
    ),
  ].map((cell) => cell.textContent ?? "");
}

/** Open the column menu and expand the per-column action list for `name`. */
async function openColumnActions(name: string) {
  fireEvent.click(screen.getByRole("button", { name: "Columns" }));
  await screen.findByText("Reset columns");
  fireEvent.click(
    screen.getByRole("button", { name: `Column actions: ${name}` })
  );
}

describe("<DataTable> (Ant Design) column menu wiring", () => {
  it("sorts the table from the menu's sort actions", async () => {
    const { container } = renderHarness(<Harness />);
    await openColumnActions("Name");

    fireEvent.click(screen.getByRole("button", { name: "Sort descending" }));

    // A modal menu hides the table from the accessibility tree while it is
    // open, so the sorted order is read off the column's own cells.
    await waitFor(() => {
      expect(nameColumn(container)[0]).toBe("Bob");
    });
  });

  it("sizes a single column to its content from the menu", async () => {
    const onColumnLayoutChange = vi.fn();
    const { container } = renderHarness(
      <Harness onColumnLayoutChange={onColumnLayoutChange} />
    );
    measureAs(container, { name: 300 });
    await openColumnActions("Name");

    fireEvent.click(
      screen.getByRole("button", { name: "Size column to content" })
    );

    // Only the column the menu was opened on is sized.
    await waitFor(() => {
      expect(onColumnLayoutChange).toHaveBeenCalled();
    });
    expect(Object.keys(lastLayout(onColumnLayoutChange).widths ?? {})).toEqual([
      "name",
    ]);
  });

  it("opens the filters panel from the menu's filter action", async () => {
    renderHarness(<Harness />);
    // Captured before the menu opens: a modal menu takes the toolbar out of
    // the accessibility tree behind it.
    const trigger = screen.getByRole("button", { name: /^Filters/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await openColumnActions("Name");

    fireEvent.click(screen.getByRole("button", { name: "Filter column" }));

    await waitFor(() => {
      expect(trigger).toHaveAttribute("aria-expanded", "true");
    });
  });

  it("renames a column through the host's rename callback", async () => {
    const onColumnRename = vi.fn();
    renderHarness(<Harness onColumnRename={onColumnRename} />);
    await openColumnActions("Name");

    fireEvent.click(screen.getByRole("button", { name: "Rename column" }));

    const field = await screen.findByLabelText("Column name");
    fireEvent.change(field, { target: { value: "Full name" } });
    fireEvent.click(screen.getByRole("button", { name: "Save name" }));

    await waitFor(() => {
      expect(onColumnRename).toHaveBeenCalledWith("name", "Full name");
    });
  });
  it("hides, shows and unpins every column from the bulk buttons", async () => {
    const onColumnLayoutChange = vi.fn();
    renderHarness(<Harness onColumnLayoutChange={onColumnLayoutChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");

    fireEvent.click(screen.getByRole("button", { name: "Hide all" }));
    await waitFor(() => {
      expect(lastLayout(onColumnLayoutChange).hidden).toEqual(["name", "city"]);
    });

    fireEvent.click(screen.getByRole("button", { name: "Show all" }));
    await waitFor(() => {
      expect(lastLayout(onColumnLayoutChange).hidden).toEqual([]);
    });

    // The harness pins `name`, so unpinning has something to clear.
    fireEvent.click(screen.getByRole("button", { name: "Unpin all" }));
    await waitFor(() => {
      expect(lastLayout(onColumnLayoutChange).pinned).toEqual({});
    });
  });
});
