import { describe, expect, it, vi } from "vitest";

import { createControllableStore } from "./controllableStore";

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
