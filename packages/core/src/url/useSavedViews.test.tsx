import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import * as env from "../utils/env";
import { createMemoryAdapter } from "./adapter";
import { useSavedViews } from "./useSavedViews";

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

describe("useSavedViews", () => {
  it("captures only this table's params and re-applies them", () => {
    const adapter = createMemoryAdapter(
      "t.q=ali&t.f_team=core&t.page=2&other.q=keep"
    );
    const storage = fakeStorage();
    const { result } = renderHook(() =>
      useSavedViews({ storageKey: "views", storage, adapter, urlKey: "t" })
    );
    act(() => result.current.save("My view"));
    expect(result.current.views).toHaveLength(1);
    // A foreign table's params never leak into the capture.
    expect(result.current.views[0]!.search).not.toContain("other.q");

    // Mutate the URL away, then apply the view.
    adapter.setSearch("t.q=changed&other.q=keep");
    act(() => result.current.apply("My view"));
    const after = new URLSearchParams(adapter.getSearch());
    expect(after.get("t.q")).toBe("ali");
    expect(after.get("t.f_team")).toBe("core");
    expect(after.get("t.page")).toBe("2");
    expect(after.get("other.q")).toBe("keep");
  });

  it("captures and re-applies the multi-sort chain exactly", () => {
    const adapter = createMemoryAdapter("t.sort=name%3Aasc%2Cage%3Adesc");
    const storage = fakeStorage();
    const { result } = renderHook(() =>
      useSavedViews({ storageKey: "views", storage, adapter, urlKey: "t" })
    );
    act(() => result.current.save("chained"));
    expect(result.current.views[0]!.search).toContain("t.sort=");

    // A live chain must be DISPLACED by a chainless view (the chain
    // supersedes sortBy/sortDir, so leaving it wins over the view's sort).
    adapter.setSearch("t.sortBy=city&t.sortDir=asc");
    act(() => result.current.save("single"));
    adapter.setSearch("t.sort=team%3Aasc");
    act(() => result.current.apply("single"));
    let params = new URLSearchParams(adapter.getSearch());
    expect(params.get("t.sort")).toBeNull();
    expect(params.get("t.sortBy")).toBe("city");

    // And the chained view restores its chain exactly.
    act(() => result.current.apply("chained"));
    params = new URLSearchParams(adapter.getSearch());
    expect(params.get("t.sort")).toBe("name:asc,age:desc");
    expect(params.get("t.sortBy")).toBeNull();
  });

  it("urlSync: false keeps views working without touching the address bar", () => {
    const before = window.location.search;
    const storage = fakeStorage();
    const { result } = renderHook(() =>
      useSavedViews({ storageKey: "views", storage, urlSync: false })
    );
    act(() => result.current.save("v"));
    act(() => result.current.apply("v"));
    expect(result.current.views).toHaveLength(1);
    expect(window.location.search).toBe(before);
  });

  it("apply never writes params the table does not own", () => {
    const adapter = createMemoryAdapter("t.q=live&app=keep");
    const storage = fakeStorage({
      // External input: an old or hand-edited stored view carrying params
      // that belong to the surrounding app.
      views: JSON.stringify([
        { name: "v", search: "t.q=saved&app=hijacked&other.q=hijacked" },
      ]),
    });
    const { result } = renderHook(() =>
      useSavedViews({ storageKey: "views", storage, adapter, urlKey: "t" })
    );
    act(() => result.current.apply("v"));
    const params = new URLSearchParams(adapter.getSearch());
    expect(params.get("t.q")).toBe("saved");
    expect(params.get("app")).toBe("keep");
    expect(params.get("other.q")).toBeNull();
  });

  it("same-name save replaces; remove deletes; unknown apply is a no-op", () => {
    const adapter = createMemoryAdapter("q=a");
    const storage = fakeStorage();
    const { result } = renderHook(() =>
      useSavedViews({ storageKey: "views", storage, adapter })
    );
    act(() => result.current.save("v"));
    adapter.setSearch("q=b");
    act(() => result.current.save("v"));
    expect(result.current.views).toHaveLength(1);
    expect(result.current.views[0]!.search).toBe("q=b");
    act(() => result.current.apply("missing"));
    expect(adapter.getSearch()).toBe("q=b");
    act(() => result.current.remove("v"));
    expect(result.current.views).toHaveLength(0);
  });

  it("hydrates from storage and survives corrupt payloads", () => {
    const adapter = createMemoryAdapter("");
    const good = fakeStorage({
      views: JSON.stringify([{ name: "x", search: "q=1" }, { bad: true }]),
    });
    const { result } = renderHook(() =>
      useSavedViews({ storageKey: "views", storage: good, adapter })
    );
    expect(result.current.views).toEqual([{ name: "x", search: "q=1" }]);

    const corrupt = fakeStorage({ views: "{not json" });
    const { result: r2 } = renderHook(() =>
      useSavedViews({ storageKey: "views", storage: corrupt, adapter })
    );
    expect(r2.current.views).toEqual([]);
  });

  it("a throwing storage backend keeps the in-memory list working", () => {
    const adapter = createMemoryAdapter("q=1");
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => undefined,
    };
    const { result } = renderHook(() =>
      useSavedViews({ storageKey: "views", storage, adapter })
    );
    act(() => result.current.save("v"));
    expect(result.current.views).toHaveLength(1);
  });

  it("defaults to localStorage in the browser", () => {
    const adapter = createMemoryAdapter("q=z");
    const { result } = renderHook(() =>
      useSavedViews({ storageKey: "views-default", adapter })
    );
    act(() => result.current.save("v"));
    expect(
      JSON.parse(globalThis.localStorage.getItem("views-default")!)
    ).toEqual([{ name: "v", search: "q=z" }]);
    globalThis.localStorage.removeItem("views-default");
  });

  it("no storage at all (SSR) → empty list; non-array payloads ignored", () => {
    const adapter = createMemoryAdapter("");
    // storage: undefined exercise — simulate SSR by passing a storage whose
    // getItem yields a non-array JSON value.
    const nonArray = fakeStorage({ views: JSON.stringify({ nope: 1 }) });
    const { result } = renderHook(() =>
      useSavedViews({ storageKey: "views", storage: nonArray, adapter })
    );
    expect(result.current.views).toEqual([]);
    // Truly empty key → empty list.
    const empty = fakeStorage();
    const { result: r2 } = renderHook(() =>
      useSavedViews({ storageKey: "views", storage: empty, adapter })
    );
    expect(r2.current.views).toEqual([]);
  });

  it("works in-memory under SSR (no storage backend at all)", () => {
    const spy = vi.spyOn(env, "safeLocalStorage").mockReturnValue(undefined);
    const adapter = createMemoryAdapter("q=1");
    const { result } = renderHook(() =>
      useSavedViews({ storageKey: "ssr-views", adapter })
    );
    expect(result.current.views).toEqual([]);
    act(() => result.current.save("v"));
    expect(result.current.views).toHaveLength(1);
    spy.mockRestore();
  });
});
