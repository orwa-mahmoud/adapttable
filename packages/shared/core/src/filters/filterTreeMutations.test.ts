import { describe, expect, it } from "vitest";

import type { QueryFilterGroup } from "../source/queryContract";
import {
  addFilterTreeCondition,
  addFilterTreeGroup,
  emptyFilterTree,
  removeFilterTreeNode,
  replaceFilterTreeNode,
  setFilterTreeCombinator,
  walkFilterTreeConditions,
} from "./filterTreeMutations";

const LEAF = { key: "name", op: "eq", value: "Ada" };

describe("filterTreeMutations", () => {
  it("starts a tree from nothing and nests a group", () => {
    const withLeaf = addFilterTreeCondition(undefined, [], LEAF);
    expect(withLeaf).toEqual({
      combinator: "and",
      conditions: [LEAF],
    });
    const withGroup = addFilterTreeGroup(withLeaf, []);
    expect(withGroup.conditions).toHaveLength(2);
    expect(walkFilterTreeConditions(withGroup)).toEqual([
      { condition: LEAF, path: [0] },
    ]);
  });

  it("replaces a leaf, flips a combinator, and drops an emptied root", () => {
    const tree: QueryFilterGroup = {
      combinator: "and",
      conditions: [LEAF],
    };
    const renamed = replaceFilterTreeNode(tree, [0], {
      key: "team",
      op: "eq",
      value: "Core",
    });
    expect(renamed.conditions[0]).toEqual({
      key: "team",
      op: "eq",
      value: "Core",
    });
    expect(setFilterTreeCombinator(renamed, [], "or").combinator).toBe("or");
    expect(removeFilterTreeNode(renamed, [0])).toBeUndefined();
  });

  it("sets a nested combinator and replaces the root group", () => {
    const nested = addFilterTreeGroup(emptyFilterTree(), []);
    const flipped = setFilterTreeCombinator(nested, [0], "or");
    expect((flipped.conditions[0] as QueryFilterGroup).combinator).toBe("or");
    expect(setFilterTreeCombinator(nested, [9], "or")).toEqual(nested);
    const replaced = replaceFilterTreeNode(nested, [], {
      combinator: "or",
      conditions: [LEAF],
    });
    expect(replaced.combinator).toBe("or");
    expect(replaceFilterTreeNode(nested, [], LEAF)).toEqual(nested);
  });

  it("removes a nested leaf without dropping the root", () => {
    const tree = addFilterTreeCondition(
      addFilterTreeGroup(emptyFilterTree(), []),
      [0],
      LEAF
    );
    const next = removeFilterTreeNode(tree, [0, 0]);
    expect(next?.conditions).toHaveLength(1);
    expect(walkFilterTreeConditions(next)).toEqual([]);
  });
});
