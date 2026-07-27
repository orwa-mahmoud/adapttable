import {
  type ColumnDef,
  createMemoryAdapter,
  defaultLabels,
  type LayoutStorage,
  type UrlStateAdapter,
} from "@adapttable/core";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SavedViewsMenu } from "./components/SavedViewsMenu";
import { DataTable } from "./DataTable";

/** Map-backed `LayoutStorage`, so views never leak between tests. */
function memoryStorage(): LayoutStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

function MenuHarness({
  adapter,
  storage,
}: Readonly<{ adapter: UrlStateAdapter; storage: LayoutStorage }>) {
  return (
    <SavedViewsMenu
      options={{ storageKey: "test-views", storage, urlAdapter: adapter }}
      labels={defaultLabels}
    />
  );
}

/** Mount the menu over a memory URL adapter and open its dropdown. */
async function openMenu(initialSearch = "") {
  const adapter = createMemoryAdapter(initialSearch);
  render(
    <MantineProvider>
      <MenuHarness adapter={adapter} storage={memoryStorage()} />
    </MantineProvider>
  );
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: defaultLabels.savedViews }));
  await screen.findByPlaceholderText(defaultLabels.viewName);
  return adapter;
}

// Mantine renders the dropdown in a portal that role queries treat as hidden
// mid-transition; resolve interactive elements by their visible text/label.
const buttonByText = (text: string): HTMLButtonElement =>
  screen.getByText(text).closest("button")!;
const byAriaLabel = (label: string) =>
  document.querySelector<HTMLElement>(`[aria-label="${label}"]`);

const saveView = (name: string) => {
  fireEvent.change(screen.getByPlaceholderText(defaultLabels.viewName), {
    target: { value: name },
  });
  fireEvent.click(buttonByText(defaultLabels.saveView));
};

describe("SavedViewsMenu", () => {
  it("disables the save button until a non-blank name is typed", async () => {
    await openMenu();
    const input = screen.getByPlaceholderText(defaultLabels.viewName);
    const save = buttonByText(defaultLabels.saveView);
    expect(save).toBeDisabled();
    // Whitespace alone is not a name.
    fireEvent.change(input, { target: { value: "   " } });
    expect(save).toBeDisabled();
    fireEvent.change(input, { target: { value: "Q3" } });
    expect(save).toBeEnabled();
  });

  it("saves the typed name into the list, clears the input, keeps the menu open", async () => {
    await openMenu("q=alice");
    expect(screen.queryByText("Q3 outliers")).not.toBeInTheDocument();
    saveView("Q3 outliers");
    // The view is listed, the input is reset, and the dropdown is still up.
    expect(screen.getByText("Q3 outliers")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(defaultLabels.viewName)).toHaveValue("");
    expect(buttonByText(defaultLabels.saveView)).toBeDisabled();
  });

  it("applies a view: the adapter URL regains the captured table params", async () => {
    const adapter = await openMenu("q=alice&unrelated=keep");
    saveView("Mine");
    // The table state moves on; the foreign param must survive the apply.
    adapter.setSearch("q=bob&unrelated=keep");
    fireEvent.click(buttonByText("Mine"));
    const params = new URLSearchParams(adapter.getSearch());
    expect(params.get("q")).toBe("alice");
    expect(params.get("unrelated")).toBe("keep");
  });

  it("deletes a view via its labelled trailing action", async () => {
    await openMenu();
    saveView("Mine");
    const remove = byAriaLabel(`${defaultLabels.deleteView}: Mine`);
    expect(remove).not.toBeNull();
    fireEvent.click(remove!);
    expect(screen.queryByText("Mine")).not.toBeInTheDocument();
    expect(byAriaLabel(`${defaultLabels.deleteView}: Mine`)).toBeNull();
  });
});

describe("DataTable savedViews prop", () => {
  interface Row {
    id: string;
    name: string;
  }
  const rows: Row[] = [
    { id: "a", name: "Alice" },
    { id: "b", name: "Bob" },
  ];
  const columns: ColumnDef<Row>[] = [
    { key: "name", header: "Name", accessor: (r) => r.name },
  ];

  it("renders the Saved views trigger in the toolbar when set", () => {
    render(
      <MantineProvider>
        <DataTable<Row>
          data={rows}
          columns={columns}
          rowKey={(r) => r.id}
          urlAdapter={createMemoryAdapter("")}
          savedViews={{ storageKey: "dt-views", storage: memoryStorage() }}
        />
      </MantineProvider>
    );
    expect(
      screen.getByRole("button", { name: defaultLabels.savedViews })
    ).toBeInTheDocument();
  });
});
