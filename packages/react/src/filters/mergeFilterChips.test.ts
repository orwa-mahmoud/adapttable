import { describe, expect, it } from "vitest";

import {
  type ActiveFilterChip,
  mergeFilterChips,
  resolveActiveFilterCount,
} from "./useActiveFilterChips";

const chip = (key: string): ActiveFilterChip => ({
  key,
  label: key,
  onRemove: () => undefined,
});

describe("mergeFilterChips", () => {
  const base = [chip("a"), chip("b")];

  it("returns the filter chips unchanged when there are no extra chips", () => {
    expect(mergeFilterChips(base, undefined)).toBe(base);
    expect(mergeFilterChips(base, [])).toBe(base);
  });

  it("returns the extra chips unchanged when there are no filter chips", () => {
    const extra = [chip("x")];
    expect(mergeFilterChips([], extra)).toBe(extra);
  });

  it("concatenates filter chips then extra chips when both are present", () => {
    const extra = [chip("x")];
    const result = mergeFilterChips(base, extra);
    expect(result.map((c) => c.key)).toEqual(["a", "b", "x"]);
    // A fresh array — neither input is mutated or returned.
    expect(result).not.toBe(base);
    expect(result).not.toBe(extra);
  });
});

describe("resolveActiveFilterCount", () => {
  it("prefers a positive override over the chip count", () => {
    expect(resolveActiveFilterCount(3, 5)).toBe(3);
  });

  it("falls back to the chip count when the override is undefined or zero", () => {
    expect(resolveActiveFilterCount(undefined, 5)).toBe(5);
    expect(resolveActiveFilterCount(0, 5)).toBe(5);
  });

  it("ignores a negative override", () => {
    expect(resolveActiveFilterCount(-2, 4)).toBe(4);
  });
});
