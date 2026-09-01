import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createMemoryAdapter } from "./adapter";
import { useRowPinningUrlState } from "./useRowPinningUrlState";

describe("useRowPinningUrlState", () => {
  it("reads an empty list from a bare URL", () => {
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() =>
      useRowPinningUrlState({ urlAdapter: adapter })
    );
    expect(result.current.pinnedRowIds).toEqual({ top: [], bottom: [] });
  });

  it("reads and writes rowPin pairs", () => {
    const adapter = createMemoryAdapter("rowPin=ada%3Atop,alan%3Abottom");
    const { result } = renderHook(() =>
      useRowPinningUrlState({ urlAdapter: adapter })
    );
    expect(result.current.pinnedRowIds).toEqual({
      top: ["ada"],
      bottom: ["alan"],
    });
    act(() => {
      result.current.onPinnedRowIdsChange({ top: ["grace"], bottom: [] });
    });
    expect(adapter.getSearch()).toBe("rowPin=grace%3Atop&atv=1");
  });

  it("namespaces the parameter", () => {
    const adapter = createMemoryAdapter("left.rowPin=a:top");
    const { result } = renderHook(() =>
      useRowPinningUrlState({ urlAdapter: adapter, urlKey: "left" })
    );
    expect(result.current.pinnedRowIds.top).toEqual(["a"]);
  });

  it("does not write when urlSync is off", () => {
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() =>
      useRowPinningUrlState({ urlAdapter: adapter, urlSync: false })
    );
    act(() => {
      result.current.onPinnedRowIdsChange({ top: ["a"], bottom: [] });
    });
    expect(adapter.getSearch()).toBe("");
  });
});
