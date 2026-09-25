import { describe, expect, it, vi } from "vitest";

import { memoLast } from "./memoLast";

describe("memoLast", () => {
  it("keeps the last result while every argument is the same", () => {
    const compute = vi.fn((a: number, b: object) => ({ a, b }));
    const cached = memoLast(compute);
    const b = {};
    const first = cached(1, b);
    expect(cached(1, b)).toBe(first);
    expect(compute).toHaveBeenCalledTimes(1);
    expect(cached(1, {})).not.toBe(first);
    expect(cached(2, b)).not.toBe(first);
    expect(compute).toHaveBeenCalledTimes(3);
  });

  it("treats a different argument count as a different call", () => {
    const cached = memoLast((...values: number[]) => values.length);
    expect(cached(1)).toBe(1);
    expect(cached(1, 2)).toBe(2);
  });
});
