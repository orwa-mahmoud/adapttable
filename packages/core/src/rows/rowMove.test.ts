import { describe, expect, it } from "vitest";

import { rowDropPosition, treeMoveCreatesCycle } from "./rowMove";

describe("rowDropPosition", () => {
  const bounds = { top: 100, height: 40 };

  it("splits a tree row into before, inside and after targets", () => {
    expect(rowDropPosition(101, bounds)).toBe("before");
    expect(rowDropPosition(120, bounds)).toBe("inside");
    expect(rowDropPosition(139, bounds)).toBe("after");
  });

  it("uses after for unusable pointer geometry", () => {
    expect(rowDropPosition(Number.NaN, bounds)).toBe("after");
    expect(rowDropPosition(100, { top: 100, height: 0 })).toBe("after");
  });
});

describe("treeMoveCreatesCycle", () => {
  it("rejects self and descendant parents", () => {
    expect(treeMoveCreatesCycle("a", ["b", "c"], "a")).toBe(true);
    expect(treeMoveCreatesCycle("a", ["b", "c"], "c")).toBe(true);
  });

  it("allows an ancestor, sibling or root parent", () => {
    expect(treeMoveCreatesCycle("a", ["b", "c"], "parent")).toBe(false);
    expect(treeMoveCreatesCycle("a", ["b", "c"], "sibling")).toBe(false);
    expect(treeMoveCreatesCycle("a", ["b", "c"], null)).toBe(false);
  });
});
