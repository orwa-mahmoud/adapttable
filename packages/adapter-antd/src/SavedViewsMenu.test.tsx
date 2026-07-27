import { createMemoryAdapter } from "@adapttable/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SavedViewsMenu } from "./components/SavedViewsMenu";
import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

const labels = {
  savedViews: "Saved views",
  saveView: "Save view",
  viewName: "View name",
  deleteView: "Delete view",
};

function fakeStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
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

async function openMenu() {
  fireEvent.click(screen.getByRole("button", { name: "Saved views" }));
  await screen.findByText("Save view");
}

const byLabel = (name: string) =>
  document.querySelector<HTMLElement>(`[aria-label="${name}"]`)!;

describe("antd SavedViewsMenu", () => {
  it("saves the typed name (disabled while empty) and clears the input", async () => {
    const adapter = createMemoryAdapter("t.q=ali&t.page=2&other.q=keep");
    const storage = fakeStorage();
    render(
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
    await openMenu();
    const saveButton = screen.getByRole("button", { name: "Save view" });
    expect(saveButton).toBeDisabled();
    const input = screen.getByPlaceholderText("View name");
    // Whitespace-only names stay unsaveable.
    fireEvent.change(input, { target: { value: "   " } });
    expect(saveButton).toBeDisabled();
    fireEvent.change(input, { target: { value: " Mine " } });
    expect(saveButton).toBeEnabled();
    fireEvent.click(saveButton);
    // The list shows the trimmed name; the input resets for the next save.
    expect(screen.getByRole("button", { name: "Mine" })).toBeInTheDocument();
    expect(input).toHaveValue("");
    // Only this table's params are captured.
    const stored = JSON.parse(storage.store.get("views")!) as {
      name: string;
      search: string;
    }[];
    expect(stored).toHaveLength(1);
    expect(stored[0]!.search).toContain("t.q=ali");
    expect(stored[0]!.search).not.toContain("other.q");
  });

  it("clicking a view re-applies its params and closes the popover", async () => {
    const adapter = createMemoryAdapter("t.q=ali&other.q=keep");
    render(
      <SavedViewsMenu
        options={{
          storageKey: "views",
          storage: fakeStorage(),
          urlAdapter: adapter,
          urlKey: "t",
        }}
        labels={labels}
      />
    );
    await openMenu();
    fireEvent.change(screen.getByPlaceholderText("View name"), {
      target: { value: "Mine" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save view" }));
    // Mutate the URL away, then apply the captured view.
    adapter.setSearch("t.q=changed&other.q=keep");
    fireEvent.click(screen.getByRole("button", { name: "Mine" }));
    const after = new URLSearchParams(adapter.getSearch());
    expect(after.get("t.q")).toBe("ali");
    expect(after.get("other.q")).toBe("keep");
    // Applying is terminal — the menu closes like a menu item.
    expect(screen.getByRole("button", { name: "Saved views" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });

  it("deletes a view via its labelled trailing button", async () => {
    const adapter = createMemoryAdapter("");
    const storage = fakeStorage({
      views: JSON.stringify([{ name: "Mine", search: "q=1" }]),
    });
    render(
      <SavedViewsMenu
        options={{ storageKey: "views", storage, adapter }}
        labels={labels}
      />
    );
    await openMenu();
    expect(screen.getByRole("button", { name: "Mine" })).toBeInTheDocument();
    fireEvent.click(byLabel("Delete view: Mine"));
    expect(screen.queryByRole("button", { name: "Mine" })).toBeNull();
    expect(JSON.parse(storage.store.get("views")!)).toEqual([]);
  });

  it("closes on Escape (collapsing the trigger) but ignores other keys", async () => {
    render(
      <SavedViewsMenu
        options={{
          storageKey: "views",
          storage: fakeStorage(),
          urlAdapter: createMemoryAdapter(""),
        }}
        labels={labels}
      />
    );
    const trigger = screen.getByRole("button", { name: "Saved views" });
    await openMenu();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(document, { key: "ArrowDown" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("flips the popover to the start side under RTL", async () => {
    render(
      <SavedViewsMenu
        options={{
          storageKey: "views",
          storage: fakeStorage(),
          urlAdapter: createMemoryAdapter(""),
        }}
        labels={labels}
        dir="rtl"
      />
    );
    await openMenu();
    expect(
      document.querySelector(".ant-popover-placement-bottomLeft")
    ).not.toBeNull();
  });
});

describe("<DataTable savedViews> (Ant Design)", () => {
  interface Row {
    id: string;
    name: string;
  }
  const rows: Row[] = [{ id: "a", name: "Alice" }];
  const columns: ColumnDef<Row>[] = [
    { key: "name", header: "Name", accessor: (r) => r.name },
  ];

  it("mounts the saved-views trigger, defaulting to the table's URL wiring", async () => {
    const adapter = createMemoryAdapter("t.q=ali");
    const storage = fakeStorage();
    render(
      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.id}
        urlAdapter={adapter}
        urlKey="t"
        savedViews={{ storageKey: "views", storage }}
      />
    );
    await openMenu();
    fireEvent.change(screen.getByPlaceholderText("View name"), {
      target: { value: "Mine" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save view" }));
    // The capture used the TABLE's adapter + urlKey (the defaulting path).
    const stored = JSON.parse(storage.store.get("views")!) as {
      search: string;
    }[];
    expect(stored[0]!.search).toContain("t.q=ali");
  });

  it("renders no trigger without the savedViews prop", () => {
    render(<DataTable data={rows} columns={columns} rowKey={(r) => r.id} />);
    expect(screen.queryByRole("button", { name: "Saved views" })).toBeNull();
  });
});
