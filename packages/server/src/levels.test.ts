/**
 * The levels of checking a host can choose.
 *
 * Every URL here is written the way the table writes it: one `f_<key>`
 * parameter per filter, `f_<key>Op` beside it, range bounds under their
 * suffixes, and a multi-value filter as ONE parameter whose entries are each
 * percent-encoded and joined with commas.
 */
import {
  type QueryFilterGroup,
  serializeFilterTree,
} from "@adapttable/core/query";
import { describe, expect, it } from "vitest";

import { parseTableQuery, pickFilters, splitFilterValues } from "./index";

/** A filter bag encoded exactly as the table's `writeExtra` encodes it. */
function tableUrl(
  extra: Record<string, string | readonly string[]>,
  rest: Record<string, string> = {}
): string {
  const params = new URLSearchParams(rest);
  for (const [key, value] of Object.entries(extra)) {
    params.set(
      `f_${key}`,
      typeof value === "string"
        ? value
        : value.map((entry) => encodeURIComponent(entry)).join(",")
    );
  }
  return `?${params.toString()}`;
}

const treeParam = (tree: QueryFilterGroup) => serializeFilterTree(tree) ?? "";

describe("splitFilterValues", () => {
  it("inverts the table's multi-value encoding, commas and ampersands included", () => {
    const url = tableUrl({ team: ["Core", "R&D", "Sales, EMEA"] });
    const raw = new URLSearchParams(url.slice(1)).get("f_team");

    expect(splitFilterValues(raw)).toEqual(["Core", "R&D", "Sales, EMEA"]);
    expect(splitFilterValues("")).toEqual([]);
    expect(splitFilterValues(null)).toEqual([]);
  });
});

describe("level 1 — a column list, exactly as before", () => {
  const schema = { columns: ["name", "team", "budget"] };

  it("returns the same object it always has", () => {
    expect(
      parseTableQuery(
        tableUrl(
          { team: ["Core", "Data"], name: "ada" },
          { page: "2", limit: "10", sortBy: "name", groupBy: "team" }
        ),
        schema
      )
    ).toEqual({
      page: 2,
      limit: 10,
      offset: 10,
      sort: [{ key: "name", dir: "asc" }],
      groupBy: "team",
      filters: { team: "Core,Data", name: "ada" },
      rejected: [],
    });
  });

  it("still refuses what it always refused", () => {
    expect(
      parseTableQuery(
        tableUrl(
          { budgetMin: "10", nameOp: "contains" },
          { groupBy: "team,name" }
        ),
        schema
      )
    ).toEqual({
      page: 1,
      limit: 25,
      offset: 0,
      sort: [],
      filters: {},
      rejected: [
        {
          param: "groupBy",
          value: "team,name",
          reason: "not a groupable column",
        },
        {
          param: "f_budgetMin",
          value: "10",
          reason: "not a filterable column",
        },
        {
          param: "f_nameOp",
          value: "contains",
          reason: "not a filterable column",
        },
      ],
    });
  });

  it("reports every grouping key only when asked", () => {
    const query = parseTableQuery("?groupBy=team,name", {
      ...schema,
      groupByKeys: true,
    });

    expect(query.groupByKeys).toEqual(["team", "name"]);
    expect(query.groupBy).toBeUndefined();
    expect(query.rejected).toEqual([]);
  });
});

describe('level 0 — columns: "any"', () => {
  it("parses and shapes everything, refusing no names", () => {
    const query = parseTableQuery(
      tableUrl(
        {
          name: "ada",
          nameOp: "startsWith",
          budgetMin: "1000",
          budgetMax: "5000",
          hiredAtFrom: "2024-01-01",
          hiredAtTo: "2024-12-31",
          team: ["Core", "Data"],
        },
        { sortBy: "secret", groupBy: "team,status" }
      ),
      { columns: "any" }
    );

    expect(query.rejected).toEqual([]);
    expect(query.sort).toEqual([{ key: "secret", dir: "asc" }]);
    expect(query.groupByKeys).toEqual(["team", "status"]);
    expect(query.shapedFilters).toEqual({
      name: { value: "ada", op: "startsWith" },
      budget: { min: "1000", max: "5000" },
      hiredAt: { from: "2024-01-01", to: "2024-12-31" },
      team: { value: "Core,Data" },
    });
  });
});

