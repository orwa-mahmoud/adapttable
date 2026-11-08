import { describe, expect, it } from "vitest";

import { retainItems, sameItems } from "./sameItems";

describe("sameItems", () => {
  const a = { id: 1 };
  const b = { id: 2 };

  it("is true for the same array or the same items in a new array", () => {
    const items = [a, b];
    expect(sameItems(items, items)).toBe(true);
    expect(sameItems(items, [a, b])).toBe(true);
  });

  it("is false when the length or any item differs", () => {
    expect(sameItems([a, b], [a])).toBe(false);
    expect(sameItems([a, b], [a, { id: 2 }])).toBe(false);
    expect(sameItems([a], [a, a])).toBe(false);
  });

  it("compares with Object.is", () => {
    expect(sameItems([Number.NaN], [Number.NaN])).toBe(true);
    expect(sameItems([0], [-0])).toBe(false);
  });
});

describe("retainItems", () => {
  it("keeps the previous list when the items are the same", () => {
    const previous = ["a", "b"];
    expect(retainItems(previous, ["a", "b"])).toBe(previous);
  });

  it("takes the next list when an item changes or either side is absent", () => {
    const next = ["a", "c"];
    expect(retainItems(["a", "b"], next)).toBe(next);
    expect(retainItems(undefined, next)).toBe(next);
    expect(retainItems(["a"], undefined)).toBeUndefined();
  });
});
