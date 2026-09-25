import { describe, expect, it } from "vitest";

import type { QueryFilterGroup } from "../source/queryContract";
import type { FilterDef } from "./filterDefs";
import { emptyFilterRegistry } from "./filterRegistry";
import {
  conditionToExtra,
  evaluateFilterTree,
  isActiveFilterTree,
  parseFilterTree,
  serializeFilterTree,
} from "./filterTree";

interface Row {
  name: string;
  team: string;
  budget: number;
}

const DEFS: FilterDef<Row>[] = [
  { key: "name", type: "text" },
  { key: "team", type: "select" },
  { key: "budget", type: "numberRange" },
];

const ADA: Row = { name: "Ada", team: "Core", budget: 100 };
const ALI: Row = { name: "Ali", team: "Platform", budget: 50 };

const TREE: QueryFilterGroup = {
  combinator: "or",
  conditions: [
    { key: "name", op: "eq", value: "Ada" },
    {
      combinator: "and",
      conditions: [
        { key: "team", op: "eq", value: "Platform" },
        { key: "budget", op: "gte", value: 40 },
      ],
    },
  ],
};

describe("serializeFilterTree / parseFilterTree", () => {
  it("round-trips a nested tree under the v1 prefix", () => {
    const raw = serializeFilterTree(TREE);
    expect(raw?.startsWith("1.")).toBe(true);
    expect(parseFilterTree(raw)).toEqual(TREE);
  });

  it("drops empty trees and unknown / broken encodings", () => {
    expect(serializeFilterTree(undefined)).toBeUndefined();
    expect(
      serializeFilterTree({ combinator: "and", conditions: [] })
    ).toBeUndefined();
    expect(parseFilterTree(null)).toBeUndefined();
    expect(parseFilterTree("")).toBeUndefined();
    expect(parseFilterTree("not-versioned")).toBeUndefined();
    expect(
      parseFilterTree('2.{"combinator":"and","conditions":[]}')
    ).toBeUndefined();
    expect(parseFilterTree("1.not-json")).toBeUndefined();
    expect(parseFilterTree("1.null")).toBeUndefined();
    expect(parseFilterTree('1."and"')).toBeUndefined();
    expect(
      parseFilterTree('1.{"combinator":"xor","conditions":[]}')
    ).toBeUndefined();
    expect(parseFilterTree('1.{"combinator":"and"}')).toBeUndefined();
    expect(isActiveFilterTree({ combinator: "or", conditions: [] })).toBe(
      false
    );
  });

  it("strips malformed children instead of inventing a different query", () => {
    expect(
      parseFilterTree(
        '1.{"combinator":"and","conditions":[{"key":"name","op":"eq","value":"Ada"},{"nope":true},{"key":"","op":"eq"},{"key":"name","op":""},null]}'
      )
    ).toEqual({
      combinator: "and",
      conditions: [{ key: "name", op: "eq", value: "Ada" }],
    });
  });
});

describe("evaluateFilterTree", () => {
  it("ANDs and ORs nested groups against the existing predicates", () => {
    expect(evaluateFilterTree(TREE, ADA, DEFS)).toBe(true);
    expect(evaluateFilterTree(TREE, ALI, DEFS)).toBe(true);
    expect(
      evaluateFilterTree(TREE, { name: "Bo", team: "Core", budget: 10 }, DEFS)
    ).toBe(false);
    expect(evaluateFilterTree(undefined, ADA, DEFS)).toBe(true);
  });

  it("treats an unknown key as a match so a stale link does not hide rows", () => {
    expect(
      evaluateFilterTree(
        {
          combinator: "and",
          conditions: [{ key: "gone", op: "eq", value: "x" }],
        },
        ADA,
        DEFS
      )
    ).toBe(true);
  });

  it("ORs to false when no child matches", () => {
    expect(
      evaluateFilterTree(
        {
          combinator: "or",
          conditions: [{ key: "name", op: "eq", value: "Bo" }],
        },
        ADA,
        DEFS
      )
    ).toBe(false);
  });
});

