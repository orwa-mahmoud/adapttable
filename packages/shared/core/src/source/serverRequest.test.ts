import { describe, expect, it } from "vitest";

import {
  appendBaseKey,
  appendedRows,
  buildTableQuery,
  canRequestCursorPage,
  clampedPage,
  createFirstLoadLatch,
  cursorHasMore,
  effectiveQueryAggregates,
  EMPTY_CURSOR_TRAIL,
  queryAggregationSource,
  queryGroupBy,
  recordCursor,
  requestsAggregates,
  serverQuery,
  staleAppendStash,
} from "./serverRequest";

const baseQuery = {
  page: 1,
  limit: 25,
  search: "",
  sortBy: undefined,
  sortDir: undefined,
  sortLevels: [],
  filters: {},
};
describe("the query", () => {
  it("names what a server source says about aggregation", () => {
    expect(queryAggregationSource(undefined)).toBeUndefined();
    expect(queryAggregationSource({ aggregates: true })).toEqual({
      grouping: "server",
      aggregateOperations: undefined,
    });
    expect(queryAggregationSource({ aggregateOperations: ["sum"] })).toEqual({
      grouping: "server",
      aggregateOperations: ["sum"],
    });
    expect(queryAggregationSource({ grouping: true })).toEqual({
      grouping: "server",
      aggregateOperations: [],
    });
  });

  it("applies the reader's overrides to the declared aggregates", () => {
    const aggregates = [{ key: "budget", fn: "sum" as const }];
    expect(
      effectiveQueryAggregates(aggregates, {}, undefined, { aggregates: true })
    ).toEqual(aggregates);
    expect(
      effectiveQueryAggregates(aggregates, { budget: "none" }, undefined, {
        aggregates: true,
      })
    ).toBeUndefined();
  });

  it("carries grouping keys as a list, or nothing", () => {
    expect(queryGroupBy(undefined)).toBeUndefined();
    expect(queryGroupBy("")).toBeUndefined();
    expect(queryGroupBy("team,region")).toEqual(["team", "region"]);
  });

  it("sends a capability only when the source declared it", () => {
    const input = {
      ...baseQuery,
      groupBy: ["team"],
      cursor: "abc",
      facets: ["status"],
    };
    expect(buildTableQuery(input)).toEqual(baseQuery);
    expect(
      buildTableQuery({
        ...input,
        supports: { grouping: true, cursor: true, facets: true },
      })
    ).toEqual({
      ...baseQuery,
      groupBy: ["team"],
      cursor: "abc",
      facets: ["status"],
    });
  });
});

describe("createFirstLoadLatch", () => {
  it("is loading only until rows arrive", () => {
    const latch = createFirstLoadLatch();
    expect(latch.isLoading(true, false)).toBe(true);
    latch.observe(true, true);
    expect(latch.isLoading(true, false)).toBe(false);
  });

  it("stops after one load completes, even one that returned nothing", () => {
    const latch = createFirstLoadLatch();
    latch.observe(false, false);
    expect(latch.isLoading(true, false)).toBe(true);
    latch.observe(true, false);
    expect(latch.isLoading(true, false)).toBe(true);
    latch.observe(false, false);
    expect(latch.isLoading(true, false)).toBe(false);
    expect(latch.isLoading(false, false)).toBe(false);
  });
});

describe("paging", () => {
  it("clamps a page past the last real one", () => {
    expect(clampedPage(9, 10, 42)).toBe(5);
    expect(clampedPage(5, 10, 42)).toBeUndefined();
    expect(clampedPage(3, 0, 1)).toBe(1);
    expect(clampedPage(9, 10, 0)).toBeUndefined();
  });

  it("keeps a trail of cursor tokens and navigates only where a token exists", () => {
    const trail = recordCursor(EMPTY_CURSOR_TRAIL, 1, "t2");
    expect(trail).toEqual([undefined, "t2"]);
    expect(recordCursor(trail, 1, "t2")).toBe(trail);
    expect(cursorHasMore(trail, 1)).toBe(true);
    expect(cursorHasMore(trail, 2)).toBe(false);
    expect(canRequestCursorPage(trail, 2)).toBe(true);
    expect(canRequestCursorPage(trail, 3)).toBe(false);
  });
});

