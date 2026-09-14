/**
 * A card says what changed, and only what the session actually reported.
 */
import { describe, expect, it } from "vitest";

import { subjectFor } from "./assistantSubjects";
import type { AgentColumn, ExecuteResult } from "./types";

const COLUMNS: AgentColumn[] = [
  {
    id: "team",
    label: "Team",
    type: "string",
    readable: true,
    writable: false,
    sortable: true,
  },
  {
    id: "salary",
    label: "Salary",
    type: "number",
    readable: true,
    writable: true,
    sortable: true,
  },
];

const ran = (payload: unknown): ExecuteResult => ({
  ok: true,
  revision: 2,
  idempotencyKey: "k",
  result: payload,
});

const failed = (): ExecuteResult => ({
  ok: false,
  revision: 2,
  idempotencyKey: "k",
  error: { code: "apply-failed", message: "no" },
});

describe("what a view change says it did", () => {
  it("names the filter's column and value, by label", () => {
    expect(
      subjectFor(
        "view.setFilters",
        { filters: { team: "Platform" } },
        ran({ ok: true, filters: { team: "Platform" } }),
        COLUMNS
      )
    ).toEqual({
      kind: "filter",
      terms: [{ column: "Team", value: "Platform" }],
    });
  });

  it("reports the bag that landed, not the one that was asked for", () => {
    // Three argument shapes reduce to one bag, and the reader is owed the
    // one the table is holding.
    expect(
      subjectFor(
        "view.setFilters",
        { filters: [{ column: "team", operator: "is", value: "Core" }] },
        ran({ ok: true, filters: { team: "Core" } }),
        COLUMNS
      )
    ).toEqual({ kind: "filter", terms: [{ column: "Team", value: "Core" }] });
  });

  it("calls an empty filter bag cleared rather than applied", () => {
    expect(
      subjectFor(
        "view.setFilters",
        { filters: {} },
        ran({ ok: true, filters: {} }),
        COLUMNS
      )
    ).toEqual({ kind: "filter", cleared: true });
  });

  it("carries the sort's column and direction", () => {
    expect(
      subjectFor(
        "view.setSort",
        { key: "salary", dir: "desc" },
        ran({ ok: true, sort: { key: "salary", dir: "desc" } }),
        COLUMNS
      )
    ).toEqual({
      kind: "sort",
      terms: [{ column: "Salary" }],
      direction: "desc",
    });
  });

  it("calls a null sort cleared", () => {
    expect(
      subjectFor("view.setSort", {}, ran({ ok: true, sort: null }), COLUMNS)
    ).toEqual({
      kind: "sort",
      cleared: true,
    });
  });

  it("carries the search text, and calls an empty one cleared", () => {
    expect(
      subjectFor("view.setSearch", {}, ran({ ok: true, query: "nair" }))
    ).toEqual({
      kind: "search",
      terms: [{ value: "nair" }],
    });
    expect(
      subjectFor("view.setSearch", {}, ran({ ok: true, query: "" }))
    ).toEqual({
      kind: "search",
      cleared: true,
    });
  });

  it("names the grouped column", () => {
    expect(
      subjectFor(
        "view.setGroupBy",
        {},
        ran({ ok: true, groupBy: "team" }),
        COLUMNS
      )
    ).toEqual({ kind: "group", terms: [{ column: "Team" }] });
  });

  it("separates pinning a column from unpinning one", () => {
    expect(
      subjectFor(
        "view.pinColumn",
        { key: "team", side: "start" },
        ran({ ok: true }),
        COLUMNS
      )
    ).toEqual({
      kind: "pin",
      terms: [{ column: "Team" }],
    });
    expect(
      subjectFor(
        "view.pinColumn",
        { key: "team", side: null },
        ran({ ok: true }),
        COLUMNS
      )
    ).toEqual({
      kind: "pin",
      cleared: true,
      terms: [{ column: "Team" }],
    });
  });
});

