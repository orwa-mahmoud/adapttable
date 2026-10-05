import { afterEach, describe, expect, it, vi } from "vitest";

import { EMPTY_COLUMN_LAYOUT } from "../columns/columnLayoutModel";
import { createMemoryAdapter } from "./historyAdapter";
import { columnLayoutSlice } from "./viewStateSlices";
import { createUrlSliceStore } from "./viewStateStore";

const a = { ...EMPTY_COLUMN_LAYOUT, hidden: ["a"] };
const b = { ...EMPTY_COLUMN_LAYOUT, hidden: ["b"] };
afterEach(() => vi.useRealTimers());

describe("URL slice synchronous reentry", () => {
  it("keeps the newest accepted value and timer when a snapshot subscriber writes again", () => {
    vi.useFakeTimers();
    const adapter = createMemoryAdapter("other.q=kept");
    const store = createUrlSliceStore(
      { adapter, urlKey: "one" },
      columnLayoutSlice,
      {}
    );
    const stop = store.subscribe(() => {
      if (store.getSnapshot() === a) store.set(b);
    });
    store.set(a);
    expect(store.getSnapshot()).toEqual(b);
    expect(vi.getTimerCount()).toBe(1);
    vi.runAllTimers();
    expect(store.getSnapshot()).toEqual(b);
    expect(adapter.getSearch()).toContain("one.colHide=b");
    expect(adapter.getSearch()).toContain("other.q=kept");
    stop();
  });
  it("lets subscription cleanup flush the scheduled value before set returns", () => {
    vi.useFakeTimers();
    const adapter = createMemoryAdapter();
    const store = createUrlSliceStore({ adapter }, columnLayoutSlice, {});
    const stop = store.subscribe(() => {
      stop();
      store.flush();
    });
    store.set(a);
    expect(adapter.getSearch()).toContain("colHide=a");
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each(["flush", "timer"] as const)(
    "preserves a newer value accepted by an adapter callback during %s",
    (mode) => {
      vi.useFakeTimers();
      const adapter = createMemoryAdapter();
      const store = createUrlSliceStore({ adapter }, columnLayoutSlice, {});
      const stop = adapter.subscribe(() => {
        if (adapter.getSearch().includes("colHide=a")) store.set(b);
      });
      store.set(a);
      if (mode === "flush") store.flush();
      else vi.advanceTimersToNextTimer();
      expect(store.getSnapshot()).toEqual(b);
      expect(vi.getTimerCount()).toBe(1);
      vi.runAllTimers();
      expect(store.getSnapshot()).toEqual(b);
      expect(adapter.getSearch()).toContain("colHide=b");
      stop();
    }
  );
  it("makes a nested flush harmless after releasing the value being written", () => {
    vi.useFakeTimers();
    const adapter = createMemoryAdapter();
    const store = createUrlSliceStore({ adapter }, columnLayoutSlice, {});
    const stop = adapter.subscribe(() => store.flush());
    store.set(a);
    store.flush();
    expect(adapter.getSearch()).toContain("colHide=a");
    expect(store.getSnapshot()).toEqual(a);
    expect(vi.getTimerCount()).toBe(0);
    stop();
  });
});
