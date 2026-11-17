import { describe, expect, it, vi } from "vitest";

import {
  controllableSlice,
  createControllableStore,
} from "./controllableStore";
import { SELECTED_IDS, toggleRowSelected } from "./selectionState";
import { createTableStore } from "./tableStore";
import { VIEW_OVERRIDES } from "./viewState";

describe("createControllableStore", () => {
  it("holds its own value until a host takes control, and tells subscribers", () => {
    const store = createControllableStore(1);
    const listener = vi.fn();
    const release = store.subscribe(listener);
    expect(store.isControlled()).toBe(false);
    store.commit(2);
    expect(store.getSnapshot()).toBe(2);
    expect(listener).toHaveBeenCalledTimes(1);
    store.update((value) => value + 1);
    expect(store.current()).toBe(3);
    release();
    store.commit(4);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("reads the host's value and sends every change to it when controlled", () => {
    const onChange = vi.fn();
    const store = createControllableStore(0);
    const listener = vi.fn();
    store.subscribe(listener);
    store.control({ value: 10, onChange });
    expect(store.isControlled()).toBe(true);
    expect(store.getSnapshot()).toBe(10);
    store.update((value) => value + 1);
    store.update((value) => value + 1);
    expect(onChange.mock.calls).toEqual([[11], [11]]);
    expect(store.getSnapshot()).toBe(10);
    expect(listener).not.toHaveBeenCalled();
  });

  it("composes controlled changes made before the host renders again, when asked", () => {
    const onChange = vi.fn();
    const store = createControllableStore(0, { readsOwnCommits: true });
    store.control({ value: 10, onChange });
    store.update((value) => value + 1);
    store.update((value) => value + 1);
    expect(onChange.mock.calls).toEqual([[11], [12]]);
    expect(store.current()).toBe(12);
    store.control({ value: 10, onChange });
    expect(store.current()).toBe(10);
  });

  it("tells an observer about uncontrolled changes, when asked", () => {
    const onChange = vi.fn();
    const store = createControllableStore("a", { observeUncontrolled: true });
    store.control({ value: undefined, onChange });
    store.commit("b");
    expect(store.getSnapshot()).toBe("b");
    expect(onChange).toHaveBeenCalledWith("b");

    const quiet = createControllableStore("a");
    quiet.control({ value: undefined, onChange });
    quiet.commit("c");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("skips a commit equal to the current value", () => {
    const onChange = vi.fn();
    const store = createControllableStore(
      { n: 1 },
      { equals: (a, b) => a.n === b.n }
    );
    store.control({ value: { n: 5 }, onChange });
    store.commit({ n: 5 });
    expect(onChange).not.toHaveBeenCalled();
    store.commit({ n: 6 });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe("controllableSlice", () => {
  it("keeps the table's own value in a slice of the table's store", () => {
    const store = createTableStore();
    const selected = controllableSlice(store, SELECTED_IDS);
    const heard = vi.fn();
    const viewHeard = vi.fn();
    selected.subscribe(heard);
    store.slice(VIEW_OVERRIDES).subscribe(viewHeard);

    selected.commit(new Set(["a"]));

    expect(store.read(SELECTED_IDS)).toEqual(new Set(["a"]));
    expect(selected.getSnapshot()).toBe(store.read(SELECTED_IDS));
    expect(heard).toHaveBeenCalledTimes(1);
    expect(viewHeard).not.toHaveBeenCalled();

    store.dispatch(toggleRowSelected("b"));
    expect(selected.getSnapshot()).toEqual(new Set(["a", "b"]));
    expect(heard).toHaveBeenCalledTimes(2);
  });

  it("sends changes to the host and leaves the slice while controlled", () => {
    const store = createTableStore();
    const selected = controllableSlice(store, SELECTED_IDS);
    const onChange = vi.fn();
    selected.control({ value: new Set(["x"]), onChange });

    selected.update((ids) => new Set([...ids, "y"]));

    expect(onChange).toHaveBeenCalledWith(new Set(["x", "y"]));
    expect(store.read(SELECTED_IDS).size).toBe(0);
    expect(selected.getSnapshot()).toEqual(new Set(["x"]));
  });
});
