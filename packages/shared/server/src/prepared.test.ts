/**
 * A schema prepared once answers every query exactly as the same schema
 * passed per request does.
 */
import { serializeFilterTree } from "@adapttable/core/query";
import { describe, expect, it } from "vitest";

import { parseTableQuery, prepareQuerySchema, type QuerySchema } from "./index";

const tree = (conditions: unknown[]) =>
  `ft=${encodeURIComponent(
    serializeFilterTree({
      combinator: "and",
      conditions: conditions as never[],
    }) ?? ""
  )}`;

const SCHEMAS: Record<string, QuerySchema> = {
  columns: { columns: ["name", "team", "budget"], maxLimit: 50 },
  any: { columns: "any" },
  declared: {
    columns: ["name", "status", "team", "budget", "hiredAt", "score"],
    filters: [
      { key: "name", type: "text" },
      {
        key: "status",
        type: "select",
        options: [
          { value: "open", label: "Open" },
          { value: "closed", label: "Closed" },
        ],
      },
      { key: "team", type: "multiSelect" },
      { key: "budget", type: "numberRange" },
      { key: "hiredAt", type: "dateRange" },
      { key: "score", type: "stars" },
    ],
    filterTypes: [{ type: "stars", ops: ["atLeast"], defaultOp: "atLeast" }],
    groupByKeys: true,
    urlKey: "t",
  },
  record: { columns: ["name", "team"], filters: { team: "multiSelect" } },
};

const QUERIES = [
  "",
  "page=3&limit=20&q=ada&sort=name:asc,team:desc",
  "f_name=ada&f_team=core,web&f_secret=x",
  "f_status=open&f_statusOp=eq&f_budgetMin=10&f_budgetMax=5&f_hiredAtFrom=2026-02-30",
  "f_status=nope&f_scoreOp=atLeast&f_score=4&groupBy=team,secret",
  tree([
    { key: "status", op: "eq", value: "closed" },
    { key: "team", op: "in", value: ["core"] },
  ]),
  tree([{ key: "status", op: "eq", value: "nope" }]),
  "t.page=2&t.f_name=x&t.groupBy=team",
];

describe("prepareQuerySchema", () => {
  it("answers every query as the same schema does per request", () => {
    for (const [name, schema] of Object.entries(SCHEMAS)) {
      const prepared = prepareQuerySchema(schema);
      for (const query of QUERIES) {
        expect(
          parseTableQuery(`?${query}`, prepared),
          `${name}: ${query}`
        ).toEqual(parseTableQuery(`?${query}`, schema));
      }
    }
  });

  it("answers from the schema as it was when it was prepared", () => {
    const columns = ["name"];
    const schema: QuerySchema = { columns, filters: { name: "text" } };
    const prepared = prepareQuerySchema(schema);
    columns.push("team");
    expect(parseTableQuery("?sort=team:asc", prepared).sort).toEqual([]);
    expect(prepared.schema.columns).toEqual(["name"]);
  });

  it("keeps the filter choices it read when it was prepared", () => {
    const options = [{ value: "open", label: "Open" }];
    const schema: QuerySchema = {
      columns: ["status"],
      filters: [{ key: "status", type: "select", options }],
    };
    const prepared = prepareQuerySchema(schema);
    options.push({ value: "closed", label: "Closed" });
    expect(
      parseTableQuery("?f_status=closed", prepared).rejected.map(
        (entry) => entry.param
      )
    ).toEqual(["f_status"]);
  });

  it("refuses a prepared schema it did not prepare", () => {
    expect(() =>
      parseTableQuery("", { schema: { columns: ["name"] } })
    ).toThrow(/prepareQuerySchema/);
  });
});
