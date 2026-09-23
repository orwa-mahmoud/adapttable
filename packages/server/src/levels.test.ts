/**
 * The levels of checking a host can choose.
 *
 * Every URL here is written by the table's own writers — `writeExtra` for the
 * `f_` filter bag, `writeSortLevels` for the sort chain, `writeFilterTreeParam`
 * for the tree, `serializePivotState` for the pivot — so a change to how the
 * table encodes a link fails a test here rather than a request in production.
 */
import {
  defaultFilterRegistry,
  type ExtraFilters,
  type FilterDef,
  filterPredicate,
  type PivotUrlState,
  type QueryFilterGroup,
  serializePivotState,
  type SortLevel,
  writeExtra,
  writeFilterTreeParam,
  writeSortLevels,
} from "@adapttable/core";
import { describe, expect, it } from "vitest";

import {
  parseTableQuery,
  pickFilters,
  type QuerySchema,
  splitFilterValues,
  type TypedFilter,
} from "./index";

/** What a link carries besides its filters, each written by the table. */
interface LinkParts {
  readonly params?: Readonly<Record<string, string>>;
  readonly sort?: readonly SortLevel[];
  readonly tree?: QueryFilterGroup;
  readonly pivot?: PivotUrlState;
}

/** A query string, written the way the table writes its URL. */
function tableUrl(extra: ExtraFilters, parts: LinkParts = {}): string {
  const params = new URLSearchParams(parts.params);
  writeExtra(params, extra);
  if (parts.sort) writeSortLevels(params, parts.sort);
  if (parts.tree) writeFilterTreeParam(params, parts.tree);
  if (parts.pivot) params.set("pivot", serializePivotState(parts.pivot));
  return `?${params.toString()}`;
}

/** Every filter type, as the table holds it in its filter bag. */
const EVERY_TYPE: ExtraFilters = {
  name: "ada",
  nameOp: "startsWith",
  status: "open",
  team: ["Core", "R&D"],
  tags: ["urgent", "Sales, EMEA"],
  active: "true",
  budgetMin: 1000,
  budgetMax: 5000,
  budgetOp: "between",
  hiredAtFrom: "2024-01-01",
  hiredAtTo: "2024-12-31",
  hiredAtOp: "between",
};

/** The same filters, declared by type. */
const EVERY_TYPE_SHORTHAND = {
  name: "text",
  status: "select",
  team: "multiSelect",
  tags: "checklist",
  active: "boolean",
  budget: "numberRange",
  hiredAt: "dateRange",
} as const;

/** What levels 2 and 3 type `EVERY_TYPE` into. */
const EVERY_TYPE_TYPED: Record<string, TypedFilter> = {
  name: { type: "text", op: "startsWith", value: "ada" },
  status: { type: "select", op: "eq", value: "open" },
  team: { type: "multiSelect", op: "in", values: ["Core", "R&D"] },
  tags: { type: "checklist", op: "in", values: ["urgent", "Sales, EMEA"] },
  active: { type: "boolean", op: "eq", value: true },
  budget: { type: "numberRange", op: "between", min: 1000, max: 5000 },
  hiredAt: {
    type: "dateRange",
    op: "between",
    from: "2024-01-01",
    to: "2024-12-31",
  },
};

