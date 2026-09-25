import { afterEach, describe, expect, it, vi } from "vitest";

import { resetDevWarnings } from "../utils/devWarn";
import {
  appendBaseKey,
  appendedRows,
  buildTableQuery,
  canRequestCursorPage,
  clampedPage,
  createFilterOptionsLoader,
  createFirstLoadLatch,
  createQueryEmitter,
  cursorHasMore,
  effectiveQueryAggregates,
  EMPTY_CURSOR_TRAIL,
  queryAggregationSource,
  queryGroupBy,
  recordCursor,
  resolveDataTier,
  staleAppendStash,
  warnDataTierMisuse,
} from "./dataTier";

afterEach(() => {
  resetDevWarnings();
  vi.restoreAllMocks();
});

const baseQuery = {
  page: 1,
  limit: 25,
  search: "",
  sortBy: undefined,
  sortDir: undefined,
  sortLevels: [],
  filters: {},
};

describe("resolveDataTier", () => {
  it("prefers a source, then an explicit mode, then a query handler", () => {
    expect(resolveDataTier({}, "server", undefined)).toBe("source");
    expect(resolveDataTier(undefined, "frontend", () => undefined)).toBe(
      "frontend"
    );
    expect(resolveDataTier(undefined, undefined, () => undefined)).toBe(
      "server"
    );
    expect(resolveDataTier(undefined, undefined, undefined)).toBe("frontend");
  });
});

describe("warnDataTierMisuse", () => {
  it("names each way a table can be handed more than one tier, or none", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    warnDataTierMisuse({}, "server", [], undefined);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("`mode` is ignored when `source` is provided")
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("both `source` and `data`/`onQueryChange`")
    );
    warnDataTierMisuse(undefined, undefined, undefined, undefined);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("no data tier provided")
    );
    warn.mockClear();
    warnDataTierMisuse(undefined, undefined, [], undefined);
    expect(warn).not.toHaveBeenCalled();
  });
});

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

describe("createQueryEmitter", () => {
  it("aborts the request a newer query supersedes, and hands back its own abort", () => {
    const listener = vi.fn();
    const emitter = createQueryEmitter();
    const abortFirst = emitter.emit(listener, { ...baseQuery }, "a");
    const first = listener.mock.calls[0]![1] as {
      signal: AbortSignal;
      key: string;
    };
    expect(first.key).toBe("a");
    const abortSecond = emitter.emit(listener, { ...baseQuery, page: 2 }, "b");
    const second = listener.mock.calls[1]![1] as { signal: AbortSignal };
    expect(first.signal.aborted).toBe(true);
    expect(second.signal.aborted).toBe(false);
    abortSecond();
    expect(second.signal.aborted).toBe(true);
    abortFirst();
  });

  it("sends only a key it has not seen, and records keys even without a listener", () => {
    const listener = vi.fn();
    const emitter = createQueryEmitter("mount");
    expect(emitter.emitIfChanged(listener, baseQuery, "mount")).toBeUndefined();
    expect(
      emitter.emitIfChanged(undefined, baseQuery, "silent")
    ).toBeUndefined();
    expect(
      emitter.emitIfChanged(listener, baseQuery, "silent")
    ).toBeUndefined();
    expect(listener).not.toHaveBeenCalled();
    const abort = emitter.emitIfChanged(listener, baseQuery, "next");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(typeof abort).toBe("function");
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

describe("createFilterOptionsLoader", () => {
  it("loads each def's options once, and reports nothing after release", async () => {
    const options = vi.fn(() => Promise.resolve([{ value: "a", label: "A" }]));
    const failing = vi.fn(() => Promise.reject(new Error("offline")));
    const defs = [
      { key: "who", type: "select", options },
      { key: "where", type: "select", options: failing },
      { key: "fixed", type: "select", options: [{ value: "x", label: "X" }] },
    ] as never[];
    const loader = createFilterOptionsLoader();
    const onLoaded = vi.fn();
    loader.load(defs, onLoaded);
    loader.load(defs, onLoaded);
    await Promise.resolve();
    await Promise.resolve();
    expect(options).toHaveBeenCalledTimes(1);
    expect(failing).toHaveBeenCalledTimes(1);
    expect(onLoaded).toHaveBeenCalledWith("who", [{ value: "a", label: "A" }]);
    expect(onLoaded).toHaveBeenCalledTimes(1);

    const later = vi.fn(() => Promise.resolve([]));
    const release = loader.load(
      [{ key: "late", type: "select", options: later }] as never[],
      onLoaded
    );
    release();
    await Promise.resolve();
    await Promise.resolve();
    expect(later).toHaveBeenCalledTimes(1);
    expect(onLoaded).toHaveBeenCalledTimes(1);
  });
});
