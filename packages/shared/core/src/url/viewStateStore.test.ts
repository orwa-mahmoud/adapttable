import { afterEach, describe, expect, it, vi } from "vitest";

import { resetDevWarnings } from "../utils/devWarn";
import { createMemoryAdapter } from "./historyAdapter";
import {
  createTableViewStore,
  createUrlSliceStore,
  type TableViewStateConfig,
  type UrlSliceSpec,
} from "./viewStateStore";

afterEach(() => {
  resetDevWarnings();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function tableStore(
  search = "",
  config: TableViewStateConfig = {},
  urlKey?: string
) {
  const adapter = createMemoryAdapter(search);
  const store = createTableViewStore({ adapter, urlKey }, config);
  return { adapter, store };
}

describe("createTableViewStore — reading", () => {
  it("reads every piece of the query state", () => {
    const { store } = tableStore(
      "page=3&limit=50&q=%20ada%20&sortBy=name&sortDir=desc&groupBy=team&f_status=Active"
    );
    expect(store.getSnapshot()).toEqual({
      page: 3,
      limit: 50,
      defaultLimit: 25,
      search: "ada",
      sortBy: "name",
      sortDir: "desc",
      sortLevels: [],
      groupBy: "team",
      groupAggregateOverrides: {},
      extra: { status: "Active" },
      filterTree: undefined,
    });
  });

  it("applies defaults while the URL is silent, and cleared markers override them", () => {
    const defaults = {
      page: 2,
      limit: 10,
      search: "seed",
      sortBy: "age",
      groupBy: "team",
      extra: { status: "Active", tier: "gold" },
    };
    const silent = tableStore("", { defaults }).store.getSnapshot();
    expect(silent).toMatchObject({
      page: 2,
      limit: 10,
      defaultLimit: 10,
      search: "seed",
      sortBy: "age",
      sortDir: "asc",
      groupBy: "team",
      extra: { status: "Active", tier: "gold" },
    });
    const cleared = tableStore("q=&sortBy=&groupBy=&f_status=", {
      defaults,
    }).store.getSnapshot();
    expect(cleared).toMatchObject({
      search: "",
      sortBy: undefined,
      sortDir: undefined,
      groupBy: undefined,
      extra: { tier: "gold" },
    });
  });

  it("adopts a defaulted direction, and falls back to ascending for an explicit sort", () => {
    expect(
      tableStore("", {
        defaults: { sortBy: "age", sortDir: "desc" },
      }).store.getSnapshot().sortDir
    ).toBe("desc");
    expect(
      tableStore("sortBy=name", {
        defaults: { sortDir: "desc" },
      }).store.getSnapshot().sortDir
    ).toBe("asc");
  });

  it("parses the configured number and array extra keys", () => {
    const numberExtraKeys = ["age"];
    const arrayExtraKeys = ["tags"];
    const { store } = tableStore("f_age=41&f_tags=a,b", {
      numberExtraKeys,
      arrayExtraKeys,
    });
    expect(store.getSnapshot().extra).toEqual({ age: 41, tags: ["a", "b"] });
  });

  it("reads only its own namespace", () => {
    const { store } = tableStore("left.page=4&page=9", {}, "left");
    expect(store.getSnapshot().page).toBe(4);
  });
});

describe("createTableViewStore — snapshots", () => {
  it("returns the same snapshot until the URL changes", () => {
    const { adapter, store } = tableStore("page=2");
    const first = store.getSnapshot();
    expect(store.getSnapshot()).toBe(first);
    adapter.setSearch("page=3");
    expect(store.getSnapshot()).not.toBe(first);
    expect(store.getSnapshot().page).toBe(3);
  });

  it("keeps the snapshot for an equal configuration and rebuilds it for a changed one", () => {
    const extra = { status: "Active" };
    const { store } = tableStore("", { defaults: { extra, limit: 10 } });
    const first = store.getSnapshot();
    store.configure({ defaults: { extra, limit: 10 } });
    expect(store.getSnapshot()).toBe(first);

    store.configure({ defaults: { extra, limit: 20 } });
    const second = store.getSnapshot();
    expect(second).not.toBe(first);
    expect(second.limit).toBe(20);
    // The bag's inputs did not change, so it keeps its identity.
    expect(second.extra).toBe(first.extra);
  });

  it("serves the hydration search on the server, empty by default", () => {
    const adapter = createMemoryAdapter("page=5");
    expect(createTableViewStore({ adapter }).getServerSnapshot().page).toBe(1);
    const explicit = createTableViewStore({
      adapter,
      serverSearch: () => "page=7",
    });
    expect(explicit.getServerSnapshot().page).toBe(7);
    expect(explicit.getServerSnapshot()).toBe(explicit.getServerSnapshot());
  });

  it("tells subscribers when the URL changes", () => {
    const { adapter, store } = tableStore();
    const listener = vi.fn();
    const release = store.subscribe(listener);
    adapter.setSearch("page=2");
    expect(listener).toHaveBeenCalledTimes(1);
    release();
    adapter.setSearch("page=3");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("createTableViewStore — mutators", () => {
  it("sets the page, resetting to a marker only when a later default would resurface", () => {
    const { adapter, store } = tableStore("page=4");
    store.setPage(6);
    expect(adapter.getSearch()).toBe("page=6&atv=1");
    store.setPage(1);
    expect(adapter.getSearch()).toBe("atv=1");

    const defaulted = tableStore("page=4", { defaults: { page: 3 } });
    defaulted.store.setPage(0);
    expect(defaulted.adapter.getSearch()).toBe("page=1&atv=1");
  });

  it("clamps the limit, drops a limit equal to the default, and resets the page", () => {
    const { adapter, store } = tableStore("page=3");
    store.setLimit(10_000);
    expect(adapter.getSearch()).toBe("limit=500&atv=1");
    store.setLimit(0.2);
    expect(adapter.getSearch()).toBe("limit=1&atv=1");
    store.setLimit(25);
    expect(adapter.getSearch()).toBe("atv=1");
  });

  it("trims the search and records clearing a defaulted one", () => {
    const { adapter, store } = tableStore();
    store.setSearch("  ada ");
    expect(adapter.getSearch()).toBe("q=ada&atv=1");
    store.setSearch("  ");
    expect(adapter.getSearch()).toBe("atv=1");

    const defaulted = tableStore("", { defaults: { search: "seed" } });
    defaulted.store.setSearch("");
    expect(defaulted.adapter.getSearch()).toBe("q=&atv=1");
  });

  it("sets and clears a single sort, dropping any sort chain", () => {
    const { adapter, store } = tableStore("sort=name:asc,age:desc");
    store.setSort("age", "desc");
    expect(adapter.getSearch()).toBe("sortBy=age&sortDir=desc&atv=1");
    store.setSort("name");
    expect(adapter.getSearch()).toBe("sortBy=name&sortDir=asc&atv=1");
    store.setSort(undefined);
    expect(adapter.getSearch()).toBe("atv=1");

    const defaulted = tableStore("", { defaults: { sortBy: "age" } });
    defaulted.store.setSort(undefined);
    expect(defaulted.adapter.getSearch()).toBe("sortBy=&atv=1");
  });

  it("sets, clears and initializes grouping", () => {
    const { adapter, store } = tableStore();
    store.initializeGroupBy("team");
    expect(adapter.getSearch()).toBe("groupBy=team&atv=1");
    store.initializeGroupBy("region");
    expect(adapter.getSearch()).toBe("groupBy=team&atv=1");
    store.setGroupBy(undefined);
    expect(adapter.getSearch()).toBe("atv=1");
    store.setGroupBy("region");
    expect(store.getSnapshot().groupBy).toBe("region");

    const defaulted = tableStore("", { defaults: { groupBy: "team" } });
    defaulted.store.setGroupBy(undefined);
    expect(defaulted.adapter.getSearch()).toBe("groupBy=&atv=1");
  });

  it("writes and removes group aggregate overrides", () => {
    const { adapter, store } = tableStore();
    store.setGroupAggregateOverrides({ budget: "sum" });
    expect(store.getSnapshot().groupAggregateOverrides).toEqual({
      budget: "sum",
    });
    store.setGroupAggregateOverrides({});
    expect(adapter.getSearch()).toBe("atv=1");
  });

  it("toggles a sort chain seeded from the single sort", () => {
    const { store } = tableStore("sortBy=name&sortDir=desc");
    store.toggleSortLevel("age");
    expect(store.getSnapshot()).toMatchObject({
      sortBy: undefined,
      sortLevels: [
        { key: "name", dir: "desc" },
        { key: "age", dir: "asc" },
      ],
    });
    store.toggleSortLevel("age");
    expect(store.getSnapshot().sortLevels[1]).toEqual({
      key: "age",
      dir: "desc",
    });
    store.toggleSortLevel("age");
    expect(store.getSnapshot().sortLevels).toEqual([
      { key: "name", dir: "desc" },
    ]);
  });

  it("clears a seeded single sort toggled away, as setSort(undefined) does", () => {
    const plain = tableStore("sortBy=name&sortDir=desc");
    plain.store.toggleSortLevel("name");
    expect(plain.adapter.getSearch()).toBe("atv=1");

    // A chain that empties without a seed leaves the default to resurface.
    const defaulted = tableStore("", { defaults: { sortBy: "name" } });
    defaulted.store.toggleSortLevel("name");
    expect(defaulted.store.getSnapshot().sortLevels).toEqual([
      { key: "name", dir: "desc" },
    ]);
    defaulted.store.toggleSortLevel("name");
    expect(defaulted.store.getSnapshot()).toMatchObject({
      sortBy: "name",
      sortDir: "asc",
      sortLevels: [],
    });
  });

  it("stamps a seeded default sort toggled away as cleared", () => {
    const { adapter, store } = tableStore("", {
      defaults: { sortBy: "name", sortDir: "desc" },
    });
    store.toggleSortLevel("name");
    expect(adapter.getSearch()).toBe("sortBy=&atv=1");
  });

  it("writes extra filters over the effective bag and marks cleared defaults", () => {
    const { adapter, store } = tableStore("", {
      defaults: { extra: { status: "Active" } },
    });
    store.setExtra("tier", "gold");
    expect(store.getSnapshot().extra).toEqual({
      status: "Active",
      tier: "gold",
    });
    store.setExtras({ status: "", region: "EU" });
    expect(adapter.getSearch()).toBe("atv=1&f_tier=gold&f_region=EU&f_status=");
    store.clearExtras();
    expect(adapter.getSearch()).toBe("atv=1&f_status=");
  });

  it("writes and removes the filter tree", () => {
    const tree = {
      combinator: "or" as const,
      conditions: [{ key: "status", op: "eq", value: "Active" }],
    };
    const { adapter, store } = tableStore();
    store.setFilterTree(tree);
    expect(store.getSnapshot().filterTree).toEqual(tree);
    store.setFilterTree(undefined);
    expect(adapter.getSearch()).toBe("atv=1");
  });

  it("clears everything, leaving markers for defaulted keys", () => {
    const { adapter, store } = tableStore(
      "page=3&q=ada&sort=name:asc&sortBy=age&sortDir=desc&groupBy=team&groupAgg=budget:sum&f_tier=gold&ft=x",
      {
        defaults: {
          search: "s",
          sortBy: "age",
          groupBy: "team",
          extra: { status: "Active" },
        },
      }
    );
    store.clearAll();
    expect(adapter.getSearch()).toBe("q=&sortBy=&groupBy=&f_status=&atv=1");

    const plain = tableStore("page=3&q=ada&sortBy=age&groupBy=team");
    plain.store.clearAll();
    expect(plain.adapter.getSearch()).toBe("atv=1");
  });

  it("writes inside its own namespace", () => {
    const { adapter, store } = tableStore("page=9", {}, "left");
    store.setPage(2);
    expect(adapter.getSearch()).toBe("page=9&left.page=2&left.atv=1");
  });
});

describe("createTableViewStore — namespaces", () => {
  it("warns when two tables claim one namespace on one adapter, until one releases", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const adapter = createMemoryAdapter();
    const first = createTableViewStore({ adapter });
    const second = createTableViewStore({ adapter });
    const releaseFirst = first.claimNamespace();
    expect(warn).not.toHaveBeenCalled();
    const releaseSecond = second.claimNamespace();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('two tables share the URL namespace "(bare)"')
    );
    releaseSecond();
    releaseFirst();

    const named = createTableViewStore({ adapter, urlKey: "left" });
    named.claimNamespace();
    named.claimNamespace();
    expect(warn).toHaveBeenLastCalledWith(
      expect.stringContaining('namespace "left."')
    );
  });
});

describe("createUrlSliceStore", () => {
  // `page` stands in for a slice param: the store writes only params the
  // table owns.
  const counter: UrlSliceSpec<number, { readonly fallback?: number }> = {
    read: (params, ns, config) =>
      Number(params.get(`${ns}page`) ?? config.fallback ?? 0),
    write: (params, value, ns) => params.set(`${ns}page`, String(value)),
  };

  it("reads the slice with its configuration, caching the value", () => {
    const adapter = createMemoryAdapter("");
    const store = createUrlSliceStore({ adapter }, counter, { fallback: 3 });
    expect(store.getSnapshot()).toBe(3);
    store.configure({ fallback: 3 });
    expect(store.getSnapshot()).toBe(3);
    store.configure({ fallback: 4 });
    expect(store.getSnapshot()).toBe(4);
  });

  it("writes an immediate slice at once", () => {
    const adapter = createMemoryAdapter("");
    const store = createUrlSliceStore({ adapter, urlKey: "t" }, counter, {});
    store.set(7);
    expect(adapter.getSearch()).toBe("t.page=7&t.atv=1");
    expect(store.getSnapshot()).toBe(7);
  });

  it("reads a debounced value back at once and writes it when the reader pauses", () => {
    vi.useFakeTimers();
    const adapter = createMemoryAdapter("");
    const store = createUrlSliceStore(
      { adapter, serverSearch: () => "page=2" },
      { ...counter, writeDebounceMs: 150 },
      {}
    );
    const listener = vi.fn();
    const release = store.subscribe(listener);
    expect(store.getServerSnapshot()).toBe(2);

    store.set(5);
    store.set(6);
    expect(store.getSnapshot()).toBe(6);
    expect(store.getServerSnapshot()).toBe(6);
    expect(adapter.getSearch()).toBe("");
    expect(listener).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(150);
    expect(adapter.getSearch()).toBe("page=6&atv=1");
    expect(store.getSnapshot()).toBe(6);
    release();
  });

  it("flushes a value still waiting on its debounce, and nothing otherwise", () => {
    vi.useFakeTimers();
    const adapter = createMemoryAdapter("");
    const setSearch = vi.spyOn(adapter, "setSearch");
    const store = createUrlSliceStore(
      { adapter },
      { ...counter, writeDebounceMs: 150 },
      {}
    );
    store.flush();
    expect(setSearch).not.toHaveBeenCalled();

    store.set(9);
    store.flush();
    expect(adapter.getSearch()).toBe("page=9&atv=1");
    vi.advanceTimersByTime(150);
    expect(setSearch).toHaveBeenCalledTimes(1);
  });
});
