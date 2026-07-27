/**
 * Saved-views menu: capture the table's URL params under a name, re-apply
 * them on demand, delete views — plus the DataTable `savedViews` prop that
 * mounts the menu in the toolbar wired to the table's own URL backend.
 */
import { createMemoryAdapter, type LayoutStorage } from "@adapttable/core";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SavedViewsMenu } from "./components/SavedViewsMenu";
import { type ColumnDef, DataTable } from "./index";
import { renderMui } from "./test-utils";

const labels = {
  savedViews: "Saved views",
  saveView: "Save view",
  viewName: "View name",
  deleteView: "Delete view",
};

function fakeStorage(): LayoutStorage & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    store,
  };
}

// `hidden: true`: while the popover is open MUI marks the background (and so
// the trigger) `aria-hidden`, which default role queries would exclude.
const trigger = () =>
  screen.getByRole("button", { name: "Saved views", hidden: true });
const saveButton = () => screen.getByRole("button", { name: "Save view" });
const nameInput = () => screen.getByLabelText("View name");

function mountMenu(initialSearch: string) {
  const adapter = createMemoryAdapter(initialSearch);
  const storage = fakeStorage();
  renderMui(
    <SavedViewsMenu
      options={{
        storageKey: "views",
        storage,
        urlAdapter: adapter,
        urlKey: "t",
      }}
      labels={labels}
    />
  );
  fireEvent.click(trigger());
  return { adapter, storage };
}

function saveAs(name: string) {
  fireEvent.change(nameInput(), { target: { value: name } });
  fireEvent.click(saveButton());
}

describe("SavedViewsMenu (MUI)", () => {
  it("saves the table's own params under the typed (trimmed) name; disabled while empty", () => {
    const { storage } = mountMenu("t.q=ali&other.q=keep");
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(saveButton()).toBeDisabled();
    // Whitespace alone never enables the save action.
    fireEvent.change(nameInput(), { target: { value: "   " } });
    expect(saveButton()).toBeDisabled();

    fireEvent.change(nameInput(), { target: { value: " Mine " } });
    expect(saveButton()).toBeEnabled();
    fireEvent.click(saveButton());
    // The input clears, the trimmed view lists, and the capture holds ONLY
    // this table's namespaced params.
    expect(nameInput()).toHaveValue("");
    expect(screen.getByRole("button", { name: "Mine" })).toBeInTheDocument();
    const stored = storage.store.get("views")!;
    expect(stored).toContain("Mine");
    expect(stored).toContain("t.q=ali");
    expect(stored).not.toContain("other.q");

    // Escape closes the popover (MUI's own onClose path).
    fireEvent.keyDown(nameInput(), { key: "Escape" });
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("applies a saved view back onto the adapter and closes the popover", () => {
    const { adapter } = mountMenu("t.q=ali&other.q=keep");
    saveAs("Mine");
    // The URL mutates away; applying restores ONLY this table's params.
    adapter.setSearch("t.q=changed&other.q=keep");
    fireEvent.click(screen.getByRole("button", { name: "Mine" }));
    const after = new URLSearchParams(adapter.getSearch());
    expect(after.get("t.q")).toBe("ali");
    expect(after.get("other.q")).toBe("keep");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("deletes a view via its labelled trailing button", () => {
    const { storage } = mountMenu("t.q=ali");
    saveAs("Mine");
    fireEvent.click(screen.getByRole("button", { name: "Delete view: Mine" }));
    expect(screen.queryByRole("button", { name: "Mine" })).toBeNull();
    expect(storage.store.get("views")).toBe("[]");
  });
});

describe("DataTable savedViews prop (MUI)", () => {
  interface Row {
    id: string;
    name: string;
  }
  const rows: Row[] = [
    { id: "1", name: "Abby" },
    { id: "2", name: "Zane" },
  ];
  const columns: ColumnDef<Row>[] = [
    { key: "name", header: "Name", accessor: (r) => r.name },
  ];

  it("mounts the toolbar trigger and defaults to the table's URL backend", () => {
    const adapter = createMemoryAdapter("q=ab");
    const storage = fakeStorage();
    renderMui(
      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.id}
        urlAdapter={adapter}
        savedViews={{ storageKey: "views", storage }}
      />
    );
    fireEvent.click(trigger());
    saveAs("Mine");
    // The menu captured through the table's OWN adapter (no explicit
    // `adapter`/`urlKey` in the prop), proving the defaults wired up.
    expect(storage.store.get("views")).toContain("q=ab");
  });
});
