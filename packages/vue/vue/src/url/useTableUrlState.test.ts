import { createMemoryAdapter, type UrlStateAdapter } from "@adapttable/core";
import { describe, expect, it, vi } from "vitest";
import { effectScope, shallowRef } from "vue";

import { useTableUrlState } from "./useTableUrlState";

describe("useTableUrlState", () => {
  it("uses core serialization, defaults, typed extras and stable actions", () => {
    const scope = effectScope();
    const adapter = createMemoryAdapter("page=2&limit=5&f_score=10&f_tags=a,b");
    const state = scope.run(() =>
      useTableUrlState({
        urlAdapter: adapter,
        numberExtraKeys: ["score"],
        arrayExtraKeys: ["tags"],
        defaults: { search: "initial" },
      })
    );
    if (!state) throw new Error("missing state");
    expect(state.state.value).toMatchObject({
      page: 2,
      limit: 5,
      search: "initial",
      extra: { score: 10, tags: ["a", "b"] },
    });
    const setSearch = state.setSearch;
    setSearch("updated");
    expect(state.state.value.search).toBe("updated");
    expect(state.state.value.page).toBe(1);
    expect(state.setSearch).toBe(setSearch);
    state.setLimit(10);
    state.setSort("name", "asc");
    state.setExtra("score", 20);
    state.setExtras({ tags: ["c"] });
    state.setGroupBy("team");
    state.initializeGroupBy("ignored");
    state.setGroupAggregateOverrides({});
    state.toggleSortLevel("name");
    state.setFilterTree(undefined);
    state.clearExtras();
    state.clearAll();
    expect(state.state.value.search).toBe("");
    scope.stop();
  });

  it("switches backends and namespaces without losing inactive local state", () => {
    const scope = effectScope();
    const adapter = createMemoryAdapter();
    const urlKey = shallowRef("left");
    const urlSync = shallowRef(true);
    const state = scope.run(() =>
      useTableUrlState({ urlAdapter: adapter, urlKey, urlSync })
    );
    if (!state) throw new Error("missing state");
    const setSearch = state.setSearch;
    setSearch("left query");
    urlKey.value = "right";
    expect(state.state.value.search).toBe("");
    setSearch("right query");
    urlKey.value = "left";
    expect(state.state.value.search).toBe("left query");
    urlSync.value = false;
    setSearch("private");
    expect(adapter.getSearch()).not.toContain("private");
    urlSync.value = true;
    expect(state.state.value.search).toBe("left query");
    urlSync.value = false;
    expect(state.state.value.search).toBe("private");
    scope.stop();
  });

  it("reconfigures defaults without executing function fields", () => {
    const scope = effectScope();
    const defaults = shallowRef({ limit: 5 });
    const state = scope.run(() =>
      useTableUrlState({ urlSync: false, defaults })
    );
    expect(state?.state.value.limit).toBe(5);
    defaults.value = { limit: 9 };
    expect(state?.state.value.limit).toBe(9);
    state?.setLimit(11);
    defaults.value = { limit: 15 };
    expect(state?.state.value.limit).toBe(11);
    expect(state?.state.value.defaultLimit).toBe(15);
    scope.stop();
  });

  it("normalizes an empty namespace and leaves disposed host state untouched", () => {
    const scope = effectScope();
    const adapter = createMemoryAdapter();
    const state = scope.run(() =>
      useTableUrlState({ urlAdapter: adapter, urlKey: "" })
    );
    state?.setSearch("before");
    expect(adapter.getSearch()).toBe("q=before&atv=1");
    scope.stop();
    state?.setSearch("after");
    expect(adapter.getSearch()).toBe("q=before&atv=1");
    expect(state?.state.value.search).toBe("before");
  });

  it("keeps only the active adapter subscribed and stops it once", () => {
    const scope = effectScope();
    const stops = [vi.fn(), vi.fn()];
    const starts = [vi.fn(), vi.fn()];
    const adapters = stops.map((stop, index): UrlStateAdapter => ({
      ...createMemoryAdapter(),
      subscribe: (listener) => {
        starts[index]?.();
        listener();
        return stop;
      },
    }));
    const adapter = shallowRef(adapters[0]);
    const state = scope.run(() => useTableUrlState({ urlAdapter: adapter }));
    adapter.value = adapters[1];
    expect(stops[0]).toHaveBeenCalledTimes(1);
    expect(starts[1]).toHaveBeenCalledTimes(1);
    scope.stop();
    expect(stops[1]).toHaveBeenCalledTimes(1);
    expect(state?.state.value.page).toBe(1);
  });
});
