import { describe, expect, it } from "vitest";

import type { QueryFilterGroup } from "../contracts/query";
import { filterTreeSnapshot, sameFilterTree } from "./filterTreeSnapshot";

function tree(): QueryFilterGroup {
  return {
    combinator: "and",
    conditions: [
      { key: "status", op: "in", value: ["active", "planned"] },
      {
        combinator: "or",
        conditions: [{ key: "budget", op: "gt", value: 10 }],
      },
    ],
  };
}

describe("filter tree snapshot", () => {
  it("matches an equal tree built afresh", () => {
    expect(sameFilterTree(tree(), filterTreeSnapshot(tree()))).toBe(true);
  });

  it("sees a host mutate the tree it snapshotted", () => {
    const current = tree();
    const snapshot = filterTreeSnapshot(current);
    const list = current.conditions[0] as { value: string[] };
    list.value.push("done");
    expect(sameFilterTree(current, snapshot)).toBe(false);
  });

  it("sees a changed operator, key, combinator or nested group", () => {
    const snapshot = filterTreeSnapshot(tree());
    const op = tree();
    (op.conditions[0] as { op: string }).op = "notIn";
    const combinator: QueryFilterGroup = { ...tree(), combinator: "or" };
    const nested = tree();
    (nested.conditions[1] as QueryFilterGroup).conditions = [];
    for (const changed of [op, combinator, nested])
      expect(sameFilterTree(changed, snapshot)).toBe(false);
  });

  it("keeps an object operand by identity", () => {
    const range = { from: 1, to: 2 };
    const current: QueryFilterGroup = {
      combinator: "and",
      conditions: [{ key: "budget", op: "between", value: range }],
    };
    const snapshot = filterTreeSnapshot(current);
    expect(sameFilterTree(current, snapshot)).toBe(true);
    const copy: QueryFilterGroup = {
      combinator: "and",
      conditions: [{ key: "budget", op: "between", value: { ...range } }],
    };
    expect(sameFilterTree(copy, snapshot)).toBe(false);
  });

  it("matches nothing without a snapshot", () => {
    expect(sameFilterTree(tree(), undefined)).toBe(false);
  });
});
