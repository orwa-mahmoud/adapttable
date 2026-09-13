import { describe, expect, it } from "vitest";

import { guideOf } from "./guides";
import type { CapabilityKey } from "./keys";
import { normalizeCapabilityArgs } from "./normalizeArgs";

const inputOf = (key: CapabilityKey) => guideOf(key).input;

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

describe("a word the capability's own description hands the model", () => {
  it("reads `edge` as the side `pinColumn` takes", () => {
    // Its summary says "at a logical edge" and its guide says "to the logical
    // start edge". A model that reaches for `edge` was told to.
    expect(
      normalizeCapabilityArgs("view.pinColumn", {
        key: "person",
        edge: "start",
      })
    ).toEqual({ key: "person", side: "start" });
    expect(
      normalizeCapabilityArgs("view.pinColumn", { key: "person", edge: null })
    ).toEqual({ key: "person", side: null });
  });

  it("leaves a properly named side alone", () => {
    expect(
      normalizeCapabilityArgs("view.pinColumn", {
        key: "person",
        side: "start",
        edge: "end",
      })
    ).toMatchObject({ side: "start" });
  });
});

describe("naming a row with the word this table uses for a column", () => {
  it("reads `key` as the rowKey a row capability takes", () => {
    // Sort, group and pin all take a plain `key`, so a model that has learned
    // the vocabulary reaches for `key` when it wants to name a row as well.
    expect(normalizeCapabilityArgs("rows.resolve", { key: "p1" })).toEqual({
      rowKey: "p1",
    });
    expect(
      normalizeCapabilityArgs("view.pinRow", { key: "p1", side: "top" })
    ).toEqual({ rowKey: "p1", side: "top" });
  });

  it("leaves a properly named rowKey alone", () => {
    expect(
      normalizeCapabilityArgs("rows.resolve", { rowKey: "p1", key: "p2" })
    ).toMatchObject({ rowKey: "p1" });
  });

  it("does not touch a capability whose key really is a column", () => {
    expect(
      normalizeCapabilityArgs("view.setSort", { key: "salary" })
    ).toMatchObject({ key: "salary" });
  });
});

describe("one item where a capability takes a batch", () => {
  it("wraps a single cell edit into the edits array", () => {
    expect(
      normalizeCapabilityArgs(
        "edit.cells",
        { rowKey: "p1", column: "salary", value: 185 },
        inputOf("edit.cells")
      )
    ).toEqual({ edits: [{ rowKey: "p1", column: "salary", value: 185 }] });
  });

  it("wraps a lone edit object handed under the right name", () => {
    expect(
      normalizeCapabilityArgs(
        "edit.cells",
        { edits: { rowKey: "p1", column: "salary", value: 185 } },
        inputOf("edit.cells")
      )
    ).toEqual({ edits: [{ rowKey: "p1", column: "salary", value: 185 }] });
  });

  it("wraps a lone key where a list of keys is required", () => {
    expect(
      normalizeCapabilityArgs(
        "rows.delete",
        { keys: "p1" },
        inputOf("rows.delete")
      )
    ).toEqual({ keys: ["p1"] });
  });

  it("leaves a well-formed batch alone", () => {
    const args = { edits: [{ rowKey: "p1", column: "salary", value: 185 }] };
    expect(
      normalizeCapabilityArgs("edit.cells", args, inputOf("edit.cells"))
    ).toEqual(args);
  });

  it("leaves a body that is not one item for validation to name", () => {
    // `notes` is nothing the item declares, so this is a different mistake —
    // wrapping it would bury the name a refusal needs to say.
    expect(
      normalizeCapabilityArgs(
        "edit.cells",
        { rowKey: "p1", notes: "raise" },
        inputOf("edit.cells")
      )
    ).toEqual({ rowKey: "p1", notes: "raise" });
  });

  it("wraps nothing when the caller has no schema to read", () => {
    expect(
      normalizeCapabilityArgs("edit.cells", {
        rowKey: "p1",
        column: "salary",
        value: 185,
      })
    ).toEqual({ rowKey: "p1", column: "salary", value: 185 });
  });

  it("leaves a capability that takes two required arguments alone", () => {
    expect(
      normalizeCapabilityArgs(
        "rows.reorder",
        { fromKey: "p1", toKey: "p2" },
        inputOf("rows.reorder")
      )
    ).toEqual({ fromKey: "p1", toKey: "p2" });
  });
});
