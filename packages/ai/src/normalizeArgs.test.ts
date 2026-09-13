import { describe, expect, it } from "vitest";

import { normalizeCapabilityArgs } from "./normalizeArgs";

describe("normalizeCapabilityArgs", () => {
  it("rewrites column to key for sort, group and pin", () => {
    expect(
      normalizeCapabilityArgs("view.setSort", {
        column: "salary",
        dir: "desc",
      })
    ).toEqual({ key: "salary", dir: "desc" });
    expect(
      normalizeCapabilityArgs("view.setGroupBy", { column: "team" })
    ).toEqual({ key: "team" });
    expect(
      normalizeCapabilityArgs("view.pinColumn", { column: "person" })
    ).toEqual({ key: "person" });
  });

  it("rewrites sort / sortBy bags into key and dir", () => {
    expect(normalizeCapabilityArgs("view.setSort", { sort: "salary" })).toEqual(
      { key: "salary" }
    );
    expect(
      normalizeCapabilityArgs("view.setSort", {
        sort: { column: "salary", direction: "descending" },
      })
    ).toEqual({ key: "salary", dir: "desc" });
    expect(
      normalizeCapabilityArgs("view.setSort", {
        sortBy: "salary",
        sortDir: "desc",
      })
    ).toEqual({ key: "salary", dir: "desc" });
  });

  it("keeps a null key so clear-sort still validates", () => {
    expect(normalizeCapabilityArgs("view.setSort", { key: null })).toEqual({
      key: null,
    });
  });

  it("leaves a truly unknown property for the schema to reject", () => {
    expect(normalizeCapabilityArgs("view.setSort", { foo: "salary" })).toEqual({
      foo: "salary",
    });
  });
});

describe("the search a model actually sends", () => {
  it("accepts `search` where the guide says `query`", () => {
    expect(
      normalizeCapabilityArgs("view.setSearch", { search: "ada" })
    ).toEqual({ query: "ada" });
  });

  it("leaves an explicit `query` alone, whatever else is there", () => {
    expect(
      normalizeCapabilityArgs("view.setSearch", { query: "ada", search: "x" })
    ).toEqual({ query: "ada", search: "x" });
  });

  it("does not invent a query from a non-string", () => {
    expect(normalizeCapabilityArgs("view.setSearch", { search: 7 })).toEqual({
      search: 7,
    });
  });
});

describe("the name a capability's own title suggests", () => {
  it("reads `groupBy` as the key `setGroupBy` takes", () => {
    // The guide says `key`, and a compact context defers that guide first.
    // Accepting the near-miss is cheaper than a round trip and a refusal about
    // a grouping the model had right.
    expect(
      normalizeCapabilityArgs("view.setGroupBy", { groupBy: "team" })
    ).toEqual({ key: "team" });
    expect(
      normalizeCapabilityArgs("view.setGroupBy", { groupBy: null })
    ).toEqual({ key: null });
  });

  it("reads `aggregations` as the set `setAggregations` takes", () => {
    expect(
      normalizeCapabilityArgs("view.setAggregations", {
        aggregations: { salary: "avg" },
      })
    ).toEqual({ set: { salary: "avg" } });
  });

  it("never overrides what the model actually named", () => {
    expect(
      normalizeCapabilityArgs("view.setGroupBy", {
        key: "team",
        groupBy: "status",
      })
    ).toMatchObject({ key: "team" });
    expect(
      normalizeCapabilityArgs("view.setAggregations", {
        set: { salary: "sum" },
        aggregations: { salary: "avg" },
      })
    ).toMatchObject({ set: { salary: "sum" } });
  });
});
