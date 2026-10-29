import { describe, expect, it, vi } from "vitest";

import type { FacetMap } from "../filters/facets";
import type { TableQueryParams } from "../types";
import type { InfiniteQueryLike } from "./dataTier";
import { createQuerySource, type QuerySourceConfig } from "./querySource";
import type { ServerSourceViewState } from "./serverSource";

interface Row {
  id: string;
}

interface Page {
  rows: Row[];
  total?: number;
  facets?: FacetMap;
  next?: string | null;
}

const rowsOf = (...ids: string[]): Row[] => ids.map((id) => ({ id }));

function viewStore(overrides: Partial<ServerSourceViewState> = {}) {
  const store = {
    view: {
      page: 1,
      limit: 2,
      search: "",
      sortBy: undefined,
      sortDir: undefined,
      sortLevels: [],
      groupBy: undefined,
      groupAggregateOverrides: {},
      extra: {},
      filterTree: undefined,
      setPage: (page: number) => {
        store.view = { ...store.view, page };
      },
      ...overrides,
    },
    set(patch: Partial<ServerSourceViewState>) {
      store.view = { ...store.view, ...patch };
    },
  };
  return store;
}

function queryOf(
  pages: Page[] | undefined,
  overrides: Partial<InfiniteQueryLike<Page>> = {}
): InfiniteQueryLike<Page> {
  return {
    data: pages
      ? { pages, pageParams: pages.map((_, index) => index) }
      : undefined,
    isLoading: false,
    isFetching: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(() => Promise.resolve("refetched")),
    error: null,
    ...overrides,
  };
}

const PAGED: QuerySourceConfig<Row, TableQueryParams, Page> = {
  paginationMode: "paged",
};

