import { describe, expect, it } from "vitest";

import {
  type CachedSnapshot,
  cachedSnapshot,
  sourceViewKey,
  type SourceViewKeyInput,
} from "./sourceRefresh";

const view: SourceViewKeyInput = {
  page: 1,
  limit: 5,
  search: "",
  sortBy: undefined,
  sortDir: undefined,
  groupBy: undefined,
  extra: {},
  filterTree: undefined,
  sortLevels: [],
  groupAggregateOverrides: undefined,
};

describe("source refresh identity", () => {
  it("keeps a missing aggregate override in the key", () => {
    const key = sourceViewKey(view);
    expect(key).toContain('"groupAggregateOverrides":null');
    expect(sourceViewKey(view)).toBe(key);
  });

  it("returns the previous snapshot when the inputs match", () => {
    const rows = ["a"];
    const held: { current: CachedSnapshot<string> | null } = { current: null };
    const first = cachedSnapshot(held, rows, "k", () => "one");
    const second = cachedSnapshot(held, rows, "k", () => "two");
    expect(second).toBe(first);
    expect(cachedSnapshot(held, rows, "next", () => "three")).toBe("three");
  });
});
