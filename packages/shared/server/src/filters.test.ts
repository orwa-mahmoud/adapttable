/**
 * Declared filters, checked one type at a time.
 *
 * `levels.test.ts` walks the levels of checking a host can choose; this file
 * pins what each filter type accepts and refuses once filters are declared —
 * the edge of every shape, where a hand-edited link or a stale bookmark
 * lands. Every URL is written by the table's own writers, except where a test
 * pins a link the table never writes.
 */
import {
  type ExtraFilters,
  type QueryFilterGroup,
  writeExtra,
  writeFilterTreeParam,
} from "@adapttable/core";
import { describe, expect, it } from "vitest";

import {
  parseTableQuery,
  pickFilters,
  type QuerySchema,
  splitFilterValues,
} from "./index";

/** A query string from the table's filter bag, as the table writes it. */
function filterUrl(extra: ExtraFilters): string {
  const params = new URLSearchParams();
  writeExtra(params, extra);
  return `?${params.toString()}`;
}

/** A query string carrying a filter tree, as the table writes it. */
function treeUrl(tree: QueryFilterGroup): string {
  const params = new URLSearchParams();
  writeFilterTreeParam(params, tree);
  return `?${params.toString()}`;
}

const schema: QuerySchema = {
  columns: ["name", "status", "team", "active", "budget", "hiredAt", "score"],
  filters: [
    { key: "name", type: "text" },
    {
      key: "status",
      type: "select",
      options: [{ value: "open", label: "Open" }],
    },
    { key: "team", type: "multiSelect" },
    { key: "active", type: "boolean" },
    { key: "budget", type: "numberRange" },
    { key: "hiredAt", type: "dateRange" },
    { key: "score", type: "stars" },
  ],
  filterTypes: [{ type: "stars", ops: ["atLeast"], defaultOp: "atLeast" }],
};

const read = (extra: ExtraFilters, over: QuerySchema = schema) =>
  parseTableQuery(filterUrl(extra), over);

describe("splitFilterValues", () => {
  it("keeps an entry with a stray percent sign as it arrived", () => {
    expect(splitFilterValues("100%,Core")).toEqual(["100%", "Core"]);
  });

  it("trims entries and drops empty ones", () => {
    expect(splitFilterValues(" Core , ,Data,")).toEqual(["Core", "Data"]);
  });
});

describe("pickFilters", () => {
  it("scopes a shorthand record to the keys a caller may use", () => {
    const shorthand = {
      name: "text",
      team: "multiSelect",
      budget: "numberRange",
    };

    expect(pickFilters(shorthand, ["team", "budget"])).toEqual({
      team: "multiSelect",
      budget: "numberRange",
    });

    const query = parseTableQuery(filterUrl({ name: "ada", team: "Core" }), {
      columns: ["name", "team"],
      filters: pickFilters(shorthand, ["team"]),
    });
    expect(query.typedFilters).toEqual({
      team: { type: "multiSelect", op: "in", values: ["Core"] },
    });
    expect(query.rejected).toEqual([
      { param: "f_name", value: "ada", reason: "not a declared filter" },
    ]);
  });
});

describe('shaped filters — columns: "any"', () => {
  it("leaves out a filter the link sent empty", () => {
    const query = parseTableQuery("?f_name=&f_team=Core", { columns: "any" });

    expect(query.shapedFilters).toEqual({ team: { value: "Core" } });
    expect(query.rejected).toEqual([]);
  });
});