describe("level 2 — a filter shorthand", () => {
  const schema = {
    columns: ["name", "team", "budget", "hiredAt", "active"],
    filters: {
      name: "text",
      team: "multiSelect",
      budget: "numberRange",
      hiredAt: "dateRange",
      active: "boolean",
    },
  };

  it("types every filter the table writes", () => {
    const query = parseTableQuery(
      tableUrl({
        name: "ada",
        team: ["Core", "R&D"],
        budgetMin: "1000",
        budgetMax: "5000",
        budgetOp: "between",
        hiredAtFrom: "2024-01-01",
        hiredAtOp: "gte",
        active: "true",
      }),
      schema
    );

    expect(query.rejected).toEqual([]);
    expect(query.typedFilters).toEqual({
      name: { type: "text", op: "contains", value: "ada" },
      team: { type: "multiSelect", op: "in", values: ["Core", "R&D"] },
      budget: { type: "numberRange", op: "between", min: 1000, max: 5000 },
      hiredAt: { type: "dateRange", op: "gte", from: "2024-01-01" },
      active: { type: "boolean", op: "eq", value: true },
    });
  });

  it("reads a relative date and a listed number", () => {
    const query = parseTableQuery(
      tableUrl({
        hiredAtOp: "relative",
        hiredAtFrom: "last:7",
        budgetOp: "in",
        budget: ["10", "20"],
      }),
      schema
    );

    expect(query.typedFilters).toEqual({
      hiredAt: { type: "dateRange", op: "relative", relative: "last:7" },
      budget: { type: "numberRange", op: "in", values: [10, 20] },
    });
  });

  it("refuses an undeclared filter, a foreign operator and malformed values", () => {
    const query = parseTableQuery(
      tableUrl({
        salary: "1",
        nameOp: "gt",
        name: "ada",
        budgetMin: "lots",
        hiredAtFrom: "yesterday-ish",
        active: "maybe",
      }),
      schema
    );

    expect(query.typedFilters).toEqual({});
    expect(query.rejected.map((entry) => entry.param).sort()).toEqual(
      [
        "f_active",
        "f_budgetMin",
        "f_hiredAtFrom",
        "f_nameOp",
        "f_salary",
      ].sort()
    );
  });

  it("checks a filter tree's keys, operators and values", () => {
    const good = parseTableQuery(
      `?ft=${encodeURIComponent(
        treeParam({
          combinator: "and",
          conditions: [
            { key: "name", op: "contains", value: "ad" },
            { key: "budget", op: "gt", value: 10 },
          ],
        })
      )}`,
      schema
    );
    expect(good.filterTree).toBeDefined();

    const bad = parseTableQuery(
      `?ft=${encodeURIComponent(
        treeParam({
          combinator: "or",
          conditions: [{ key: "name", op: "gt", value: "ad" }],
        })
      )}`,
      schema
    );
    expect(bad.filterTree).toBeUndefined();
    expect(bad.rejected[0]?.param).toBe("ft");
  });
});

describe("level 3 — the table's own filter definitions", () => {
  const defs = [
    {
      key: "status",
      type: "select",
      options: [{ value: "open", label: "Open" }],
    },
    {
      key: "team",
      type: "multiSelect",
      options: [
        { value: "Core", label: "Core" },
        { value: "Data", label: "Data" },
      ],
    },
    { key: "owner", type: "select", options: "auto" as const },
    { key: "name", type: "text" },
  ];

  it("enforces a static option list and accepts an automatic one", () => {
    const query = parseTableQuery(
      tableUrl({ status: "open", team: ["Core"], owner: "anyone" }),
      { columns: ["status", "team", "owner", "name"], filters: defs }
    );

    expect(query.rejected).toEqual([]);
    expect(query.typedFilters).toMatchObject({
      status: { value: "open" },
      team: { values: ["Core"] },
      owner: { value: "anyone" },
    });
  });

  it("refuses a value outside the options", () => {
    const query = parseTableQuery(tableUrl({ team: ["Core", "Legal"] }), {
      columns: ["team"],
      filters: defs,
    });

    expect(query.typedFilters).toEqual({});
    expect(query.rejected).toEqual([
      {
        param: "f_team",
        value: "Legal",
        reason: "not one of the filter's options",
      },
    ]);
  });

  it("scopes filters to what a caller may use", () => {
    const query = parseTableQuery(tableUrl({ name: "ada", status: "open" }), {
      columns: ["name", "status"],
      filters: pickFilters(defs, ["name"]),
    });

    expect(Object.keys(query.typedFilters ?? {})).toEqual(["name"]);
    expect(query.rejected.map((entry) => entry.param)).toEqual(["f_status"]);
  });

  it("checks operators of a registered filter type", () => {
    const schema = {
      columns: ["score"],
      filters: [{ key: "score", type: "stars" }],
      filterTypes: [{ type: "stars", ops: ["atLeast"], defaultOp: "atLeast" }],
    };

    expect(
      parseTableQuery(tableUrl({ score: "4" }), schema).typedFilters
    ).toEqual({
      score: { type: "custom", filterType: "stars", op: "atLeast", value: "4" },
    });
    expect(
      parseTableQuery(tableUrl({ score: "4", scoreOp: "eq" }), schema).rejected
    ).toHaveLength(1);
  });
});