describe("createQuerySource", () => {
  it("merges base params under the live view and keeps the object stable", () => {
    const source = createQuerySource<Row, TableQueryParams, Page>();
    const store = viewStore({ search: "ada", extra: { status: "open" } });
    const config: QuerySourceConfig<Row, TableQueryParams, Page> = {
      ...PAGED,
      baseParams: { page: 9, search: "stale", scope: "team" } as never,
    };
    const params = source.params(config, store.view);
    expect(params).toMatchObject({
      page: 1,
      limit: 2,
      search: "ada",
      filters: { status: "open" },
      scope: "team",
    });
    expect(source.params(config, store.view)).toBe(params);
    // An empty search is not sent at all.
    store.set({ search: "" });
    expect(source.params(config, store.view).search).toBeUndefined();
  });

  it("gates capabilities and runs the sanitizer last", () => {
    const source = createQuerySource<Row, TableQueryParams, Page>();
    const store = viewStore({ groupBy: "team" });
    const bare = source.params(
      { ...PAGED, expandedIds: ["a"], facetKeys: ["team"] },
      store.view
    ) as Record<string, unknown>;
    expect(bare.groupBy).toBe("team");
    expect(bare.expandedIds).toBeUndefined();

    const declared = source.params(
      {
        ...PAGED,
        supports: { grouping: true, tree: true, facets: true },
        expandedIds: ["a"],
        facetKeys: ["team"],
        sanitizeParams: (next) => ({ ...next, limit: 99 }),
      },
      store.view
    ) as Record<string, unknown>;
    expect(declared.groupBy).toEqual(["team"]);
    expect(declared.expandedIds).toEqual(["a"]);
    expect(declared.facets).toEqual(["team"]);
    expect(declared.limit).toBe(99);
  });

  it("throws when read before params and an answer", () => {
    const source = createQuerySource<Row, TableQueryParams, Page>();
    source.commit();
    expect(() => {
      source.fetchNextPage();
    }).toThrow(/params\(\) and update\(\) first/);
  });

  it("projects the last page when paged and every page when infinite", () => {
    const pages: Page[] = [
      { rows: rowsOf("a", "b"), total: 4 },
      {
        rows: rowsOf("c", "d"),
        total: 4,
        facets: { team: [{ value: "x", label: "X", count: 1 }] },
      },
    ];
    const store = viewStore();

    const paged = createQuerySource<Row, TableQueryParams, Page>();
    paged.params(PAGED, store.view);
    const last = paged.update({ query: queryOf(pages) });
    expect(last.rows.map((row) => row.id)).toEqual(["c", "d"]);
    expect(last.total).toBe(4);

    const infinite = createQuerySource<Row, TableQueryParams, Page>();
    infinite.params({ paginationMode: "infinite" }, store.view);
    const all = infinite.update({
      query: queryOf(pages, { hasNextPage: true, isFetchingNextPage: true }),
    });
    expect(all.rows.map((row) => row.id)).toEqual(["a", "b", "c", "d"]);
    expect(all.facets).toEqual({
      team: [{ value: "x", label: "X", count: 1 }],
    });
    expect(all.hasNextPage).toBe(true);
    expect(all.isFetchingNextPage).toBe(true);
    expect(last.hasNextPage).toBe(false);
  });

  it("falls back to the rows held when no total is reported", () => {
    const store = viewStore();
    const pages: Page[] = [{ rows: rowsOf("a") }, { rows: rowsOf("b") }];
    for (const paginationMode of ["paged", "infinite"] as const) {
      const source = createQuerySource<Row, TableQueryParams, Page>();
      source.params({ paginationMode }, store.view);
      const frame = source.update({ query: queryOf(pages) });
      expect(frame.total).toBe(frame.rows.length);
    }
    const empty = createQuerySource<Row, TableQueryParams, Page>();
    empty.params(PAGED, store.view);
    expect(empty.update({ query: queryOf([]) }).total).toBe(0);
  });

  it("re-projects on new data or a new selector key, not a new selector", () => {
    const source = createQuerySource<Row, TableQueryParams, Page>();
    source.params(PAGED, viewStore().view);
    const query = queryOf([{ rows: rowsOf("a") }]);
    const first = source.update({ query });
    const renamed = source.update({
      query,
      selectPage: (page) => ({
        rows: page.rows.map((row) => ({ id: `x${row.id}` })),
      }),
    });
    expect(renamed.rows).toBe(first.rows);
    const keyed = source.update({
      query,
      selectorKey: 1,
      selectPage: (page) => ({
        rows: page.rows.map((row) => ({ id: `x${row.id}` })),
      }),
    });
    expect(keyed.rows.map((row) => row.id)).toEqual(["xa"]);
  });

  it("appends only in infinite mode and only when nothing is on its way", async () => {
    const store = viewStore();
    const paged = createQuerySource<Row, TableQueryParams, Page>();
    paged.params(PAGED, store.view);
    const pagedQuery = queryOf([], { hasNextPage: true });
    paged.update({ query: pagedQuery });
    paged.fetchNextPage();
    expect(pagedQuery.fetchNextPage).not.toHaveBeenCalled();

    const infinite = createQuerySource<Row, TableQueryParams, Page>();
    infinite.params({ paginationMode: "infinite" }, store.view);
    const busy = queryOf([], { hasNextPage: true, isFetchingNextPage: true });
    infinite.update({ query: busy });
    infinite.fetchNextPage();
    expect(busy.fetchNextPage).not.toHaveBeenCalled();

    const ready = queryOf([], { hasNextPage: true });
    infinite.update({ query: ready });
    infinite.fetchNextPage();
    expect(ready.fetchNextPage).toHaveBeenCalledTimes(1);
    await expect(infinite.refetch()).resolves.toBe("refetched");
  });

  it("clamps a page past the end once the query settles", () => {
    const setPage = vi.fn();
    const source = createQuerySource<Row, TableQueryParams, Page>();
    const store = viewStore({ page: 9, setPage });
    source.params(PAGED, store.view);
    source.update({
      query: queryOf([{ rows: rowsOf("a"), total: 4 }], { isFetching: true }),
    });
    source.commit();
    expect(setPage).not.toHaveBeenCalled();
    source.update({ query: queryOf([{ rows: rowsOf("a"), total: 4 }]) });
    source.commit();
    expect(setPage).toHaveBeenCalledWith(2);
  });

  describe("cursor mode", () => {
    const CURSOR: QuerySourceConfig<Row, TableQueryParams, Page> = {
      paginationMode: "paged",
      supports: { cursor: true },
      nextCursor: (page) => page.next,
    };

    it("records the page's token and sends it for the next page", () => {
      const source = createQuerySource<Row, TableQueryParams, Page>();
      const store = viewStore();
      const listener = vi.fn();
      source.subscribe(listener);
      expect(
        (source.params(CURSOR, store.view) as Record<string, unknown>).cursor
      ).toBeUndefined();
      source.update({ query: queryOf([{ rows: rowsOf("a"), next: "t2" }]) });
      source.commit();
      expect(listener).toHaveBeenCalledTimes(1);
      expect(source.revision()).toBe(1);
      // The same token again changes nothing.
      source.commit();
      store.set({ page: 2 });
      expect(
        (source.params(CURSOR, store.view) as Record<string, unknown>).cursor
      ).toBe("t2");
      source.update({ query: queryOf([{ rows: rowsOf("b"), next: null }]) });
      source.commit();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("records the same token once", () => {
      const source = createQuerySource<Row, TableQueryParams, Page>();
      const store = viewStore();
      const listener = vi.fn();
      source.subscribe(listener);
      source.params(CURSOR, store.view);
      source.update({ query: queryOf([{ rows: rowsOf("a"), next: "t2" }]) });
      source.commit();
      source.update({ query: queryOf([{ rows: rowsOf("a"), next: "t9" }]) });
      source.commit();
      source.update({ query: queryOf([{ rows: rowsOf("a"), next: "t2" }]) });
      source.commit();
      expect(listener).toHaveBeenCalledTimes(3);
    });

    it("restarts the trail from page 1 when the query means something else", () => {
      const source = createQuerySource<Row, TableQueryParams, Page>();
      const store = viewStore();
      const listener = vi.fn();
      const unsubscribe = source.subscribe(listener);
      source.params(CURSOR, store.view);
      source.update({ query: queryOf([{ rows: rowsOf("a"), next: "t2" }]) });
      source.commit();
      store.set({ page: 2 });

      store.set({
        filterTree: {
          combinator: "and",
          conditions: [{ key: "id", op: "eq", value: "a" }],
        },
      });
      source.params(CURSOR, store.view);
      source.update({ query: queryOf(undefined) });
      source.commit();
      expect(store.view.page).toBe(1);
      expect(listener).toHaveBeenCalledTimes(2);
      store.set({ page: 2 });
      expect(
        (source.params(CURSOR, store.view) as Record<string, unknown>).cursor
      ).toBeUndefined();
      unsubscribe();
    });
  });

  it("describes the rows on screen by the answer's own marker", () => {
    const source = createQuerySource<Row, TableQueryParams, Page>();
    const store = viewStore({ groupBy: "team" });
    const config = (
      fn: string
    ): QuerySourceConfig<Row, TableQueryParams, Page> => ({
      ...PAGED,
      supports: { grouping: true, aggregates: true },
      aggregates: [{ key: "amount", fn }],
    });
    source.params(config("sum"), store.view);
    const first = source.update({
      query: queryOf([{ rows: rowsOf("a") }], { dataUpdatedAt: 1 }),
    });
    expect(first.groupAggregations).toEqual({ amount: "sum" });
    source.commit();

    source.params(config("avg"), store.view);
    source.update({
      query: queryOf([{ rows: rowsOf("a") }], {
        dataUpdatedAt: 0,
        isFetching: true,
      }),
    });
    source.commit();
    expect(
      source.update({
        query: queryOf([{ rows: rowsOf("a") }], { dataUpdatedAt: 0 }),
      }).groupAggregations
    ).toEqual({ amount: "sum" });

    source.update({
      query: queryOf([{ rows: rowsOf("a") }], { dataUpdatedAt: 2 }),
    });
    source.commit();
    expect(
      source.update({
        query: queryOf([{ rows: rowsOf("a") }], { dataUpdatedAt: 2 }),
      }).groupAggregations
    ).toEqual({ amount: "avg" });
  });
});
