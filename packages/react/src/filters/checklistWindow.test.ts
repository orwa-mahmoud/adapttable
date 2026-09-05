import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CHECKLIST_ITEM_HEIGHT, CHECKLIST_LIST_HEIGHT } from "./checklist";
import {
  CHECKLIST_ITEM_WIDTH,
  CHECKLIST_OPTION_GAP,
  checklistWindow,
  columnsAcross,
  useChecklistWindow,
} from "./checklistWindow";

const ROW_HEIGHT = CHECKLIST_ITEM_HEIGHT + CHECKLIST_OPTION_GAP;

/** Container width that fits exactly `columns` option cells. */
function widthFor(columns: number): number {
  return columns * CHECKLIST_ITEM_WIDTH + (columns - 1) * CHECKLIST_OPTION_GAP;
}

describe("columnsAcross", () => {
  it("assumes one per row before anything is measured", () => {
    expect(columnsAcross(0)).toBe(1);
    expect(columnsAcross(-10)).toBe(1);
  });

  it("counts whole cells, gaps included", () => {
    expect(columnsAcross(widthFor(1))).toBe(1);
    expect(columnsAcross(widthFor(3))).toBe(3);
    // One pixel short of a fourth cell is still three.
    expect(columnsAcross(widthFor(4) - 1)).toBe(3);
  });

  it("never returns zero for a container narrower than one cell", () => {
    expect(columnsAcross(CHECKLIST_ITEM_WIDTH - 50)).toBe(1);
  });
});

describe("checklistWindow", () => {
  it("starts at the top with a spacer holding the rest open", () => {
    const window = checklistWindow(200, 0, 0);
    expect(window.start).toBe(0);
    expect(window.padTop).toBe(0);
    expect(window.end).toBeLessThan(200);
    expect(window.padBottom).toBeGreaterThan(0);
  });

  it("mounts a window of fixed size, not the whole list", () => {
    const visibleRows = Math.ceil(CHECKLIST_LIST_HEIGHT / ROW_HEIGHT);
    // The window is always the same number of rows — the viewport plus two
    // rows of overscan each side — so the mounted count does not jump around
    // as the reader scrolls. At the top the leading overscan is simply
    // clamped away, it is not rendered above the first row.
    const rows = visibleRows + 4;
    expect(checklistWindow(200, 0, 0).end).toBe(rows);
    expect(checklistWindow(200, 20 * ROW_HEIGHT, 0)).toMatchObject({
      start: 18,
      end: 18 + rows,
    });
  });

  it("moves the window and the spacers as the list scrolls", () => {
    const window = checklistWindow(200, 20 * ROW_HEIGHT, 0);
    expect(window.start).toBe(18);
    expect(window.padTop).toBe(18 * ROW_HEIGHT);
    expect(window.end).toBeGreaterThan(window.start);
    expect(window.padBottom).toBeGreaterThan(0);
  });

  it("counts rows of options, not options, once several fit across", () => {
    const width = widthFor(4);
    const window = checklistWindow(200, 0, width);
    // 200 options in rows of four: the window covers four times the rows.
    expect(window.end).toBe(checklistWindow(200, 0, 0).end * 4);
  });

  it("clamps to the end of the list instead of scrolling past it", () => {
    const window = checklistWindow(60, 10_000, 0);
    expect(window.end).toBe(60);
    expect(window.padBottom).toBe(0);
    expect(window.start).toBeGreaterThan(0);
  });

  it("holds a list shorter than the viewport whole", () => {
    const window = checklistWindow(3, 0, 0);
    expect(window).toEqual({ start: 0, end: 3, padTop: 0, padBottom: 0 });
  });
});

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
