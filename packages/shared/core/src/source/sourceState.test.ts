import { describe, expect, it, vi } from "vitest";

import { memoOne } from "./sourceState";

describe("source input memo", () => {
  it("keeps result identity for the same inputs and replaces only the last entry", () => {
    const compute = vi.fn((value: number, input: object) => ({ value, input }));
    const cached = memoOne(compute);
    const input = {};
    const first = cached(NaN, input);
    expect(cached(NaN, input)).toBe(first);
    expect(compute).toHaveBeenCalledTimes(1);
    const replacement = cached(NaN, {});
    expect(replacement).not.toBe(first);
    expect(cached(NaN, input)).not.toBe(first);
    expect(compute).toHaveBeenCalledTimes(3);
    const positiveZero = cached(0, input);
    expect(cached(-0, input)).not.toBe(positiveZero);
  });

  it("recomputes when optional inputs are added or removed", () => {
    const cached = memoOne((...values: unknown[]) => ({
      count: values.length,
    }));
    const empty = cached();
    expect(cached()).toBe(empty);
    expect(cached(undefined).count).toBe(1);
    expect(cached(undefined, undefined).count).toBe(2);
    expect(cached(undefined).count).toBe(1);
    expect(cached().count).toBe(0);
  });

  it("keeps a successful cached value when another computation throws", () => {
    const compute = vi.fn((fail: boolean) => {
      if (fail) throw new Error("unavailable");
      return undefined;
    });
    const cached = memoOne(compute);
    expect(cached(false)).toBeUndefined();
    expect(cached(false)).toBeUndefined();
    expect(compute).toHaveBeenCalledTimes(1);
    expect(() => cached(true)).toThrow("unavailable");
    expect(cached(false)).toBeUndefined();
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it("lets an outer reentrant computation publish after its nested call", () => {
    const compute = vi.fn((value: number): { value: number } => {
      if (value === 1) cached(2);
      return { value };
    });
    const cached = memoOne(compute);
    const outer = cached(1);
    expect(cached(1)).toBe(outer);
    expect(compute).toHaveBeenCalledTimes(2);
    expect(cached(2)).toEqual({ value: 2 });
    expect(compute).toHaveBeenCalledTimes(3);
  });

  it("retains a nested success when the outer reentrant computation throws", () => {
    let inner: { value: number } | undefined;
    const compute = vi.fn((value: number): { value: number } => {
      if (value === 1) {
        inner = cached(2);
        throw new Error("outer unavailable");
      }
      return { value };
    });
    const cached = memoOne(compute);
    expect(() => cached(1)).toThrow("outer unavailable");
    expect(cached(2)).toBe(inner);
    expect(compute).toHaveBeenCalledTimes(2);
  });
});