describe("typed filters", () => {
  it("ignores a declared filter the link sent empty", () => {
    // The table drops an empty filter from the link; a hand-edited one keeps it.
    const query = parseTableQuery("?f_name=", schema);

    expect(query.typedFilters).toEqual({});
    expect(query.filters).toEqual({});
    expect(query.rejected).toEqual([]);
  });

  it("refuses a filter whose type is neither built in nor registered", () => {
    const query = read({ score: "4" }, { ...schema, filterTypes: [] });

    expect(query.typedFilters).toEqual({});
    expect(query.rejected).toEqual([
      { param: "f_score", value: "stars", reason: "not a known filter type" },
    ]);
  });

  it("reads an operator alone as no filter, except where it needs no value", () => {
    const query = read({
      nameOp: "eq",
      statusOp: "eq",
      teamOp: "in",
      activeOp: "eq",
      budgetOp: "gte",
      hiredAtOp: "on",
    });

    expect(query.typedFilters).toEqual({});
    expect(query.rejected).toEqual([]);

    expect(
      read({ nameOp: "empty", hiredAtOp: "empty", scoreOp: "atLeast" })
        .typedFilters
    ).toEqual({
      name: { type: "text", op: "empty" },
      hiredAt: { type: "dateRange", op: "empty" },
      score: { type: "custom", filterType: "stars", op: "atLeast" },
    });
  });

  describe("select", () => {
    it("refuses a value outside a static option list", () => {
      const query = read({ status: "closed" });

      expect(query.typedFilters).toEqual({});
      expect(query.rejected).toEqual([
        {
          param: "f_status",
          value: "closed",
          reason: "not one of the filter's options",
        },
      ]);
    });

    it("never lets a malformed option entry widen the list", () => {
      const over: QuerySchema = {
        columns: ["status"],
        filters: [
          {
            key: "status",
            type: "select",
            options: ["closed", null, { value: 1 }, { value: "open" }],
          },
        ],
      };

      expect(read({ status: "open" }, over).typedFilters).toEqual({
        status: { type: "select", op: "eq", value: "open" },
      });
      expect(read({ status: "closed" }, over).rejected).toEqual([
        {
          param: "f_status",
          value: "closed",
          reason: "not one of the filter's options",
        },
      ]);
    });
  });

  describe("boolean", () => {
    it("reads false as a real value", () => {
      expect(read({ active: "false" }).typedFilters).toEqual({
        active: { type: "boolean", op: "eq", value: false },
      });
    });
  });

  describe("numberRange", () => {
    it("refuses a listed value that is not a number", () => {
      const query = read({ budgetOp: "in", budget: "10,abc" });

      expect(query.typedFilters).toEqual({});
      expect(query.rejected).toEqual([
        {
          param: "f_budget",
          value: "10,abc",
          reason: "not a list of numbers",
        },
      ]);
    });

    it("reads a list with no entries as no filter", () => {
      const query = read({ budgetOp: "notIn", budget: " , " });

      expect(query.typedFilters).toEqual({});
      expect(query.rejected).toEqual([]);
    });

    it("reads a list operator left beside a stale bound as no filter", () => {
      const query = read({ budgetOp: "in", budgetMin: "5" });

      expect(query.typedFilters).toEqual({});
      expect(query.rejected).toEqual([]);
    });

    it("refuses an upper bound that is not a number", () => {
      const query = read({ budgetMax: "lots" });

      expect(query.typedFilters).toEqual({});
      expect(query.rejected).toEqual([
        { param: "f_budgetMax", value: "lots", reason: "not a number" },
      ]);
    });

    it("keeps a range open on the side the link left out", () => {
      expect(read({ budgetMax: "5000", budgetOp: "lte" }).typedFilters).toEqual(
        { budget: { type: "numberRange", op: "lte", max: 5000 } }
      );
      expect(read({ budgetMin: "1000" }).typedFilters).toEqual({
        budget: { type: "numberRange", op: "gte", min: 1000 },
      });
    });
  });

  describe("dateRange", () => {
    it("refuses a relative filter with no window, or a window it cannot read", () => {
      expect(read({ hiredAtOp: "relative" }).rejected).toEqual([
        { param: "f_hiredAtFrom", value: "", reason: "not a relative date" },
      ]);
      expect(
        read({ hiredAtOp: "relative", hiredAtFrom: "last:0" }).rejected
      ).toEqual([
        {
          param: "f_hiredAtFrom",
          value: "last:0",
          reason: "not a relative date",
        },
      ]);
    });

    it("accepts a date-time and refuses a malformed time or a second T", () => {
      expect(
        read({ hiredAtFrom: "2024-01-01T09:30:00.000Z", hiredAtOp: "gte" })
          .typedFilters
      ).toEqual({
        hiredAt: {
          type: "dateRange",
          op: "gte",
          from: "2024-01-01T09:30:00.000Z",
        },
      });

      for (const bad of ["2024-01-01Tnoon", "2024-01-01T09:30T10:30"]) {
        expect(read({ hiredAtTo: bad }).rejected).toEqual([
          { param: "f_hiredAtTo", value: bad, reason: "not an ISO date" },
        ]);
      }
    });

    it("keeps a range open at the start when only the end is sent", () => {
      expect(read({ hiredAtTo: "2024-12-31" }).typedFilters).toEqual({
        hiredAt: { type: "dateRange", op: "lte", to: "2024-12-31" },
      });
    });

    it("reads a bare value with no operator and no bounds as no filter", () => {
      const query = parseTableQuery(
        "?f_hiredAt=2024-01-01&f_budget=10",
        schema
      );

      expect(query.typedFilters).toEqual({});
      expect(query.rejected).toEqual([]);
    });

    it("refuses an operator no date filter has, `eq` aside", () => {
      expect(
        read({ hiredAtFrom: "2024-01-01", hiredAtOp: "gt" }).rejected
      ).toEqual([
        {
          param: "f_hiredAtOp",
          value: "gt",
          reason: "not an operator a dateRange filter allows",
        },
      ]);
    });
  });
});

