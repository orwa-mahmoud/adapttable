import { describe, expect, it } from "vitest";

import type { QueryFilterGroup } from "../contracts/query";
import { defaultFilterRegistry } from "./filterBuiltins";
import type { FilterDef } from "./filterDefs";
import {
  evaluateFilterTree,
  evaluatePreparedFilterTree,
  prepareFilterTree,
} from "./filterTree";

interface Row {
  id: string;
  name: string;
  team: string;
  budget: number;
}

const ROWS: Row[] = Array.from({ length: 60 }, (_, i) => ({
  id: String(i),
  name: `n${String(i)}`,
  team: ["core", "web", "data"][i % 3]!,
  budget: (i * 37) % 100,
}));

const DEFS: FilterDef<Row>[] = [
  { key: "name", type: "text", getValue: (row) => row.name },
  {
    key: "team",
    type: "select",
    options: [
      { value: "core", label: "core" },
      { value: "web", label: "web" },
    ],
    getValue: (row) => row.team,
  },
  { key: "budget", type: "number", getValue: (row) => row.budget },
];

const TREES: QueryFilterGroup[] = [
  { combinator: "and", conditions: [] },
  {
    combinator: "and",
    conditions: [
      { key: "team", op: "is", value: "core" },
      {
        combinator: "or",
        conditions: [
          { key: "name", op: "contains", value: "1" },
          { key: "budget", op: "gt", value: "50" },
        ],
      },
    ],
  },
  {
    combinator: "or",
    conditions: [
      { key: "team", op: "is", value: "web" },
      { key: "missing", op: "is", value: "x" },
    ],
  },
  {
    combinator: "and",
    conditions: [
      { key: "name", op: "contains", value: "" },
      { combinator: "or", conditions: [] },
      { key: "budget", op: "lt", value: "20" },
    ],
  },
];

describe("prepared filter trees", () => {
  it.each(TREES.map((tree, index) => [index, tree] as const))(
    "keep the rows evaluateFilterTree keeps (tree %i)",
    (_, tree) => {
      const expected = ROWS.filter((row) =>
        evaluateFilterTree(tree, row, DEFS, defaultFilterRegistry)
      );
      const prepared = prepareFilterTree(tree, DEFS, defaultFilterRegistry);
      expect(ROWS.filter(prepared)).toEqual(expected);
      expect(
        ROWS.filter((row) =>
          evaluatePreparedFilterTree(tree, row, DEFS, defaultFilterRegistry)
        )
      ).toEqual(expected);
    }
  );

  it("prepares again when the definitions change", () => {
    const tree: QueryFilterGroup = {
      combinator: "and",
      conditions: [{ key: "team", op: "is", value: "core" }],
    };
    const keep = (defs: readonly FilterDef<Row>[]) =>
      ROWS.filter((row) =>
        evaluatePreparedFilterTree(tree, row, defs, defaultFilterRegistry)
      ).length;
    expect(keep(DEFS)).toBe(20);
    const reread: FilterDef<Row>[] = DEFS.map((def) =>
      def.key === "team" ? { ...def, getValue: () => "core" } : def
    );
    expect(keep(reread)).toBe(60);
    expect(keep(DEFS)).toBe(20);
  });
});
