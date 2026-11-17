import { describe, expect, it, vi } from "vitest";

import {
  clearSelection,
  replaceSelection,
  rowSelectedReader,
  SELECTED_IDS,
  toggleRowSelected,
  toggleRowsSelected,
} from "./selectionState";
import { createTableStore, selectFrom } from "./tableStore";
import {
  configureView,
  setSort,
  VIEW_CONFIG,
  VIEW_OVERRIDES,
  viewStateReader,
} from "./viewState";

describe("the selection slice", () => {
  it("toggles one row, many rows, replaces and clears", () => {
    const store = createTableStore();
    store.dispatch(toggleRowSelected("a"));
    expect([...store.read(SELECTED_IDS)]).toEqual(["a"]);
    store.dispatch(toggleRowsSelected(["a", "b"]));
    expect(store.read(SELECTED_IDS)).toEqual(new Set(["a", "b"]));
    store.dispatch(toggleRowsSelected(["a", "b"]));
    expect(store.read(SELECTED_IDS).size).toBe(0);
    store.dispatch(replaceSelection(["c"]));
    expect([...store.read(SELECTED_IDS)]).toEqual(["c"]);
    store.dispatch(clearSelection());
    expect(store.read(SELECTED_IDS).size).toBe(0);
  });

  it("tells a row's reader only about that row", () => {
    const store = createTableStore();
    const a = rowSelectedReader(store, "a");
    const b = rowSelectedReader(store, "b");
    const heardA = vi.fn();
    const heardB = vi.fn();
    a.subscribe(heardA);
    b.subscribe(heardB);

    store.dispatch(toggleRowSelected("b"));

    expect(heardA).not.toHaveBeenCalled();
    expect(heardB).toHaveBeenCalledTimes(1);
    expect(b.getSnapshot()).toBe(true);
    expect(a.getSnapshot()).toBe(false);
  });

  it("tells nobody when the same rows are selected again", () => {
    const store = createTableStore();
    store.dispatch(replaceSelection(["a", "b"]));
    const heard = vi.fn();
    store.slice(SELECTED_IDS).subscribe(heard);
    store.dispatch(replaceSelection(["b", "a"]));
    expect(heard).not.toHaveBeenCalled();
  });
});

describe("one store for the view and the rows", () => {
  it("tells sort and view readers about a sort, and no selection reader", () => {
    const store = createTableStore();
    store.dispatch(configureView({ defaults: {} }));
    const view = viewStateReader();
    const viewReader = selectFrom(store, (read) =>
      view(read(VIEW_OVERRIDES), read(VIEW_CONFIG))
    );
    const sortReader = selectFrom(
      store,
      (read) => {
        const { sortBy, sortDir, sortLevels } = view(
          read(VIEW_OVERRIDES),
          read(VIEW_CONFIG)
        );
        return { sortBy, sortDir, sortLevels };
      },
      (a, b) =>
        a.sortBy === b.sortBy &&
        a.sortDir === b.sortDir &&
        a.sortLevels === b.sortLevels
    );
    const heard = {
      view: vi.fn(),
      sort: vi.fn(),
      selection: vi.fn(),
      row: vi.fn(),
    };
    viewReader.subscribe(heard.view);
    sortReader.subscribe(heard.sort);
    store.slice(SELECTED_IDS).subscribe(heard.selection);
    rowSelectedReader(store, "a").subscribe(heard.row);

    store.dispatch(setSort({ key: "name" }));

    expect(heard.view).toHaveBeenCalledTimes(1);
    expect(heard.sort).toHaveBeenCalledTimes(1);
    expect(heard.selection).not.toHaveBeenCalled();
    expect(heard.row).not.toHaveBeenCalled();
    expect(sortReader.getSnapshot()).toMatchObject({
      sortBy: "name",
      sortDir: "asc",
    });
  });
});