describe("typed filter trees", () => {
  const reasonFor = (tree: QueryFilterGroup, over: QuerySchema = schema) => {
    const query = parseTableQuery(treeUrl(tree), over);
    return query.filterTree === undefined
      ? query.rejected.map((entry) => entry.reason)
      : "accepted";
  };
  const one = (key: string, op: string, value?: unknown) => ({
    combinator: "and" as const,
    conditions: [{ key, op, value }],
  });

  it("accepts a nested tree whose every condition fits its filter", () => {
    const tree: QueryFilterGroup = {
      combinator: "and",
      conditions: [
        { key: "name", op: "contains", value: "ad" },
        {
          combinator: "or",
          conditions: [
            { key: "hiredAt", op: "relative", value: "last:7" },
            {
              key: "hiredAt",
              op: "between",
              value: ["2024-01-01", "2024-06-30"],
            },
            { key: "active", op: "eq", value: true },
            { key: "status", op: "eq", value: "open" },
            { key: "team", op: "in", value: ["Core", "Data"] },
            { key: "name", op: "notEmpty" },
            { key: "score", op: "atLeast", value: "4" },
          ],
        },
      ],
    };

    const query = parseTableQuery(treeUrl(tree), schema);
    expect(query.filterTree).toEqual(tree);
    expect(query.rejected).toEqual([]);
  });

  it("refuses a tree it cannot read", () => {
    const query = parseTableQuery("?ft=not-a-tree", schema);

    expect(query.filterTree).toBeUndefined();
    expect(query.rejected).toEqual([
      {
        param: "ft",
        value: "not-a-tree",
        reason: "not a readable filter tree",
      },
    ]);
  });

  it("reports the first unusable condition when several are", () => {
    const tree: QueryFilterGroup = {
      combinator: "and",
      conditions: [
        { key: "salary", op: "eq", value: 1 },
        { key: "name", op: "gt", value: "ad" },
      ],
    };

    expect(reasonFor(tree)).toEqual(['"salary" is not a declared filter']);
  });

  it("refuses a condition on an undeclared filter", () => {
    expect(reasonFor(one("salary", "eq", 1))).toEqual([
      '"salary" is not a declared filter',
    ]);
  });

  it("refuses any operator on a filter of an unknown type", () => {
    expect(
      reasonFor(one("score", "atLeast", "4"), { ...schema, filterTypes: [] })
    ).toEqual(['"atLeast" is not an operator a stars filter allows']);
  });

  it("refuses a value of the wrong shape for its type", () => {
    expect(reasonFor(one("budget", "gt", "ten"))).toEqual([
      '"budget" needs a number',
    ]);
    expect(reasonFor(one("hiredAt", "relative", "last:0"))).toEqual([
      '"hiredAt" needs a relative date',
    ]);
    expect(reasonFor(one("hiredAt", "relative", 7))).toEqual([
      '"hiredAt" needs a relative date',
    ]);
    expect(reasonFor(one("hiredAt", "before", "soon"))).toEqual([
      '"hiredAt" needs an ISO date',
    ]);
    expect(reasonFor(one("hiredAt", "before", 20240101))).toEqual([
      '"hiredAt" needs an ISO date',
    ]);
    expect(reasonFor(one("active", "eq", "yes"))).toEqual([
      '"active" needs true or false',
    ]);
    expect(reasonFor(one("team", "in", ["Core", 7]))).toEqual([
      '"team" needs text values',
    ]);
    expect(reasonFor(one("status", "eq", "closed"))).toEqual([
      '"status" names a value outside its options',
    ]);
  });
});

describe("grouping keys with declared filters", () => {
  it("refuses a grouping key outside the columns once, and groups by none", () => {
    const query = parseTableQuery("?groupBy=secret", schema);

    expect(query.groupBy).toBeUndefined();
    expect(query.groupByKeys).toBeUndefined();
    expect(query.rejected).toEqual([
      { param: "groupBy", value: "secret", reason: "not a groupable column" },
    ]);
  });

  it("refuses it once when the schema reports grouping keys too", () => {
    const query = parseTableQuery("?groupBy=secret", {
      ...schema,
      groupByKeys: true,
    });

    expect(query.groupBy).toBeUndefined();
    expect(query.groupByKeys).toBeUndefined();
    expect(query.rejected).toEqual([
      { param: "groupBy", value: "secret", reason: "not a groupable column" },
    ]);
  });
});
