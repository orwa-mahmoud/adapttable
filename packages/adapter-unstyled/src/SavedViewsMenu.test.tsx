import {
  createMemoryAdapter,
  defaultLabels,
  type SavedView,
} from "@adapttable/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SavedViewsMenu } from "./components/SavedViewsMenu";
import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

const KEY = "test-views";

/** An in-memory `LayoutStorage` with a `read` peek for assertions. */
function memoryStorage(views?: SavedView[]) {
  const store = new Map<string, string>();
  if (views) store.set(KEY, JSON.stringify(views));
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    read: () => JSON.parse(store.get(KEY) ?? "[]") as SavedView[],
  };
}

function renderMenu({
  views,
  url = "",
  classNames = {},
}: {
  views?: SavedView[];
  url?: string;
  classNames?: Parameters<typeof SavedViewsMenu>[0]["classNames"];
} = {}) {
  const storage = memoryStorage(views);
  const adapter = createMemoryAdapter(url);
  render(
    <SavedViewsMenu
      options={{ storageKey: KEY, storage, adapter }}
      labels={defaultLabels}
      classNames={classNames}
    />
  );
  return { storage, adapter };
}

const trigger = () => screen.getByRole("button", { name: "Saved views" });
const panel = () =>
  document.querySelector('[data-adapttable-part="views-panel"]');

