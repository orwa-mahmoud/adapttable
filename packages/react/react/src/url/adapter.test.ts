import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  createMemoryAdapter,
  getHistoryAdapter,
  resetHistoryAdapter,
  useResolvedAdapter,
} from "./adapter";

afterEach(() => {
  resetHistoryAdapter();
  window.history.replaceState(null, "", "/");
});

describe("useResolvedAdapter", () => {
  // `enabled: false` means "this hook is not syncing", so writes must land in
  // memory whoever supplied the adapter. Resolving the caller's adapter first
  // let a disabled hook write straight to the real URL.
  it("ignores an explicit adapter while disabled", () => {
    const explicit = createMemoryAdapter("");
    const { result } = renderHook(() => useResolvedAdapter(explicit, false));
    expect(result.current).not.toBe(explicit);

    result.current.setSearch("q=leaked");
    expect(explicit.getSearch()).toBe("");
  });

  it("uses the explicit adapter while enabled", () => {
    const explicit = createMemoryAdapter("");
    const { result } = renderHook(() => useResolvedAdapter(explicit, true));
    expect(result.current).toBe(explicit);
  });

  it("uses the shared history adapter in a browser with no explicit adapter", () => {
    const { result } = renderHook(() => useResolvedAdapter(undefined, true));
    expect(result.current).toBe(getHistoryAdapter());
  });

  it("keeps one memory adapter across renders while disabled", () => {
    const explicit = createMemoryAdapter("");
    const { result, rerender } = renderHook(() =>
      useResolvedAdapter(explicit, false)
    );
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