const COLUMNS = Object.keys(EVERY_TYPE_SHORTHAND);

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
          {
            params: { page: "2", limit: "10", sortBy: "name", groupBy: "team" },
          }
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
          { params: { groupBy: "team,name" } }
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

  it("answers with groupBy alone without the flag", () => {
    const query = parseTableQuery("?groupBy=team", schema);

    expect(query.groupBy).toBe("team");
    expect(query.groupByKeys).toBeUndefined();
    expect(query.rejected).toEqual([]);
  });

  it("reports a single grouping key both ways when asked", () => {
    const query = parseTableQuery("?groupBy=team", {
      ...schema,
      groupByKeys: true,
    });

    expect(query.groupBy).toBe("team");
    expect(query.groupByKeys).toEqual(["team"]);
    expect(query.rejected).toEqual([]);
  });

  it("passes every filter type through raw, as the table encoded it", () => {
    const query = parseTableQuery(tableUrl(EVERY_TYPE), {
      columns: [
        "name",
        "nameOp",
        "status",
        "team",
        "tags",
        "active",
        "budgetMin",
        "budgetMax",
        "budgetOp",
        "hiredAtFrom",
        "hiredAtTo",
        "hiredAtOp",
      ],
    });

    expect(query.rejected).toEqual([]);
    expect(query.filters).toEqual({
      name: "ada",
      nameOp: "startsWith",
      status: "open",
      team: "Core,R%26D",
      tags: "urgent,Sales%2C%20EMEA",
      active: "true",
      budgetMin: "1000",
      budgetMax: "5000",
      budgetOp: "between",
      hiredAtFrom: "2024-01-01",
      hiredAtTo: "2024-12-31",
      hiredAtOp: "between",
    });
    expect(splitFilterValues(String(query.filters.tags))).toEqual([
      "urgent",
      "Sales, EMEA",
    ]);
    expect(query.shapedFilters).toBeUndefined();
    expect(query.typedFilters).toBeUndefined();
  });

  it("accepts a number range and its operator when the list names them", () => {
    const query = parseTableQuery(
      tableUrl({ budgetMin: 10, budgetMax: 20, budgetOp: "between" }),
      { columns: ["budgetMin", "budgetMax", "budgetOp"] }
    );

    expect(query.filters).toEqual({
      budgetMin: "10",
      budgetMax: "20",
      budgetOp: "between",
    });
    expect(query.rejected).toEqual([]);
  });
});

