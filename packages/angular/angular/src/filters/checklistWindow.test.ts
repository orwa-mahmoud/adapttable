/**
 * The checklist window: a short list is drawn whole, a long one is sliced,
 * and an unchanged scroll position is not a new viewport.
 */
import { describe, expect, it } from "vitest";

import { checklistSlice, nextChecklistViewport } from "./checklistWindow";

describe("checklistSlice", () => {
  it("returns the whole list when it is not windowed", () => {
    expect(checklistSlice(3, false, 40, 200)).toEqual({
      start: 0,
      end: 3,
      padTop: 0,
      padBottom: 0,
    });
  });

  it("slices a long list", () => {
    const slice = checklistSlice(400, true, 0, 320);
    expect(slice.start).toBe(0);
    expect(slice.end).toBeGreaterThan(0);
    expect(slice.end).toBeLessThan(400);
  });
});

describe("nextChecklistViewport", () => {
  it("keeps the current viewport when the list is not mounted", () => {
    const current = { scrollTop: 1, width: 2 };
    expect(nextChecklistViewport(current, undefined)).toBe(current);
  });

  it("keeps it when the numbers have not moved", () => {
    const current = { scrollTop: 4, width: 8 };
    const node = { scrollTop: 4, clientWidth: 8 } as HTMLElement;
    expect(nextChecklistViewport(current, node)).toBe(current);
  });

  it("returns the new numbers when they moved", () => {
    const current = { scrollTop: 0, width: 8 };
    const node = { scrollTop: 12, clientWidth: 40 } as HTMLElement;
    expect(nextChecklistViewport(current, node)).toEqual({
      scrollTop: 12,
      width: 40,
    });
  });
});
