import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { resetDevWarnings } from "../utils/devWarn";
import * as env from "../utils/env";
import { createMemoryAdapter } from "./adapter";
import { useTableUrlState } from "./useTableUrlState";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

function renderWith(
  initial = "",
  extra?: Parameters<typeof useTableUrlState>[0]
) {
  const adapter = createMemoryAdapter(initial);
  const view = renderHook(() => useTableUrlState({ adapter, ...extra }));
  return { adapter, ...view };
}

describe("useTableUrlState", () => {
  it("reads the initial search via the server snapshot during SSR", () => {
    const adapter = createMemoryAdapter("page=4");
    function Probe() {
      const { page } = useTableUrlState({ adapter });
      return <span>{`page-${page}`}</span>;
    }
    // Server rendering exercises the getServerSnapshot path, which reads the
    // adapter's current search synchronously.
    expect(renderToString(<Probe />)).toContain("page-4");
  });

  it("reads page / limit / search / sort from the URL", () => {
    const { result } = renderWith(
      "page=2&limit=50&q=foo&sortBy=name&sortDir=desc"
    );
    expect(result.current.page).toBe(2);
    expect(result.current.limit).toBe(50);
    expect(result.current.search).toBe("foo");
    expect(result.current.sortBy).toBe("name");
    expect(result.current.sortDir).toBe("desc");
  });

  it("applies defaults when the URL is empty", () => {
    const { result } = renderWith("", {
      defaults: { limit: 10, sortBy: "createdAt", sortDir: "asc" },
    });
    expect(result.current.limit).toBe(10);
    expect(result.current.sortBy).toBe("createdAt");
    expect(result.current.sortDir).toBe("asc");
  });

  it("defaults.sortBy alone sorts ascending (no broken tri-state)", () => {
    const { result } = renderWith("", { defaults: { sortBy: "name" } });
    expect(result.current.sortBy).toBe("name");
    expect(result.current.sortDir).toBe("asc");
  });

  it("applies default extra filters and lets URL values override them", () => {
    const withDefaults = renderWith("", {
      defaults: { extra: { status: "Active", team: ["Core"] } },
      arrayExtraKeys: ["team"],
    });
    expect(withDefaults.result.current.extra).toEqual({
      status: "Active",
      team: ["Core"],
    });

    const overridden = renderWith("f_status=Archived&f_team=Platform", {
      defaults: { extra: { status: "Active", team: ["Core"] } },
      arrayExtraKeys: ["team"],
    });
    expect(overridden.result.current.extra).toEqual({
      status: "Archived",
      team: ["Platform"],
    });
  });

  it("setPage writes >1 and drops the param at 1", () => {
    const { result, adapter } = renderWith();
    act(() => result.current.setPage(3));
    expect(adapter.getSearch()).toBe("page=3");
    act(() => result.current.setPage(1));
    expect(adapter.getSearch()).toBe("");
  });

  it("setLimit resets page and drops the param at the default", () => {
    const { result, adapter } = renderWith("page=4");
    act(() => result.current.setLimit(50));
    expect(adapter.getSearch()).toBe("limit=50");
    act(() => result.current.setLimit(25));
    expect(adapter.getSearch()).toBe("");
  });

  it("setSearch writes q, trims, resets page, and clears when blank", () => {
    const { result, adapter } = renderWith("page=2");
    act(() => result.current.setSearch("  hi  "));
    expect(adapter.getSearch()).toBe("q=hi");
    act(() => result.current.setSearch(""));
    expect(adapter.getSearch()).toBe("");
  });

  it("setSort writes both keys and clears them with undefined", () => {
    const { result, adapter } = renderWith();
    act(() => result.current.setSort("name", "desc"));
    expect(adapter.getSearch()).toContain("sortBy=name");
    expect(adapter.getSearch()).toContain("sortDir=desc");
    act(() => result.current.setSort(undefined));
    expect(adapter.getSearch()).toBe("");
  });

  it("setSort defaults the direction to asc", () => {
    const { result, adapter } = renderWith();
    act(() => result.current.setSort("name"));
    expect(adapter.getSearch()).toContain("sortDir=asc");
  });

  it("setExtra / setExtras round-trip and clearAll wipes state", () => {
    const { result, adapter } = renderWith("keep=me", {
      arrayExtraKeys: ["tags"],
    });
    act(() => result.current.setExtra("status", "Active"));
    expect(adapter.getSearch()).toContain("f_status=Active");
    act(() => result.current.setExtras({ tags: ["a", "b"] }));
    expect(adapter.getSearch()).toContain("f_tags=a%2Cb");
    act(() => result.current.clearAll());
    expect(adapter.getSearch()).toBe("keep=me");
  });

  it("setExtra(undefined) removes a filter", () => {
    const { result, adapter } = renderWith("f_status=Active");
    act(() => result.current.setExtra("status", undefined));
    expect(adapter.getSearch()).toBe("");
  });

  it("disabled mode keeps state local and never touches the URL", () => {
    window.history.replaceState(null, "", "/?page=9");
    const { result } = renderHook(() => useTableUrlState({ enabled: false }));
    expect(result.current.page).toBe(1);
    act(() => result.current.setPage(4));
    expect(result.current.page).toBe(4);
    expect(window.location.search).toBe("?page=9");
  });

  it("defaults to the history adapter when enabled and no adapter is given", () => {
    window.history.replaceState(null, "", "/?page=7");
    const { result } = renderHook(() => useTableUrlState());
    expect(result.current.page).toBe(7);
    act(() => result.current.setPage(2));
    expect(window.location.search).toBe("?page=2");
  });

  it("uses the memory adapter when enabled but not in a browser (SSR)", () => {
    const spy = vi.spyOn(env, "isBrowser").mockReturnValue(false);
    try {
      window.history.replaceState(null, "", "/?page=8");
      // Enabled + no adapter, but isBrowser() is false → falls through to the
      // per-hook memory adapter instead of the history adapter, so the URL is
      // ignored and never mutated.
      const { result } = renderHook(() => useTableUrlState());
      expect(result.current.page).toBe(1);
      act(() => result.current.setPage(5));
      expect(result.current.page).toBe(5);
      expect(window.location.search).toBe("?page=8");
    } finally {
      spy.mockRestore();
    }
  });

  describe("SSR server snapshot", () => {
    it("hydrates from an empty snapshot with the default adapter", () => {
      // The server rendered from an empty memory store; hydration must agree
      // (the live URL applies right after hydration instead of mismatching).
      window.history.replaceState(null, "", "/?page=4");
      function Probe() {
        const { page } = useTableUrlState();
        return <span>{`page-${page}`}</span>;
      }
      expect(renderToString(<Probe />)).toContain("page-1");
    });
  });

  describe("duplicate urlKey detection", () => {
    it("warns when two tables share one adapter without distinct urlKeys", () => {
      const warn = vi
        .spyOn(console, "warn")
        .mockImplementation(() => undefined);
      const adapter = createMemoryAdapter("");
      renderHook(() => {
        useTableUrlState({ adapter });
        useTableUrlState({ adapter });
      });
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("share the URL namespace")
      );
      resetDevWarnings();
      vi.restoreAllMocks();
    });

    it("stays silent when each table has its own urlKey", () => {
      const warn = vi
        .spyOn(console, "warn")
        .mockImplementation(() => undefined);
      const adapter = createMemoryAdapter("");
      renderHook(() => {
        useTableUrlState({ adapter, urlKey: "left" });
        useTableUrlState({ adapter, urlKey: "right" });
      });
      expect(warn).not.toHaveBeenCalled();
      vi.restoreAllMocks();
    });
  });

  describe("urlKey namespacing", () => {
    it("reads only its own namespaced params, ignoring the bare keys", () => {
      const { result } = renderWith(
        "left.page=2&left.q=foo&left.sortBy=name&left.sortDir=desc&left.f_team=Core&q=other&page=9",
        { urlKey: "left", arrayExtraKeys: ["team"] }
      );
      expect(result.current.page).toBe(2);
      expect(result.current.search).toBe("foo");
      expect(result.current.sortBy).toBe("name");
      expect(result.current.sortDir).toBe("desc");
      expect(result.current.extra).toEqual({ team: ["Core"] });
    });

    it("writes namespaced params and never clobbers another table's keys", () => {
      const { result, adapter } = renderWith("right.q=keep&right.f_team=Data", {
        urlKey: "left",
        arrayExtraKeys: ["team"],
      });
      act(() => result.current.setSearch("hi"));
      act(() => result.current.setSort("name", "asc"));
      act(() => result.current.setExtra("team", ["Core"]));
      // Page last — setSort/setExtra reset it, mirroring the real flow.
      act(() => result.current.setPage(3));
      const url = adapter.getSearch();
      expect(url).toContain("left.q=hi");
      expect(url).toContain("left.page=3");
      expect(url).toContain("left.sortBy=name");
      expect(url).toContain("left.f_team=Core");
      // The other table's params survive untouched.
      expect(url).toContain("right.q=keep");
      expect(url).toContain("right.f_team=Data");
    });

    it("clearAll only wipes its own namespace", () => {
      const { result, adapter } = renderWith(
        "left.q=foo&left.f_team=Core&right.q=bar",
        { urlKey: "left", arrayExtraKeys: ["team"] }
      );
      act(() => result.current.clearAll());
      expect(adapter.getSearch()).toBe("right.q=bar");
    });
  });

  describe("clearing defaulted state (explicit-clear markers)", () => {
    it("clearing a defaulted search sticks instead of resurrecting it", () => {
      const { result } = renderWith("", { defaults: { search: "ada" } });
      expect(result.current.search).toBe("ada");
      act(() => result.current.setSearch(""));
      expect(result.current.search).toBe("");
    });

    it("clearing a defaulted sort sticks instead of resurrecting it", () => {
      const { result } = renderWith("", {
        defaults: { sortBy: "name", sortDir: "desc" },
      });
      act(() => result.current.setSort(undefined));
      expect(result.current.sortBy).toBeUndefined();
      expect(result.current.sortDir).toBeUndefined();
    });

    it("removing a defaulted extra filter sticks (chip ✕ stays removed)", () => {
      const { result } = renderWith("", {
        defaults: { extra: { status: "Active" } },
      });
      expect(result.current.extra).toEqual({ status: "Active" });
      act(() => result.current.setExtra("status", ""));
      expect(result.current.extra).toEqual({});
    });

    it("setExtra on another key keeps an untouched default alive", () => {
      const { result } = renderWith("", {
        defaults: { extra: { status: "Active" } },
      });
      act(() => result.current.setExtra("team", "Core"));
      expect(result.current.extra).toEqual({ status: "Active", team: "Core" });
    });

    it("clearAll clears defaulted search/sort/extra for good", () => {
      const { result } = renderWith("", {
        defaults: { search: "ada", sortBy: "name", extra: { team: "Core" } },
      });
      act(() => result.current.clearAll());
      expect(result.current.search).toBe("");
      expect(result.current.sortBy).toBeUndefined();
      expect(result.current.extra).toEqual({});
    });

    it("keeps URLs clean when no default exists for the cleared key", () => {
      const { result, adapter } = renderWith("q=foo&f_team=Core", {
        arrayExtraKeys: ["team"],
      });
      act(() => result.current.clearAll());
      expect(adapter.getSearch()).toBe("");
    });

    it("setPage(1) wins over a defaults.page greater than 1", () => {
      const { result } = renderWith("", { defaults: { page: 3 } });
      expect(result.current.page).toBe(3);
      act(() => result.current.setPage(1));
      expect(result.current.page).toBe(1);
    });

    it("setLimit clamps to the range the read side accepts", () => {
      const { result } = renderWith("");
      act(() => result.current.setLimit(9999));
      expect(result.current.limit).toBe(500);
      act(() => result.current.setLimit(0));
      expect(result.current.limit).toBe(1);
    });
  });
});

