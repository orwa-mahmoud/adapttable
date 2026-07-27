import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useGroupCollapse } from "./useGroupCollapse";

describe("useGroupCollapse", () => {
  it("defaults to expanded and toggles collapse", () => {
    const { result } = renderHook(() => useGroupCollapse());
    expect(result.current.isCollapsed("group:team:Core")).toBe(false);
    act(() => result.current.toggle("group:team:Core"));
    expect(result.current.isCollapsed("group:team:Core")).toBe(true);
    act(() => result.current.toggle("group:team:Core"));
    expect(result.current.isCollapsed("group:team:Core")).toBe(false);
  });

  it("expandAll / collapseAll", () => {
    const { result } = renderHook(() => useGroupCollapse());
    act(() => result.current.collapseAll(["a", "b"]));
    expect(result.current.collapsedIds.size).toBe(2);
    act(() => result.current.expandAll());
    expect(result.current.collapsedIds.size).toBe(0);
  });

  it("supports controlled collapsedGroupIds", () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ ids }: { ids: string[] }) =>
        useGroupCollapse({
          collapsedGroupIds: ids,
          onCollapsedGroupIdsChange: onChange,
        }),
      { initialProps: { ids: [] as string[] } }
    );
    act(() => result.current.toggle("g1"));
    expect(onChange).toHaveBeenCalledWith(["g1"]);
    rerender({ ids: ["g1"] });
    expect(result.current.isCollapsed("g1")).toBe(true);
  });
});
