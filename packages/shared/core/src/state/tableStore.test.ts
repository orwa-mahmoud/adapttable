import { describe, expect, it, vi } from "vitest";

import {
  createTableStore,
  defineAction,
  defineSlice,
  selectFrom,
} from "./tableStore";

const COUNT = defineSlice("test/count", () => 0);
const NAMES = defineSlice<readonly string[]>("test/names", () => []);
const FLAG = defineSlice("test/flag", () => false);

const increment = defineAction<number>("test/increment", (store, by) => {
  store.update(COUNT, (count) => count + by);
});
const rename = defineAction<readonly string[]>(
  "test/rename",
  (store, names) => {
    store.write(NAMES, names);
  }
);
const both = defineAction<void>("test/both", (store) => {
  store.update(COUNT, (count) => count + 1);
  store.update(NAMES, (names) => [...names, "x"]);
});

describe("createTableStore", () => {
  it("starts each slice at its initial value", () => {
    const store = createTableStore();
    expect(store.read(COUNT)).toBe(0);
    expect(store.read(NAMES)).toEqual([]);
  });

  it("starts with the state a seed writes", () => {
    const store = createTableStore((writer) => {
      writer.write(COUNT, 3);
      writer.write(NAMES, ["a"]);
    });
    expect(store.read(COUNT)).toBe(3);
    expect(store.read(NAMES)).toEqual(["a"]);
    const heard = vi.fn();
    store.slice(COUNT).subscribe(heard);
    store.dispatch(increment(1));
    expect(heard).toHaveBeenCalledTimes(1);
    expect(store.read(COUNT)).toBe(4);
  });

  it("keeps each store's slices apart", () => {
    const first = createTableStore();
    const second = createTableStore();
    first.dispatch(increment(2));
    expect(first.read(COUNT)).toBe(2);
    expect(second.read(COUNT)).toBe(0);
  });

  it("tells a slice's readers when an action changes it, and only them", () => {
    const store = createTableStore();
    const counted = vi.fn();
    const named = vi.fn();
    store.slice(COUNT).subscribe(counted);
    store.slice(NAMES).subscribe(named);

    store.dispatch(increment(1));

    expect(counted).toHaveBeenCalledTimes(1);
    expect(named).not.toHaveBeenCalled();
    expect(store.slice(COUNT).getSnapshot()).toBe(1);
  });

  it("tells nobody about a write that changes nothing", () => {
    const store = createTableStore();
    const counted = vi.fn();
    store.slice(COUNT).subscribe(counted);

    store.dispatch(increment(0));

    expect(counted).not.toHaveBeenCalled();
  });

  it("tells a listener once for an action that writes several slices", () => {
    const store = createTableStore();
    const both$ = selectFrom(
      store,
      (read) => [read(COUNT), read(NAMES)] as const
    );
    const heard = vi.fn();
    const counted = vi.fn();
    both$.subscribe(heard);
    store.slice(COUNT).subscribe(counted);

    store.dispatch(both());

    expect(heard).toHaveBeenCalledTimes(1);
    expect(counted).toHaveBeenCalledTimes(1);
    expect(both$.getSnapshot()).toEqual([1, ["x"]]);
  });

  it("holds every notification of a batch until it ends", () => {
    const store = createTableStore();
    const counted = vi.fn(() => {
      expect(store.read(NAMES)).toEqual(["a"]);
    });
    store.slice(COUNT).subscribe(counted);

    store.batch(() => {
      store.dispatch(increment(1));
      store.dispatch(increment(1));
      store.dispatch(rename(["a"]));
    });

    expect(counted).toHaveBeenCalledTimes(1);
    expect(store.read(COUNT)).toBe(2);
  });

  it("tells a selector's reader only when what it selects changes", () => {
    const store = createTableStore();
    const parity = selectFrom(store, (read) => read(COUNT) % 2 === 0);
    const heard = vi.fn();
    parity.subscribe(heard);

    store.dispatch(increment(2));
    expect(heard).not.toHaveBeenCalled();
    store.dispatch(increment(1));
    expect(heard).toHaveBeenCalledTimes(1);
    expect(parity.getSnapshot()).toBe(false);
  });

  it("follows the slices a selector reads as they change", () => {
    const store = createTableStore();
    const read$ = selectFrom(store, (read) =>
      read(FLAG) ? read(NAMES).length : read(COUNT)
    );
    const heard = vi.fn();
    read$.subscribe(heard);

    store.dispatch(rename(["a"]));
    expect(heard).not.toHaveBeenCalled();

    store.batch((writer) => writer.write(FLAG, true));
    expect(heard).toHaveBeenCalledTimes(1);
    expect(read$.getSnapshot()).toBe(1);

    store.dispatch(increment(5));
    expect(heard).toHaveBeenCalledTimes(1);
    store.dispatch(rename(["a", "b"]));
    expect(heard).toHaveBeenCalledTimes(2);
  });

  it("returns the same snapshot until what it selects changes", () => {
    const store = createTableStore();
    const pair = selectFrom(
      store,
      (read) => ({ count: read(COUNT) }),
      (a, b) => a.count === b.count
    );
    const first = pair.getSnapshot();
    expect(pair.getSnapshot()).toBe(first);
    pair.subscribe(() => undefined);
    store.dispatch(rename(["a"]));
    expect(pair.getSnapshot()).toBe(first);
    store.dispatch(increment(1));
    expect(pair.getSnapshot()).not.toBe(first);
  });

  it("stops listening when the last reader leaves", () => {
    const store = createTableStore();
    const parity = selectFrom(store, (read) => read(COUNT) % 2 === 0);
    const heard = vi.fn();
    const stop = parity.subscribe(heard);
    stop();

    store.dispatch(increment(1));

    expect(heard).not.toHaveBeenCalled();
    expect(parity.getSnapshot()).toBe(false);
  });

  it("names each action by its type", () => {
    expect(increment.type).toBe("test/increment");
    expect(increment(3)).toMatchObject({ type: "test/increment", payload: 3 });
  });

  it("applies none of an action's writes to listeners when it throws", () => {
    const store = createTableStore();
    const heard = vi.fn();
    store.slice(COUNT).subscribe(heard);
    const failing = defineAction<void>("test/fail", (writer) => {
      writer.update(COUNT, (count) => count + 1);
      throw new Error("reducer failed");
    });

    expect(() => store.dispatch(failing())).toThrow("reducer failed");
    expect(store.read(COUNT)).toBe(0);
    expect(heard).not.toHaveBeenCalled();
  });
});
