/**
 * SavedViewsMenu: saving (disabled while empty, clears after), applying a
 * view through a memory URL adapter (scoped to the table's `urlKey`),
 * deleting, and the `savedViews` DataTable prop mounting the trigger.
 *
 * Base UI portals its popover content; internals appear once the trigger opens,
 * so they are queried by label/placeholder/text after the popover mounts.
 */
import {
  createMemoryAdapter,
  defaultLabels,
  type LayoutStorage,
} from "@adapttable/core";
import { act, fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "../DataTable";
import type { ColumnDef } from "../index";
import { renderBaseUi } from "../test-utils";
import { SavedViewsMenu } from "./SavedViewsMenu";

/** In-memory `LayoutStorage` stub, inspectable per test. */
function memoryStorage(): LayoutStorage & { dump: () => string | null } {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
    dump: () => map.get("views") ?? null,
  };
}

async function mount(initialSearch = "t.q=alice&other=1") {
  const adapter = createMemoryAdapter(initialSearch);
  const storage = memoryStorage();
  renderBaseUi(
    <SavedViewsMenu
      options={{
        storageKey: "views",
        storage,
        urlAdapter: adapter,
        urlKey: "t",
      }}
      labels={defaultLabels}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: "Saved views" }));
  await screen.findByPlaceholderText("View name");
  return { adapter, storage };
}

const nameInput = () =>
  screen.getByPlaceholderText<HTMLInputElement>("View name");
const saveButton = () => screen.getByText("Save view").closest("button")!;

function saveAs(name: string) {
  fireEvent.change(nameInput(), { target: { value: name } });
  fireEvent.click(saveButton());
}

describe("<SavedViewsMenu> (Base UI)", () => {
  it("disables save while the name is empty and clears it after saving", async () => {
    const { storage } = await mount();
    expect(saveButton()).toBeDisabled();
    // Whitespace-only names stay disabled — a view needs a real name.
    fireEvent.change(nameInput(), { target: { value: "   " } });
    expect(saveButton()).toBeDisabled();

    fireEvent.change(nameInput(), { target: { value: "Mine" } });
    expect(saveButton()).not.toBeDisabled();
    fireEvent.click(saveButton());

    // The view lists, the input resets, and the list persists to storage.
    expect(screen.getByText("Mine")).toBeInTheDocument();
    expect(nameInput().value).toBe("");
    expect(saveButton()).toBeDisabled();
    expect(storage.dump()).toContain('"Mine"');
    expect(storage.dump()).toContain("t.q=alice");
  });

  it("applies a saved view: restores this table's params, leaves others", async () => {
    const { adapter } = await mount();
    saveAs("Mine");
    // The table's state moves on (and an unrelated param changes too).
    act(() => adapter.setSearch("t.q=bob&t.page=2&other=2"));

    fireEvent.click(screen.getByText("Mine"));
    // `t.*` is restored from the snapshot (stale `t.page` dropped); the
    // foreign `other` param keeps its CURRENT value.
    expect(adapter.getSearch()).toBe("other=2&t.q=alice");
  });

  it("deletes a view from its trailing icon button", async () => {
    const { storage } = await mount();
    saveAs("First");
    saveAs("Second");

    fireEvent.click(screen.getByLabelText("Delete view: First"));
    expect(screen.queryByText("First")).toBeNull();
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(storage.dump()).not.toContain('"First"');
  });
});

describe("<DataTable> savedViews prop (Base UI)", () => {
  interface Row {
    id: string;
    name: string;
  }
  const rows: Row[] = [{ id: "a", name: "Alice" }];
  const columns: ColumnDef<Row>[] = [
    { key: "name", header: "Name", accessor: (r) => r.name },
  ];

  it("mounts the saved-views trigger in the toolbar", () => {
    renderBaseUi(
      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.id}
        urlAdapter={createMemoryAdapter("")}
        savedViews={{ storageKey: "dt-views", storage: memoryStorage() }}
      />
    );
    expect(
      screen.getByRole("button", { name: "Saved views" })
    ).toBeInTheDocument();
  });
});