describe("clearExtras", () => {
  it("clears every extra filter and resets the page, keeping search/sort", () => {
    const adapter = createMemoryAdapter(
      "q=li&sortBy=name&sortDir=desc&page=3&f_team=core&f_status=active"
    );
    const { result } = renderHook(() => useTableUrlState({ adapter }));
    act(() => result.current.clearExtras());
    expect(result.current.extra).toEqual({});
    expect(result.current.page).toBe(1);
    expect(result.current.search).toBe("li");
    expect(result.current.sortBy).toBe("name");
  });

  it("stamps cleared markers so defaulted extras stay cleared", () => {
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() =>
      useTableUrlState({ adapter, defaults: { extra: { team: "core" } } })
    );
    expect(result.current.extra.team).toBe("core");
    act(() => result.current.clearExtras());
    // The default must NOT resurrect.
    expect(result.current.extra.team).toBeUndefined();
    expect(adapter.getSearch()).toContain("f_team=");
  });
});

describe("multi-sort chain", () => {
  it("toggleSortLevel cycles asc → desc → removed and supersedes single sort", () => {
    const adapter = createMemoryAdapter("sortBy=name&sortDir=desc");
    const { result } = renderHook(() => useTableUrlState({ adapter }));
    act(() => result.current.toggleSortLevel("team"));
    expect(result.current.sortLevels).toEqual([{ key: "team", dir: "asc" }]);
    // Single-sort params dropped once a chain exists.
    expect(adapter.getSearch()).not.toContain("sortBy");
    act(() => result.current.toggleSortLevel("age"));
    act(() => result.current.toggleSortLevel("team"));
    expect(result.current.sortLevels).toEqual([
      { key: "team", dir: "desc" },
      { key: "age", dir: "asc" },
    ]);
    act(() => result.current.toggleSortLevel("team"));
    act(() => result.current.toggleSortLevel("team"));
    act(() => result.current.toggleSortLevel("team"));
    expect(result.current.sortLevels).toEqual([
      { key: "age", dir: "asc" },
      { key: "team", dir: "desc" },
    ]);
  });

  it("round-trips the chain through the URL", () => {
    const adapter = createMemoryAdapter("sort=name%3Aasc,age%3Adesc");
    const { result } = renderHook(() => useTableUrlState({ adapter }));
    expect(result.current.sortLevels).toEqual([
      { key: "name", dir: "asc" },
      { key: "age", dir: "desc" },
    ]);
  });

  it("ignores malformed chain pairs from hand-edited URLs", () => {
    const adapter = createMemoryAdapter("sort=name%3Aasc,bogus,age%3Asideways");
    const { result } = renderHook(() => useTableUrlState({ adapter }));
    expect(result.current.sortLevels).toEqual([{ key: "name", dir: "asc" }]);
  });

  it("clearAll clears an active chain (rows never stay visibly sorted)", () => {
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() => useTableUrlState({ adapter }));
    act(() => result.current.toggleSortLevel("team"));
    act(() => result.current.toggleSortLevel("age"));
    expect(result.current.sortLevels).toHaveLength(2);
    act(() => result.current.clearAll());
    expect(result.current.sortLevels).toEqual([]);
    expect(adapter.getSearch()).not.toContain("sort");
  });

  it("a plain setSort resets an active chain (clicks never look dead)", () => {
    const adapter = createMemoryAdapter("sort=name%3Aasc,age%3Adesc");
    const { result } = renderHook(() => useTableUrlState({ adapter }));
    expect(result.current.sortLevels).toHaveLength(2);
    act(() => result.current.setSort("city", "asc"));
    expect(result.current.sortLevels).toEqual([]);
    expect(result.current.sortBy).toBe("city");
    expect(adapter.getSearch()).not.toContain("sort=");
  });
});