describe("infinite pages", () => {
  const key = appendBaseKey(baseQuery);
  const first = [1, 2];
  const next = [3, 4];

  it("keys a query apart from its page", () => {
    expect(appendBaseKey({ ...baseQuery, search: "x" })).not.toBe(key);
    expect(appendBaseKey({ ...baseQuery })).toBe(key);
  });

  it("shows the stash while the next page travels, then appends it", () => {
    const stash = { key, page: 2, rows: first, prevProp: first };
    expect(appendedRows(stash, key, 2, first)).toEqual({
      rows: first,
      appending: true,
      pending: true,
    });
    expect(appendedRows(stash, key, 2, next)).toEqual({
      rows: [1, 2, 3, 4],
      appending: true,
      pending: false,
    });
  });

  it("shows the tier's rows for no stash, another query or another page", () => {
    const stash = { key, page: 2, rows: first, prevProp: first };
    const none = { rows: next, appending: false, pending: false };
    expect(appendedRows(null, key, 2, next)).toEqual(none);
    expect(appendedRows(stash, "other", 2, next)).toEqual(none);
    expect(appendedRows(stash, key, 3, next)).toEqual(none);
  });

  it("drops a stash its query superseded or its append failed", () => {
    const stash = { key, page: 2, rows: first, prevProp: first };
    expect(staleAppendStash(null, key, true)).toBe(false);
    expect(staleAppendStash(stash, key, false)).toBe(false);
    expect(staleAppendStash(stash, "other", false)).toBe(true);
    expect(staleAppendStash(stash, key, true)).toBe(true);
  });
});

describe("requestsAggregates", () => {
  const aggregatable = {
    key: "amount",
    aggregatable: {
      operations: ["sum" as const, "avg" as const],
      default: "sum" as const,
    },
  };
  const plain = { key: "name" };
  const support = { grouping: true, aggregates: true };

  it.each([
    ["no columns, no choices", undefined, {}, undefined],
    ["plain columns and a stray choice", undefined, { name: "sum" }, [plain]],
    [
      "a column that offers nothing",
      undefined,
      {},
      [{ ...plain, aggregatable: false }],
    ],
    [
      "no columns and an absent choice",
      undefined,
      { amount: undefined },
      undefined,
    ],
  ])(
    "when it says no request can carry aggregates, none does: %s",
    (_name, base, overrides, columns) => {
      expect(requestsAggregates(base, overrides, columns)).toBe(false);
      expect(
        effectiveQueryAggregates(base, overrides, columns, support)
      ).toBeUndefined();
    }
  );

  it("says yes for a host request, an aggregatable column, or a reader's choice without columns", () => {
    expect(
      requestsAggregates([{ key: "amount", fn: "sum" }], {}, [plain])
    ).toBe(true);
    expect(requestsAggregates(undefined, {}, [plain, aggregatable])).toBe(true);
    expect(requestsAggregates(undefined, { amount: "sum" }, undefined)).toBe(
      true
    );
    expect(
      effectiveQueryAggregates(undefined, {}, [aggregatable], support)
    ).toEqual([{ key: "amount", fn: "sum" }]);
  });
});

describe("serverQuery", () => {
  it("keys the query by value, so an equal view keys the same", () => {
    const input = {
      view: {
        page: 2,
        limit: 25,
        search: "ada",
        sortBy: "name",
        sortDir: "asc" as const,
        sortLevels: [],
        groupBy: "team",
        extra: { status: "open" },
        filterTree: undefined,
      },
      supports: { grouping: true },
      expandedIds: undefined,
      facetKeys: undefined,
      aggregates: undefined,
      cursor: undefined,
    };
    const first = serverQuery(input);
    expect(first.query).toMatchObject({
      page: 2,
      limit: 25,
      search: "ada",
      groupBy: ["team"],
      filters: { status: "open" },
    });
    expect(serverQuery({ ...input, view: { ...input.view } }).queryKey).toBe(
      first.queryKey
    );
    expect(
      serverQuery({ ...input, view: { ...input.view, page: 3 } }).queryKey
    ).not.toBe(first.queryKey);
  });
});
