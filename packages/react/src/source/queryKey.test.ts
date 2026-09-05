/**
 * Query cache keys.
 *
 * Two properties carry the whole point: the key does not change when nothing
 * did, and the full key starts with the base key so prefix invalidation
 * catches every page of a view and nothing outside it.
 */
import { describe, expect, it } from "vitest";

import { tableQueryBaseKey, tableQueryKey } from "@adapttable/core";
import type { TableQuery } from "./useServerData";

function query(overrides: Partial<TableQuery> = {}): TableQuery {
  return {
    page: 1,
    limit: 25,
    search: "",
    sortBy: undefined,
    sortDir: undefined,
    sortLevels: [],
    filters: {},
    ...overrides,
  };
}

describe("tableQueryKey", () => {
  it("is identical for two equal queries built separately", () => {
    expect(tableQueryKey(query())).toEqual(tableQueryKey(query()));
  });

  it("ignores the order the filter object was built in", () => {
    const a = query({ filters: { status: "Active", team: "Core" } });
    const b = query({ filters: { team: "Core", status: "Active" } });
    expect(tableQueryKey(a)).toEqual(tableQueryKey(b));
  });

  it("changes when the search changes", () => {
    expect(tableQueryKey(query({ search: "ada" }))).not.toEqual(
      tableQueryKey(query())
    );
  });

  it("changes when the page changes", () => {
    expect(tableQueryKey(query({ page: 2 }))).not.toEqual(
      tableQueryKey(query())
    );
  });

  it("changes when the cursor changes", () => {
    expect(tableQueryKey(query({ cursor: "b" }))).not.toEqual(
      tableQueryKey(query({ cursor: "a" }))
    );
  });

  it("separates two tables through their scope", () => {
    expect(tableQueryKey(query(), { scope: "people" })).not.toEqual(
      tableQueryKey(query(), { scope: "orders" })
    );
  });
});

describe("tableQueryBaseKey", () => {
  it("is a prefix of the full key, so prefix invalidation reaches it", () => {
    const q = query({ page: 3, search: "ada" });
    const base = tableQueryBaseKey(q);
    expect(tableQueryKey(q).slice(0, base.length)).toEqual(base);
  });

  it("is the same across pages of one view", () => {
    const base = tableQueryBaseKey(query({ page: 1 }));
    expect(tableQueryBaseKey(query({ page: 7 }))).toEqual(base);
  });

  it("is the same across cursors of one view", () => {
    expect(tableQueryBaseKey(query({ cursor: "x" }))).toEqual(
      tableQueryBaseKey(query({ cursor: "y" }))
    );
  });

  it("differs once the view itself differs", () => {
    expect(tableQueryBaseKey(query({ sortBy: "name" }))).not.toEqual(
      tableQueryBaseKey(query())
    );
    expect(tableQueryBaseKey(query({ limit: 50 }))).not.toEqual(
      tableQueryBaseKey(query())
    );
    expect(tableQueryBaseKey(query({ filters: { team: "Core" } }))).not.toEqual(
      tableQueryBaseKey(query())
    );
  });

  it("follows the optional query fields too", () => {
    expect(tableQueryBaseKey(query({ groupBy: ["team"] }))).not.toEqual(
      tableQueryBaseKey(query())
    );
  });

  it("serialises to something a string-keyed cache can use", () => {
    expect(
      tableQueryKey(query()).every((part) => typeof part === "string")
    ).toBe(true);
  });
});