describe("conditionToExtra", () => {
  it("projects a checklist list onto the bag without stringifying it", () => {
    expect(
      conditionToExtra(
        { key: "team", type: "checklist" },
        { key: "team", op: "in", value: ["Core", "Web"] }
      )
    ).toEqual({ team: ["Core", "Web"] });
  });

  it("projects range ops onto the From/To or Min/Max pair", () => {
    expect(
      conditionToExtra(DEFS[2]!, {
        key: "budget",
        op: "between",
        value: [10, 20],
      })
    ).toEqual({
      budgetMin: "10",
      budgetMax: "20",
      budgetOp: "between",
    });
    expect(
      conditionToExtra(DEFS[2]!, { key: "budget", op: "lte", value: 5 })
    ).toEqual({ budgetMax: "5", budgetOp: "lte" });
    expect(
      conditionToExtra(
        { key: "hiredAt", type: "dateRange" },
        { key: "hiredAt", op: "relative", value: "today" }
      )
    ).toEqual({
      hiredAtFrom: "today",
      hiredAtOp: "relative",
    });
    expect(conditionToExtra(DEFS[2]!, { key: "budget", op: "empty" })).toEqual({
      budgetOp: "empty",
    });
    expect(
      conditionToExtra(DEFS[2]!, { key: "budget", op: "in", value: [1, 2] })
    ).toEqual({ budget: ["1", "2"], budgetOp: "in" });
    expect(
      conditionToExtra(DEFS[2]!, { key: "budget", op: "in", value: 3 })
    ).toEqual({ budget: ["3"], budgetOp: "in" });
    expect(
      conditionToExtra(DEFS[2]!, { key: "budget", op: "in", value: { x: 1 } })
    ).toEqual({ budget: undefined, budgetOp: "in" });
    expect(
      conditionToExtra(DEFS[2]!, { key: "budget", op: "between", value: 10 })
    ).toEqual({
      budgetMin: "10",
      budgetMax: undefined,
      budgetOp: "between",
    });
    expect(
      conditionToExtra(
        { key: "hiredAt", type: "dateRange" },
        { key: "hiredAt", op: "before", value: "2024-01-01" }
      )
    ).toEqual({
      hiredAtTo: "2024-01-01",
      hiredAtOp: "before",
    });
    expect(
      conditionToExtra(DEFS[0]!, { key: "name", op: "eq", value: true })
    ).toEqual({ name: "true", nameOp: "eq" });
    expect(
      conditionToExtra(DEFS[0]!, { key: "name", op: "eq", value: null })
    ).toEqual({ name: undefined, nameOp: "eq" });
  });

  it("projects an unregistered type as a scalar plus op", () => {
    // A host can declare a custom `type` string without registering a spec.
    // FilterTypeSpec requires conditionToExtra, so the only way here is an
    // unknown type — not a registered type that omitted the projector.
    const def: FilterDef<Row> = { key: "score", type: "custom-score" };
    const empty = emptyFilterRegistry();
    expect(
      conditionToExtra(def, { key: "score", op: "eq", value: 10 }, empty)
    ).toEqual({ score: "10", scoreOp: "eq" });
    expect(
      conditionToExtra(def, { key: "score", op: "eq", value: "high" }, empty)
    ).toEqual({ score: "high", scoreOp: "eq" });
    expect(
      conditionToExtra(def, { key: "score", op: "eq", value: true }, empty)
    ).toEqual({ score: "true", scoreOp: "eq" });
    expect(
      conditionToExtra(def, { key: "score", op: "eq", value: null }, empty)
    ).toEqual({ score: undefined, scoreOp: "eq" });
    expect(
      conditionToExtra(def, { key: "score", op: "eq", value: { n: 1 } }, empty)
    ).toEqual({ score: undefined, scoreOp: "eq" });
  });
});