describe("level 1 — the object, byte for byte", () => {
  const schema: QuerySchema = {
    columns: ["name", "team", "status", "budget"],
    maxLimit: 100,
  };

  /**
   * Each fixture pins the whole object, key order included: a column-list
   * schema answers with exactly these fields, in exactly this order.
   */
  const fixtures: readonly {
    readonly name: string;
    readonly url: string;
    readonly expected: unknown;
  }[] = [
    {
      name: "an empty request",
      url: tableUrl({}),
      expected: {
        page: 1,
        limit: 25,
        offset: 0,
        sort: [],
        filters: {},
        rejected: [],
      },
    },
    {
      name: "sort, paging and search",
      url: tableUrl(
        {},
        {
          params: { page: "3", limit: "20", q: "ada" },
          sort: [
            { key: "name", dir: "asc" },
            { key: "team", dir: "desc" },
          ],
        }
      ),
      expected: {
        page: 3,
        limit: 20,
        offset: 40,
        search: "ada",
        sort: [
          { key: "name", dir: "asc" },
          { key: "team", dir: "desc" },
        ],
        filters: {},
        rejected: [],
      },
    },
    {
      name: "a limit above the ceiling and a sort outside the list",
      url: tableUrl(
        {},
        { params: { limit: "999" }, sort: [{ key: "salary", dir: "desc" }] }
      ),
      expected: {
        page: 1,
        limit: 100,
        offset: 0,
        sort: [],
        filters: {},
        rejected: [
          { param: "limit", value: "999", reason: "above the maximum of 100" },
          { param: "sort", value: "salary", reason: "not a sortable column" },
        ],
      },
    },
    {
      name: "filters",
      url: tableUrl({ team: ["Core", "Data"], name: "ada", secret: "x" }),
      expected: {
        page: 1,
        limit: 25,
        offset: 0,
        sort: [],
        filters: { team: "Core,Data", name: "ada" },
        rejected: [
          {
            param: "f_secret",
            value: "x",
            reason: "not a filterable column",
          },
        ],
      },
    },
    {
      name: "a filter tree",
      url: tableUrl(
        {},
        {
          tree: {
            combinator: "and",
            conditions: [
              { key: "name", op: "contains", value: "ad" },
              {
                combinator: "or",
                conditions: [{ key: "team", op: "eq", value: "Core" }],
              },
            ],
          },
        }
      ),
      expected: {
        page: 1,
        limit: 25,
        offset: 0,
        sort: [],
        filters: {},
        filterTree: {
          combinator: "and",
          conditions: [
            { key: "name", op: "contains", value: "ad" },
            {
              combinator: "or",
              conditions: [{ key: "team", op: "eq", value: "Core" }],
            },
          ],
        },
        rejected: [],
      },
    },
    {
      name: "groupBy",
      url: tableUrl({}, { params: { groupBy: "team" } }),
      expected: {
        page: 1,
        limit: 25,
        offset: 0,
        sort: [],
        groupBy: "team",
        filters: {},
        rejected: [],
      },
    },
    {
      name: "a pivot with folded groups",
      url: tableUrl(
        {},
        {
          pivot: {
            config: {
              rows: ["team"],
              columns: ["status"],
              measures: [{ key: "budget", agg: "sum" }],
              grandTotals: false,
            },
            collapsed: ["Core"],
          },
        }
      ),
      expected: {
        page: 1,
        limit: 25,
        offset: 0,
        sort: [],
        filters: {},
        pivot: {
          rows: ["team"],
          columns: ["status"],
          measures: [{ key: "budget", agg: "sum" }],
          grandTotals: false,
        },
        pivotCollapsed: ["Core"],
        rejected: [],
      },
    },
    {
      name: "everything at once",
      url: tableUrl(
        { name: "ada" },
        {
          params: { page: "2", limit: "10", q: "x", groupBy: "status" },
          sort: [{ key: "name", dir: "desc" }],
          tree: {
            combinator: "or",
            conditions: [{ key: "status", op: "eq", value: "open" }],
          },
          pivot: {
            config: { rows: ["team"], columns: [], measures: [] },
            collapsed: [],
          },
        }
      ),
      expected: {
        page: 2,
        limit: 10,
        offset: 10,
        search: "x",
        sort: [{ key: "name", dir: "desc" }],
        groupBy: "status",
        filters: { name: "ada" },
        filterTree: {
          combinator: "or",
          conditions: [{ key: "status", op: "eq", value: "open" }],
        },
        pivot: { rows: ["team"], columns: [], measures: [] },
        rejected: [],
      },
    },
  ];

  for (const fixture of fixtures) {
    it(`answers ${fixture.name} with exactly the expected object`, () => {
      expect(JSON.stringify(parseTableQuery(fixture.url, schema))).toBe(
        JSON.stringify(fixture.expected)
      );
    });
  }
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
        { params: { sortBy: "secret", groupBy: "team,status" } }
      ),
      { columns: "any", groupByKeys: true }
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

  it("shapes every filter type the table writes", () => {
    const query = parseTableQuery(tableUrl(EVERY_TYPE), { columns: "any" });

    expect(query.rejected).toEqual([]);
    expect(query.shapedFilters).toEqual({
      name: { value: "ada", op: "startsWith" },
      status: { value: "open" },
      team: { value: "Core,R%26D" },
      tags: { value: "urgent,Sales%2C%20EMEA" },
      active: { value: "true" },
      budget: { min: "1000", max: "5000", op: "between" },
      hiredAt: { from: "2024-01-01", to: "2024-12-31", op: "between" },
    });
    expect(splitFilterValues(query.shapedFilters?.tags?.value)).toEqual([
      "urgent",
      "Sales, EMEA",
    ]);
  });

  it("shapes a listed number and a relative date", () => {
    const query = parseTableQuery(
      tableUrl({
        budget: ["10", "20"],
        budgetOp: "in",
        hiredAtFrom: "last:7",
        hiredAtOp: "relative",
      }),
      { columns: "any" }
    );

    expect(query.shapedFilters).toEqual({
      budget: { value: "10,20", op: "in" },
      hiredAt: { from: "last:7", op: "relative" },
    });
  });

  it("reports grouping keys only when asked", () => {
    const plain = parseTableQuery("?groupBy=team", { columns: "any" });
    expect(plain.groupBy).toBe("team");
    expect(plain.groupByKeys).toBeUndefined();

    const asked = parseTableQuery("?groupBy=team", {
      columns: "any",
      groupByKeys: true,
    });
    expect(asked.groupBy).toBe("team");
    expect(asked.groupByKeys).toEqual(["team"]);
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
        budgetMin: 1000,
        budgetMax: 5000,
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

  it("types every filter type, select and checklist included", () => {
    const query = parseTableQuery(tableUrl(EVERY_TYPE), {
      columns: COLUMNS,
      filters: EVERY_TYPE_SHORTHAND,
    });

    expect(query.rejected).toEqual([]);
    expect(query.typedFilters).toEqual(EVERY_TYPE_TYPED);
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
    expect(
      query.rejected
        .map((entry) => entry.param)
        .sort((a, b) => a.localeCompare(b))
    ).toEqual([
      "f_active",
      "f_budgetMin",
      "f_hiredAtFrom",
      "f_nameOp",
      "f_salary",
    ]);
  });

  it("checks a filter tree's keys, operators and values", () => {
    const good = parseTableQuery(
      tableUrl(
        {},
        {
          tree: {
            combinator: "and",
            conditions: [
              { key: "name", op: "contains", value: "ad" },
              { key: "budget", op: "gt", value: 10 },
            ],
          },
        }
      ),
      schema
    );
    expect(good.filterTree).toBeDefined();

    const bad = parseTableQuery(
      tableUrl(
        {},
        {
          tree: {
            combinator: "or",
            conditions: [{ key: "name", op: "gt", value: "ad" }],
          },
        }
      ),
      schema
    );
    expect(bad.filterTree).toBeUndefined();
    expect(bad.rejected[0]?.param).toBe("ft");
  });

  it("reports grouping keys only when asked", () => {
    const plain = parseTableQuery("?groupBy=team", schema);
    expect(plain.groupBy).toBe("team");
    expect(plain.groupByKeys).toBeUndefined();
    expect(plain.rejected).toEqual([]);

    const asked = parseTableQuery("?groupBy=team", {
      ...schema,
      groupByKeys: true,
    });
    expect(asked.groupBy).toBe("team");
    expect(asked.groupByKeys).toEqual(["team"]);
    expect(asked.rejected).toEqual([]);
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

  it("types every filter type and enforces a checklist's options", () => {
    const every = [
      { key: "name", type: "text" },
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
          { value: "R&D", label: "R&D" },
        ],
      },
      {
        key: "tags",
        type: "checklist",
        options: [
          { value: "urgent", label: "Urgent" },
          { value: "Sales, EMEA", label: "Sales, EMEA" },
        ],
      },
      { key: "active", type: "boolean" },
      { key: "budget", type: "numberRange" },
      { key: "hiredAt", type: "dateRange" },
    ];
    const schema = { columns: COLUMNS, filters: every };

    const query = parseTableQuery(tableUrl(EVERY_TYPE), schema);
    expect(query.rejected).toEqual([]);
    expect(query.typedFilters).toEqual(EVERY_TYPE_TYPED);

    expect(
      parseTableQuery(tableUrl({ tags: ["urgent", "later"] }), schema).rejected
    ).toEqual([
      {
        param: "f_tags",
        value: "later",
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

  it("reports grouping keys only when asked", () => {
    const plain = parseTableQuery("?groupBy=status", {
      columns: ["status"],
      filters: defs,
    });
    expect(plain.groupBy).toBe("status");
    expect(plain.groupByKeys).toBeUndefined();
    expect(plain.rejected).toEqual([]);

    const asked = parseTableQuery("?groupBy=status", {
      columns: ["status"],
      filters: defs,
      groupByKeys: true,
    });
    expect(asked.groupBy).toBe("status");
    expect(asked.groupByKeys).toEqual(["status"]);
    expect(asked.rejected).toEqual([]);
  });
});

describe("a range with no operator — typed the way the table matches it", () => {
  const shorthand = {
    columns: ["budget", "hiredAt"],
    filters: { budget: "numberRange", hiredAt: "dateRange" },
  };
  const definitions = {
    columns: ["budget", "hiredAt"],
    filters: [
      { key: "budget", type: "numberRange" },
      { key: "hiredAt", type: "dateRange" },
    ],
  };

  const cases: readonly {
    readonly extra: ExtraFilters;
    readonly typed: TypedFilter;
  }[] = [
    {
      extra: { budgetMin: 10, budgetMax: 20 },
      typed: { type: "numberRange", op: "between", min: 10, max: 20 },
    },
    {
      extra: { budgetMin: 10 },
      typed: { type: "numberRange", op: "gte", min: 10 },
    },
    {
      extra: { budgetMax: 20 },
      typed: { type: "numberRange", op: "lte", max: 20 },
    },
    {
      extra: { hiredAtFrom: "2024-01-01", hiredAtTo: "2024-06-30" },
      typed: {
        type: "dateRange",
        op: "between",
        from: "2024-01-01",
        to: "2024-06-30",
      },
    },
    {
      extra: { hiredAtFrom: "2024-01-01" },
      typed: { type: "dateRange", op: "gte", from: "2024-01-01" },
    },
    {
      extra: { hiredAtTo: "2024-06-30" },
      typed: { type: "dateRange", op: "lte", to: "2024-06-30" },
    },
  ];

  for (const [level, schema] of [
    [2, shorthand],
    [3, definitions],
  ] as const) {
    for (const { extra, typed } of cases) {
      it(`level ${String(level)}: ${Object.keys(extra).join(" + ")} → ${typed.op}`, () => {
        const query = parseTableQuery(tableUrl(extra), schema);

        expect(query.rejected).toEqual([]);
        expect(Object.values(query.typedFilters ?? {})).toEqual([typed]);
      });
    }
  }

  /** A row set that straddles every bound above. */
  const budgets = [5, 10, 15, 20, 25];
  const days = [
    "2023-12-31",
    "2024-01-01",
    "2024-03-15",
    "2024-06-30",
    "2024-07-01",
  ];

  /** A range filter's bounds, whichever kind of range it is. */
  function boundsOf(filter: TypedFilter) {
    if (filter.type === "numberRange") {
      return { low: filter.min, high: filter.max };
    }
    if (filter.type === "dateRange")
      return { low: filter.from, high: filter.to };
    throw new Error(`not a range: ${filter.type}`);
  }

  /** The typed filter applied the way a backend reads its operator. */
  function backendMatches(filter: TypedFilter, value: number | string) {
    const { low, high } = boundsOf(filter);
    switch (filter.op) {
      case "gte":
        return low !== undefined && value >= low;
      case "lte":
        return high !== undefined && value <= high;
      case "between":
        return (
          low !== undefined &&
          high !== undefined &&
          value >= low &&
          value <= high
        );
      default:
        throw new Error(`unexpected operator ${filter.op}`);
    }
  }

  const rangeDefs: readonly FilterDef<{ value: number | string }>[] = [
    { key: "budget", type: "numberRange", getValue: (row) => row.value },
    { key: "hiredAt", type: "dateRange", getValue: (row) => row.value },
  ];

  it("selects exactly the rows the table's own matcher selects", () => {
    for (const { extra } of cases) {
      const query = parseTableQuery(tableUrl(extra), shorthand);
      const [key, typed] = Object.entries(query.typedFilters ?? {})[0] ?? [];
      const def = rangeDefs.find((candidate) => candidate.key === key);
      if (!def || !typed) throw new Error("no typed range filter");
      const table = filterPredicate(def, defaultFilterRegistry);
      const rows = def.type === "numberRange" ? budgets : days;

      expect(rows.filter((value) => backendMatches(typed, value))).toEqual(
        rows.filter((value) => table({ value }, extra))
      );
    }
  });

  it("reads a date operator's `eq` spelling as `on` in a link and a tree", () => {
    for (const schema of [shorthand, definitions]) {
      expect(
        parseTableQuery(
          tableUrl({ hiredAtFrom: "2024-01-01", hiredAtOp: "eq" }),
          schema
        )
      ).toMatchObject({
        typedFilters: {
          hiredAt: { type: "dateRange", op: "on", from: "2024-01-01" },
        },
        rejected: [],
      });

      const tree = parseTableQuery(
        tableUrl(
          {},
          {
            tree: {
              combinator: "and",
              conditions: [
                { key: "hiredAt", op: "eq", value: "2024-01-01" },
                {
                  combinator: "or",
                  conditions: [{ key: "budget", op: "eq", value: 10 }],
                },
              ],
            },
          }
        ),
        schema
      );
      expect(tree.rejected).toEqual([]);
      expect(tree.filterTree).toEqual({
        combinator: "and",
        conditions: [
          { key: "hiredAt", op: "on", value: "2024-01-01" },
          {
            combinator: "or",
            conditions: [{ key: "budget", op: "eq", value: 10 }],
          },
        ],
      });
    }
  });
});

describe("the sort chain, read the way the table writes it", () => {
  const anyColumn: QuerySchema = { columns: "any" };

  it("decodes a key holding the chain's own separators", () => {
    const query = parseTableQuery(
      tableUrl({}, { sort: [{ key: "a:b,c", dir: "desc" }] }),
      anyColumn
    );

    expect(query.sort).toEqual([{ key: "a:b,c", dir: "desc" }]);
  });

  it("keeps a key with a malformed escape as it arrived", () => {
    const query = parseTableQuery("?sort=50%25:asc,bad%zz:desc", anyColumn);

    expect(query.sort).toEqual([
      { key: "50%", dir: "asc" },
      { key: "bad%zz", dir: "desc" },
    ]);
  });
});