describe("what an edit says it did", () => {
  it("names each cell's column and value, and never the row key", () => {
    expect(
      subjectFor(
        "edit.cells",
        { edits: [{ rowKey: "r1", column: "salary", value: 185 }] },
        ran({ proposals: [], applied: true, approval: "not-required" }),
        COLUMNS
      )
    ).toEqual({ kind: "edit", terms: [{ column: "Salary", value: "185" }] });
  });

  it("still says it was an edit when a value is a shape it cannot read", () => {
    expect(
      subjectFor(
        "edit.cells",
        { edits: [{ column: "salary", value: { raw: 1 } }] },
        ran({ proposals: [], applied: true, approval: "not-required" }),
        COLUMNS
      )
    ).toEqual({ kind: "edit", terms: [{ column: "Salary" }] });
  });
});

describe("values it can read, and values it cannot", () => {
  it("reads numbers, booleans and lists, and skips what it cannot", () => {
    const of = (value: unknown) =>
      subjectFor(
        "view.setFilters",
        {},
        ran({ ok: true, filters: { team: value } }),
        COLUMNS
      );
    expect(of(3)).toEqual({
      kind: "filter",
      terms: [{ column: "Team", value: "3" }],
    });
    expect(of(true)).toEqual({
      kind: "filter",
      terms: [{ column: "Team", value: "true" }],
    });
    expect(of(["Core", "Data"])).toEqual({
      kind: "filter",
      terms: [{ column: "Team", value: "Core, Data" }],
    });
    // A shape only the host understands shows the column alone rather than
    // "[object Object]", and an empty string names nothing at all.
    expect(of({ raw: 1 })).toEqual({
      kind: "filter",
      terms: [{ column: "Team" }],
    });
    expect(of("")).toEqual({ kind: "filter", terms: [{ column: "Team" }] });
    expect(of(Number.NaN)).toEqual({
      kind: "filter",
      terms: [{ column: "Team" }],
    });
    expect(of([])).toEqual({ kind: "filter", terms: [{ column: "Team" }] });
  });

  it("says only the kind when an answer carries nothing to name", () => {
    // A capability that ran but reported no payload, and arguments that were
    // not an object: honest about the kind, silent about the rest.
    expect(subjectFor("view.setFilters", {}, ran(undefined), COLUMNS)).toEqual({
      kind: "filter",
      cleared: true,
    });
    expect(
      subjectFor("view.setGroupBy", {}, ran({ groupBy: "" }), COLUMNS)
    ).toEqual({ kind: "group", cleared: true });
    expect(subjectFor("view.setSearch", {}, ran({}))).toEqual({
      kind: "search",
      cleared: true,
    });
    expect(
      subjectFor("view.pinColumn", "not-an-object", ran({ ok: true }))
    ).toEqual({ kind: "pin" });
    expect(
      subjectFor(
        "edit.cells",
        { edits: "not-a-list" },
        ran({ ok: true }),
        COLUMNS
      )
    ).toEqual({ kind: "edit" });
  });
});

describe("what it refuses to claim", () => {
  it("says only the kind when the action did not run", () => {
    // The absence of a sort in a refusal is not the table clearing its sort.
    expect(
      subjectFor("view.setSort", { key: "salary" }, failed(), COLUMNS)
    ).toEqual({
      kind: "sort",
    });
    expect(
      subjectFor("view.setFilters", { filters: {} }, failed(), COLUMNS)
    ).toEqual({
      kind: "filter",
    });
  });

  it("describes nothing for a capability the host defined", () => {
    expect(
      subjectFor("orders.archive", {}, ran({ archived: 1 }), COLUMNS)
    ).toBeUndefined();
  });

  it("falls back to the column id a host never labelled", () => {
    expect(
      subjectFor(
        "view.setGroupBy",
        {},
        ran({ ok: true, groupBy: "region" }),
        COLUMNS
      )
    ).toEqual({ kind: "group", terms: [{ column: "region" }] });
  });
});
