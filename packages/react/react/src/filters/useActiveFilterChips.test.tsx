import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useActiveFilterChips } from "./useActiveFilterChips";

const status = (v: string) => `Status: ${v}`;

describe("useActiveFilterChips", () => {
  it("renders one chip per scalar value", () => {
    const { result } = renderHook(() =>
      useActiveFilterChips({
        values: { scope: "global", count: 5 },
        labels: { scope: (v) => `Scope: ${v}`, count: (v) => `Count: ${v}` },
        onChange: vi.fn(),
      })
    );
    expect(result.current.map((c) => c.label)).toEqual([
      "Scope: global",
      "Count: 5",
    ]);
  });

  it("renders one chip per array element", () => {
    const { result } = renderHook(() =>
      useActiveFilterChips({
        values: { status: ["Active", "Planned"] },
        labels: { status },
        onChange: vi.fn(),
      })
    );
    expect(result.current.map((c) => c.label)).toEqual([
      "Status: Active",
      "Status: Planned",
    ]);
  });

  it("removing one array element keeps the rest", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useActiveFilterChips({
        values: { status: ["A", "B", "C"] },
        labels: { status },
        onChange,
      })
    );
    result.current[1]?.onRemove();
    expect(onChange).toHaveBeenCalledWith("status", ["A", "C"]);
  });

  it("removing the last array element clears the key", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useActiveFilterChips({
        values: { status: ["A"] },
        labels: { status },
        onChange,
      })
    );
    result.current[0]?.onRemove();
    expect(onChange).toHaveBeenCalledWith("status", undefined);
  });

  it("removing a scalar passes undefined", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useActiveFilterChips({
        values: { scope: "global" },
        labels: { scope: (v) => v },
        onChange,
      })
    );
    result.current[0]?.onRemove();
    expect(onChange).toHaveBeenCalledWith("scope", undefined);
  });

  it("never resolves labels through the prototype chain (crafted URL keys)", () => {
    // `?f_valueOf=x` produces the key "valueOf"; a plain-record lookup
    // would return Object.prototype.valueOf and crash when called.
    const { result } = renderHook(() =>
      useActiveFilterChips({
        values: { valueOf: "x", toString: "y", constructor: "z" },
        labels: {},
        onChange: vi.fn(),
      })
    );
    expect(result.current).toEqual([]);
  });

  it("skips empty values and keys without a resolver", () => {
    const { result } = renderHook(() =>
      useActiveFilterChips({
        values: {
          a: "",
          b: null as never,
          c: undefined,
          dept: "Eng",
          ghost: "x",
        },
        labels: {
          a: (v) => v,
          b: (v) => v,
          c: (v) => v,
          dept: (v) => `Dept: ${v}`,
        },
        onChange: vi.fn(),
      })
    );
    expect(result.current.map((c) => c.label)).toEqual(["Dept: Eng"]);
  });
});
