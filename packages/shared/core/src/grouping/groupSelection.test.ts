import { describe, expect, it } from "vitest";

import {
  applyGroupLeafSelection,
  groupSelectionState,
  nextGroupSelection,
} from "./groupSelection";

describe("groupSelectionState", () => {
  it("returns none / some / all over leaf ids", () => {
    const leaves = ["1", "2", "3"];
    expect(groupSelectionState(leaves, new Set())).toBe("none");
    expect(groupSelectionState(leaves, new Set(["1"]))).toBe("some");
    expect(groupSelectionState(leaves, new Set(["1", "2", "3"]))).toBe("all");
    expect(groupSelectionState([], new Set(["1"]))).toBe("none");
  });
});

describe("nextGroupSelection", () => {
  it("selects when not all selected, deselects when all selected", () => {
    const leaves = ["1", "2"];
    expect(nextGroupSelection(leaves, new Set())).toEqual({
      action: "select",
      ids: leaves,
    });
    expect(nextGroupSelection(leaves, new Set(["1"]))).toEqual({
      action: "select",
      ids: leaves,
    });
    expect(nextGroupSelection(leaves, new Set(["1", "2"]))).toEqual({
      action: "deselect",
      ids: leaves,
    });
  });
});

describe("applyGroupLeafSelection", () => {
  it("selects then deselects in one pass", () => {
    const leaves = ["1", "2"];
    const selected = applyGroupLeafSelection(leaves, new Set());
    expect([...selected].sort((a, b) => a.localeCompare(b))).toEqual([
      "1",
      "2",
    ]);
    expect(applyGroupLeafSelection(leaves, selected).size).toBe(0);
  });
});
