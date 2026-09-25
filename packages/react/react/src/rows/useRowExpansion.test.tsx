import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useRowExpansion } from "./useRowExpansion";

describe("useRowExpansion", () => {
  it("toggles rows independently and reports membership", () => {
    const { result } = renderHook(() => useRowExpansion());
    expect(result.current.isExpanded("a")).toBe(false);
    act(() => result.current.toggle("a"));
    act(() => result.current.toggle("b"));
    expect(result.current.isExpanded("a")).toBe(true);
    expect(result.current.isExpanded("b")).toBe(true);
    expect([...result.current.expandedIds]).toEqual(["a", "b"]);
    act(() => result.current.toggle("a"));
    expect(result.current.isExpanded("a")).toBe(false);
    expect(result.current.isExpanded("b")).toBe(true);
  });

  it("opens the ids it was given", () => {
    const { result } = renderHook(() => useRowExpansion(["a"]));
    expect(result.current.isExpanded("a")).toBe(true);
    expect(result.current.isExpanded("b")).toBe(false);
    act(() => result.current.toggle("a"));
    expect(result.current.isExpanded("a")).toBe(false);
  });

  it("keeps a stable identity between unrelated renders", () => {
    const { result, rerender } = renderHook(() => useRowExpansion());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
