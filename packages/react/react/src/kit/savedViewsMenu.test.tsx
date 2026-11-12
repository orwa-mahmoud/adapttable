import { defaultLabels } from "@adapttable/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { testPrimitives } from "../internal/testPrimitives";
import { createMemoryAdapter } from "../url/adapter";
import { createSavedViewsMenu } from "./savedViewsMenu";

const look = {
  panel: { maxHeight: 360 },
  row: {},
  divider: {},
  saveRow: {},
  nameInput: {},
};
const Menu = createSavedViewsMenu(
  { ...testPrimitives, deleteIcon: "×" },
  () => look
);
const part = (name: string) =>
  document.querySelector(`[data-adapttable-part="${name}"]`);

function storage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
}

function mount(url = "t.q=ada") {
  const urlAdapter = createMemoryAdapter(url);
  render(
    <Menu
      options={{
        storageKey: "views",
        storage: storage(),
        urlAdapter,
        urlKey: "t",
      }}
      labels={defaultLabels}
    />
  );
  fireEvent.click(
    screen.getByRole("button", { name: defaultLabels.savedViews })
  );
  return urlAdapter;
}

describe("createSavedViewsMenu", () => {
  it("saves the current view, keeps the panel open and the name field focused", () => {
    mount();
    expect(screen.queryByRole("separator")).toBeNull();
    const field = screen.getByLabelText(defaultLabels.viewName);
    const save = part("views-save")!;
    expect(save).toBeDisabled();
    fireEvent.change(field, { target: { value: "  Mine  " } });
    fireEvent.click(save);

    expect(screen.getByRole("button", { name: "Mine" })).toBeInTheDocument();
    expect(field).toHaveValue("");
    expect(field).toHaveFocus();
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("applies a view and closes, or deletes one and stays open", () => {
    const urlAdapter = mount();
    const field = screen.getByLabelText(defaultLabels.viewName);
    fireEvent.change(field, { target: { value: "Mine" } });
    fireEvent.click(part("views-save")!);
    fireEvent.change(field, { target: { value: "Other" } });
    fireEvent.click(part("views-save")!);

    fireEvent.click(
      screen.getByRole("button", { name: `${defaultLabels.deleteView}: Other` })
    );
    expect(screen.queryByRole("button", { name: "Other" })).toBeNull();
    expect(part("views-panel")).not.toBeNull();

    urlAdapter.setSearch("t.q=changed");
    fireEvent.click(screen.getByRole("button", { name: "Mine" }));
    expect(urlAdapter.getSearch()).toContain("t.q=ada");
    expect(part("views-panel")).toBeNull();
  });

  it("closes on Escape and hands focus back to its button", () => {
    mount();
    fireEvent.keyDown(screen.getByLabelText(defaultLabels.viewName), {
      key: "Escape",
    });
    expect(part("views-panel")).toBeNull();
    expect(
      screen.getByRole("button", { name: defaultLabels.savedViews })
    ).toHaveFocus();
  });
});
