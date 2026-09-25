import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createHistoryAdapter,
  createMemoryAdapter,
  getHistoryAdapter,
  resetHistoryAdapter,
  resolveUrlAdapter,
} from "./historyAdapter";

afterEach(() => {
  resetHistoryAdapter();
  window.history.replaceState(null, "", "/");
});

describe("createMemoryAdapter", () => {
  it("round-trips the search string and strips a leading ?", () => {
    const a = createMemoryAdapter("?page=2");
    expect(a.getSearch()).toBe("page=2");
    a.setSearch("page=3");
    expect(a.getSearch()).toBe("page=3");
  });

  it("notifies subscribers on change and stops after unsubscribe", () => {
    const a = createMemoryAdapter();
    const cb = vi.fn();
    const off = a.subscribe(cb);
    a.setSearch("q=hi");
    expect(cb).toHaveBeenCalledTimes(1);
    off();
    a.setSearch("q=bye");
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

describe("createHistoryAdapter", () => {
  it("reads and replaces the query string without a leading ?", () => {
    window.history.replaceState(null, "", "/list?page=1");
    const a = createHistoryAdapter();
    expect(a.getSearch()).toBe("page=1");
    a.setSearch("page=2");
    expect(window.location.search).toBe("?page=2");
  });

  it("clears the search when given an empty string", () => {
    window.history.replaceState(null, "", "/list?page=1");
    const a = createHistoryAdapter();
    a.setSearch("");
    expect(window.location.search).toBe("");
  });

  it("pushes a history entry when push:true", () => {
    const a = createHistoryAdapter();
    const spy = vi.spyOn(window.history, "pushState");
    a.setSearch("page=5", { push: true });
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("attaches the popstate listener once and detaches only on the last unsubscribe", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const a = createHistoryAdapter();
    const cb1 = vi.fn();
    const cb2 = vi.fn();

    const off1 = a.subscribe(cb1);
    const popstateAdds = addSpy.mock.calls.filter(([t]) => t === "popstate");
    expect(popstateAdds).toHaveLength(1);

    // Second subscriber must NOT add another popstate listener.
    const off2 = a.subscribe(cb2);
    expect(addSpy.mock.calls.filter(([t]) => t === "popstate")).toHaveLength(1);

    // Both still receive popstate notifications.
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);

    // Removing one of two keeps the listener attached.
    off1();
    expect(removeSpy.mock.calls.filter(([t]) => t === "popstate")).toHaveLength(
      0
    );
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(cb2).toHaveBeenCalledTimes(2);

    // Removing the last subscriber detaches the popstate listener.
    off2();
    expect(removeSpy.mock.calls.filter(([t]) => t === "popstate")).toHaveLength(
      1
    );

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it("notifies on setSearch and on popstate, and detaches on last unsubscribe", () => {
    const a = createHistoryAdapter();
    const cb = vi.fn();
    const off = a.subscribe(cb);
    a.setSearch("a=1");
    expect(cb).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(cb).toHaveBeenCalledTimes(2);
    off();
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(cb).toHaveBeenCalledTimes(2);
  });
});

describe("getHistoryAdapter", () => {
  it("returns a stable singleton across calls", () => {
    expect(getHistoryAdapter()).toBe(getHistoryAdapter());
  });

  it("creates a fresh instance after reset", () => {
    const first = getHistoryAdapter();
    resetHistoryAdapter();
    expect(getHistoryAdapter()).not.toBe(first);
  });

  it("falls back to a memory adapter when there is no window (SSR)", () => {
    vi.stubGlobal("window", undefined);
    const a = getHistoryAdapter();
    a.setSearch("x=1");
    expect(a.getSearch()).toBe("x=1");
    vi.unstubAllGlobals();
  });
});

describe("resolveUrlAdapter", () => {
  // `enabled: false` means "this state is not syncing", so writes must land in
  // memory whoever supplied the adapter.
  it("returns the local adapter while disabled, even with an explicit one", () => {
    const explicit = createMemoryAdapter("");
    const local = createMemoryAdapter("");
    expect(resolveUrlAdapter(explicit, false, local)).toBe(local);
  });

  it("returns the explicit adapter while enabled", () => {
    const explicit = createMemoryAdapter("");
    const local = createMemoryAdapter("");
    expect(resolveUrlAdapter(explicit, true, local)).toBe(explicit);
  });

  it("returns the shared history adapter in a browser with no explicit adapter", () => {
    const local = createMemoryAdapter("");
    expect(resolveUrlAdapter(undefined, true, local)).toBe(getHistoryAdapter());
  });

  it("returns the local adapter under SSR", () => {
    const local = createMemoryAdapter("");
    vi.stubGlobal("window", undefined);
    expect(resolveUrlAdapter(undefined, true, local)).toBe(local);
    vi.unstubAllGlobals();
  });
});