describe("unstyled SavedViewsMenu", () => {
  it("saves the table-scoped params under the trimmed name and clears the input", () => {
    const { storage } = renderMenu({ url: "?q=alice&page=2&foreign=x" });
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(trigger()).not.toHaveAttribute("data-active");
    fireEvent.click(trigger());
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(trigger()).toHaveAttribute("data-active");

    // Empty and whitespace-only names cannot be saved.
    const saveButton = screen.getByRole("button", { name: "Save view" });
    const input = screen.getByRole("textbox", { name: "View name" });
    expect(input).toHaveAttribute("placeholder", "View name");
    expect(saveButton).toBeDisabled();
    fireEvent.change(input, { target: { value: "   " } });
    expect(saveButton).toBeDisabled();

    fireEvent.change(input, { target: { value: " Mine " } });
    expect(saveButton).toBeEnabled();
    fireEvent.click(saveButton);

    // The view lists under its trimmed name; only this table's params were
    // captured (the foreign param stays out); the input reset for the next.
    expect(screen.getByRole("button", { name: "Mine" })).toBeInTheDocument();
    expect(storage.read()).toEqual([
      { name: "Mine", search: "q=alice&page=2" },
    ]);
    expect(input).toHaveValue("");
    expect(saveButton).toBeDisabled();
  });

  it("applies a view through the adapter and closes the panel", () => {
    const { adapter } = renderMenu({
      views: [{ name: "Alpha", search: "q=zz&sortBy=name" }],
      url: "?q=current&page=3&foreign=keep",
    });
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("button", { name: "Alpha" }));

    expect(panel()).toBeNull();
    // The view's params replace the table's; foreign params survive.
    const params = new URLSearchParams(adapter.getSearch());
    expect(params.get("q")).toBe("zz");
    expect(params.get("sortBy")).toBe("name");
    expect(params.get("page")).toBeNull();
    expect(params.get("foreign")).toBe("keep");
  });

  it("deletes a view in place (panel stays open)", () => {
    const { storage } = renderMenu({
      views: [
        { name: "Alpha", search: "q=a" },
        { name: "Beta", search: "q=b" },
      ],
    });
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("button", { name: "Delete view: Alpha" }));

    expect(screen.queryByRole("button", { name: "Alpha" })).toBeNull();
    expect(screen.getByRole("button", { name: "Beta" })).toBeInTheDocument();
    expect(storage.read()).toEqual([{ name: "Beta", search: "q=b" }]);
    expect(panel()).toBeInTheDocument();
  });

  it("closes on Escape (restoring focus to the trigger) and on outside click", () => {
    renderMenu({ views: [{ name: "Alpha", search: "q=a" }] });
    fireEvent.click(trigger());
    expect(panel()).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(panel()).toBeNull();
    expect(trigger()).toHaveFocus();

    fireEvent.click(trigger());
    fireEvent.mouseDown(document.body);
    expect(panel()).toBeNull();
  });

  it("exposes every part's className hook", () => {
    renderMenu({
      views: [{ name: "Alpha", search: "q=a" }],
      classNames: {
        viewsButton: "my-vb",
        viewsPanel: "my-vp",
        viewsItem: "my-vi",
        viewsDelete: "my-vd",
        viewsInput: "my-vin",
        viewsSave: "my-vs",
      },
    });
    fireEvent.click(trigger());
    const part = (name: string) =>
      document.querySelector(`[data-adapttable-part="${name}"]`);
    expect(part("views-button")).toHaveClass("my-vb");
    expect(part("views-panel")).toHaveClass("my-vp");
    expect(part("views-item")).toHaveClass("my-vi");
    expect(part("views-delete")).toHaveClass("my-vd");
    expect(part("views-input")).toHaveClass("my-vin");
    expect(part("views-save")).toHaveClass("my-vs");
    expect(part("views-divider")).toBeInTheDocument();
  });

  it("mounts in the DataTable toolbar wired to the table's urlAdapter", () => {
    interface Row {
      id: string;
      name: string;
    }
    const columns: ColumnDef<Row>[] = [
      { key: "name", header: "Name", accessor: (r) => r.name },
    ];
    const storage = memoryStorage();
    render(
      <DataTable<Row>
        data={[{ id: "a", name: "Alice" }]}
        columns={columns}
        rowKey={(r) => r.id}
        urlAdapter={createMemoryAdapter("?q=seed")}
        savedViews={{ storageKey: KEY, storage }}
      />
    );

    // The trigger renders inside the toolbar, and saving captures the
    // TABLE's url state — proof the table's adapter was wired through.
    expect(
      trigger().closest('[data-adapttable-part="toolbar"]')
    ).toBeInTheDocument();
    fireEvent.click(trigger());
    fireEvent.change(screen.getByRole("textbox", { name: "View name" }), {
      target: { value: "S1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save view" }));
    expect(storage.read()).toEqual([
      expect.objectContaining({ name: "S1" }) as SavedView,
    ]);
    const saved = new URLSearchParams(storage.read()[0]!.search);
    expect(saved.get("q")).toBe("seed");
  });

  it("with urlSync off, views share the table's memory backend and never touch the URL", async () => {
    interface Row {
      id: string;
      name: string;
    }
    const columns: ColumnDef<Row>[] = [
      { key: "name", header: "Name", accessor: (r) => r.name },
    ];
    const storage = memoryStorage();
    const before = window.location.search;
    render(
      <DataTable<Row>
        data={[
          { id: "a", name: "Alice" },
          { id: "b", name: "Bob" },
        ]}
        columns={columns}
        rowKey={(r) => r.id}
        urlSync={false}
        savedViews={{ storageKey: KEY, storage }}
      />
    );

    // Filter the table, wait for the debounced commit to land.
    fireEvent.change(screen.getByPlaceholderText("Search…"), {
      target: { value: "Alice" },
    });
    await waitFor(() => {
      expect(screen.queryByText("Bob")).not.toBeInTheDocument();
    });

    // Save: the capture must see the table's live in-memory state — proof
    // the menu shares the table's backend rather than the (empty) real URL.
    fireEvent.click(trigger());
    fireEvent.change(screen.getByRole("textbox", { name: "View name" }), {
      target: { value: "S1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save view" }));
    const saved = new URLSearchParams(storage.read()[0]!.search);
    expect(saved.get("q")).toBe("Alice");

    // And the address bar stayed untouched throughout.
    expect(window.location.search).toBe(before);
  });
});
