import { renderHook } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  resolveStickyToolbar,
  useStickyToolbarLayout,
} from "./useStickyToolbarLayout";

describe("resolveStickyToolbar", () => {
  it("follows stickyHeader on the page, and never inside a maxHeight box", () => {
    expect(resolveStickyToolbar(true)).toBe(true);
    expect(resolveStickyToolbar(false)).toBe(false);
    expect(resolveStickyToolbar(true, false)).toBe(false);
    expect(resolveStickyToolbar(false, true)).toBe(true);
    expect(resolveStickyToolbar(true, undefined, true)).toBe(false);
  });
});

describe("useStickyToolbarLayout", () => {
  it("parks the toolbar at stickyTop and offsets the header by its height", () => {
    const { result } = renderHook(() => useStickyToolbarLayout(true, 64));
    expect(result.current.toolbarStyle).toEqual(
      expect.objectContaining({ position: "sticky", top: 64 })
    );
    expect(result.current.headerOffset).toBe(64);

    const bar = document.createElement("div");
    vi.spyOn(bar, "getBoundingClientRect").mockReturnValue({
      height: 48,
      width: 0,
      top: 0,
      left: 0,
      right: 0,
      bottom: 48,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    act(() => {
      result.current.toolbarRef(bar);
    });
    expect(result.current.headerOffset).toBe(112);
  });

  it("clears the pin when disabled", () => {
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useStickyToolbarLayout(enabled, 16),
      { initialProps: { enabled: true } }
    );
    expect(result.current.toolbarStyle).toBeDefined();
    rerender({ enabled: false });
    expect(result.current.toolbarStyle).toBeUndefined();
    expect(result.current.headerOffset).toBe(16);
  });
});
