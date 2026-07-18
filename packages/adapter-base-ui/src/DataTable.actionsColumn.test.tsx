/**
 * The injected actions column as a first-class citizen of column management:
 * hide it from the Columns menu, end-pin it in ONE click with zero data
 * columns pinned, and round-trip both through layout persistence.
 */
import {
  createMemoryAdapter,
  type LayoutStorage,
  useColumnLayoutStorageState,
  useFrontendData,
} from "@adapttable/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

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
  { key: "name", header: "Name", accessor: (r) => r.name },
  { key: "city", header: "City", accessor: (r) => r.city },
];
const rowActions = [{ key: "del", label: "Delete", onClick: vi.fn() }];

/** In-memory `LayoutStorage` shared across mounts to prove persistence. */
function memoryStorage(): LayoutStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

let adapter: ReturnType<typeof createMemoryAdapter>;

function Harness({ storage }: Readonly<{ storage: LayoutStorage }>) {
  const { layout, onLayoutChange } = useColumnLayoutStorageState({
    storageKey: "actions-layout",
    storage,
  });
  const source = useFrontendData<Row>({ data: ROWS, adapter, columns });
  return (
    <DataTable
      source={source}
      columns={columns}
      rowKey={(r) => r.id}
      rowActions={rowActions}
      enableColumnMenu
      columnLayout={layout}
      onColumnLayoutChange={onLayoutChange}
    />
  );
}

function mount(storage: LayoutStorage) {
  adapter = createMemoryAdapter("");
  return render(<Harness storage={storage} />);
}

async function openColumnsMenu() {
  fireEvent.click(screen.getByRole("button", { name: "Columns" }));
  await screen.findByText("Reset columns", undefined, { timeout: 5000 });
}

const byLabel = (name: string) =>
  document.querySelector<HTMLElement>(`[aria-label="${name}"]`)!;

const actionsHeader = () =>
  screen.getByRole("columnheader", { name: "Actions" });

const actionCells = () =>
  screen
    .getAllByRole("button", { name: "Delete" })
    .map((button) => button.closest("td")!);

describe("<DataTable> (Base UI) actions column management", () => {
  it("end-pins the actions column in ONE click with zero data pins, and persists it", async () => {
    const storage = memoryStorage();
    const view = mount(storage);
    // Unpinned baseline: the actions cells sit in normal flow.
    expect(actionsHeader().style.position).not.toBe("sticky");

    await openColumnsMenu();
    fireEvent.click(byLabel("Pin to end: Actions"));

    // ONE click sticks the header and every body cell to the inline end —
    // no data column is pinned to the end (or at all).
    expect(actionsHeader().style.position).toBe("sticky");
    expect(actionsHeader().style.insetInlineEnd).toBe("0px");
    for (const cell of actionCells()) {
      expect(cell.style.position).toBe("sticky");
      expect(cell.style.insetInlineEnd).toBe("0px");
      // Opaque background so scrolled data can't bleed through the pin.
      expect(cell.style.background).not.toBe("");
    }
    // The layout state round-trips the reserved "actions" key into storage…
    expect(storage.getItem("actions-layout")).toContain('"actions":"end"');

    // …and a fresh mount restores the end-pinned actions column.
    view.unmount();
    mount(storage);
    expect(actionsHeader().style.position).toBe("sticky");
    expect(actionsHeader().style.insetInlineEnd).toBe("0px");
  });

  it("hides and re-shows the actions column from the Columns menu, persisting it", async () => {
    const storage = memoryStorage();
    const view = mount(storage);
    expect(actionsHeader()).toBeInTheDocument();

    await openColumnsMenu();
    fireEvent.click(byLabel("Hide column: Actions"));

    // Hidden: the column (header + per-row action buttons) is gone entirely.
    expect(screen.queryByRole("columnheader", { name: "Actions" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
    expect(storage.getItem("actions-layout")).toContain("actions");

    // The hidden state survives a remount through the persisted layout.
    view.unmount();
    mount(storage);
    expect(screen.queryByRole("columnheader", { name: "Actions" })).toBeNull();

    // The menu row flipped to "show"; one click restores the column.
    await openColumnsMenu();
    fireEvent.click(byLabel("Show column: Actions"));
    expect(actionsHeader()).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Delete" })).toHaveLength(
      ROWS.length
    );
  });

  it("still sticks the actions cells when a data column is pinned to the end", () => {
    // A data column end-pinned via the layout (the menu only toggles the START
    // pin; the end edge is set programmatically). The actions edge must stick
    // so the pinned data column can't slide beneath it.
    adapter = createMemoryAdapter("");
    render(
      <DataTable
        data={ROWS}
        columns={columns}
        rowKey={(r) => r.id}
        rowActions={rowActions}
        enableColumnMenu
        defaultColumnLayout={{ pinned: { city: "end" } }}
      />
    );
    expect(actionsHeader().style.position).toBe("sticky");
    for (const cell of actionCells()) {
      expect(cell.style.position).toBe("sticky");
    }
  });
});
