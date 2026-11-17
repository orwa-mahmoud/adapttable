import {
  CHECKLIST_ITEM_WIDTH,
  CHECKLIST_OPTION_GAP,
} from "@adapttable/core/binding";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useChecklistWindow } from "./checklistWindow";

/** Container width that fits exactly `columns` option cells. */
function widthFor(columns: number): number {
  return columns * CHECKLIST_ITEM_WIDTH + (columns - 1) * CHECKLIST_OPTION_GAP;
}

describe("useChecklistWindow", () => {
  it("returns the whole list untouched when disabled", () => {
    const { result } = renderHook(() => useChecklistWindow(200, false));
    expect(result.current.start).toBe(0);
    expect(result.current.end).toBe(200);
    expect(result.current.padTop).toBe(0);
    expect(result.current.padBottom).toBe(0);
  });

  it("windows once enabled", () => {
    const { result } = renderHook(() => useChecklistWindow(200, true));
    expect(result.current.end).toBeLessThan(200);
  });

  it("survives a ref that never attaches", () => {
    const { result } = renderHook(() => useChecklistWindow(200, true));
    act(() => result.current.ref(null));
    act(() => result.current.onScroll());
    expect(result.current.end).toBeLessThan(200);
  });

  it("reads the element it is attached to", () => {
    const { result } = renderHook(() => useChecklistWindow(200, true));
    const node = document.createElement("div");
    Object.defineProperty(node, "clientWidth", { value: widthFor(2) });
    act(() => result.current.ref(node));
    expect(result.current.end).toBeGreaterThan(0);
  });
});
