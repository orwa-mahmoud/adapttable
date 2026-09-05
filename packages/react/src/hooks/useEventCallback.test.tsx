import { renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";

import { useEventCallback } from "./useEventCallback";

describe("useEventCallback", () => {
  it("keeps a stable identity across rerenders with fresh closures", () => {
    const { result, rerender } = renderHook(
      ({ n }) => useEventCallback(() => n),
      { initialProps: { n: 1 } }
    );
    const first = result.current;
    rerender({ n: 2 });
    expect(result.current).toBe(first);
  });

  it("invokes the latest render's callback after a rerender", () => {
    const { result, rerender } = renderHook(
      ({ n }) => useEventCallback(() => n),
      { initialProps: { n: 1 } }
    );
    expect(result.current()).toBe(1);
    rerender({ n: 2 });
    expect(result.current()).toBe(2);
  });

  it("forwards arguments and the return value", () => {
    const spy = vi.fn((a: number, b: number) => a + b);
    const { result } = renderHook(() => useEventCallback(spy));
    expect(result.current(2, 3)).toBe(5);
    expect(spy).toHaveBeenCalledWith(2, 3);
  });

  it("stays latched to the latest callback under StrictMode", () => {
    const { result, rerender } = renderHook(
      ({ n }) => useEventCallback(() => n),
      { initialProps: { n: 1 }, wrapper: StrictMode }
    );
    const first = result.current;
    rerender({ n: 2 });
    expect(result.current).toBe(first);
    expect(result.current()).toBe(2);
  });
});
