import { describe, expect, it } from "vitest";

import {
  computePagination,
  paginationItems,
  paginationSlots,
} from "./paginationMath";

describe("computePagination", () => {
  it("computes pages and range for a full set", () => {
    expect(computePagination({ page: 1, limit: 25, total: 75 })).toEqual({
      totalPages: 3,
      safePage: 1,
      fromIndex: 1,
      toIndex: 25,
    });
  });

  it("computes the partial last page range", () => {
    expect(computePagination({ page: 3, limit: 25, total: 60 })).toEqual({
      totalPages: 3,
      safePage: 3,
      fromIndex: 51,
      toIndex: 60,
    });
  });

  it("clamps an over-range page to the last", () => {
    const info = computePagination({ page: 99, limit: 10, total: 25 });
    expect(info.safePage).toBe(3);
    expect(info.totalPages).toBe(3);
  });

  it("returns a 0 range and 1 page for an empty set", () => {
    expect(computePagination({ page: 1, limit: 25, total: 0 })).toEqual({
      totalPages: 1,
      safePage: 1,
      fromIndex: 0,
      toIndex: 0,
    });
  });

  it("guards against a non-positive limit", () => {
    const info = computePagination({ page: 1, limit: 0, total: 5 });
    expect(info.totalPages).toBe(5);
  });

  it("never yields NaN for non-finite inputs", () => {
    for (const input of [
      { page: Number.NaN, limit: 10, total: 50 },
      { page: 1, limit: Number.NaN, total: 50 },
      { page: 1, limit: 10, total: Number.NaN },
      { page: Infinity, limit: 10, total: 50 },
    ]) {
      const info = computePagination(input);
      for (const v of Object.values(info)) {
        expect(Number.isFinite(v)).toBe(true);
      }
      expect(info.safePage).toBeGreaterThanOrEqual(1);
      expect(info.safePage).toBeLessThanOrEqual(info.totalPages);
    }
  });
});

describe("paginationItems", () => {
  it("lists every page when they all fit (no ellipsis)", () => {
    expect(paginationItems(1, 6)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(paginationItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("elides on the right near the start", () => {
    expect(paginationItems(1, 8)).toEqual([1, 2, 3, 4, 5, "ellipsis", 8]);
  });

  it("elides on the left near the end", () => {
    expect(paginationItems(8, 8)).toEqual([1, "ellipsis", 4, 5, 6, 7, 8]);
  });

  it("elides on both sides in the middle", () => {
    expect(paginationItems(10, 20)).toEqual([
      1,
      "ellipsis",
      9,
      10,
      11,
      "ellipsis",
      20,
    ]);
  });

  it("collapses a single skipped page to that page instead of an ellipsis", () => {
    // Right side: page 8 is shown rather than an "ellipsis" hiding only it.
    expect(paginationItems(9, 9)).toEqual([1, "ellipsis", 5, 6, 7, 8, 9]);
    // Left side: page 2 is shown rather than an "ellipsis".
    expect(paginationItems(1, 9)).toEqual([1, 2, 3, 4, 5, "ellipsis", 9]);
  });

  it("widens the window with more siblings", () => {
    expect(paginationItems(10, 20, 2)).toEqual([
      1,
      "ellipsis",
      8,
      9,
      10,
      11,
      12,
      "ellipsis",
      20,
    ]);
  });

  it("clamps the current page into range", () => {
    expect(paginationItems(99, 20)).toEqual([
      1,
      "ellipsis",
      16,
      17,
      18,
      19,
      20,
    ]);
    expect(paginationItems(-5, 20)).toEqual([1, 2, 3, 4, 5, "ellipsis", 20]);
  });

  it("coerces a non-positive or non-finite page to the first", () => {
    expect(paginationItems(0, 6)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(paginationItems(Number.NaN, 6)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("coerces a non-finite total to a single page", () => {
    expect(paginationItems(1, Number.NaN)).toEqual([1]);
    expect(paginationItems(1, Infinity)).toEqual([1]);
    expect(paginationItems(1, 0)).toEqual([1]);
  });
});

describe("paginationSlots", () => {
  it("keys page numbers by their value", () => {
    expect(paginationSlots(1, 6)).toEqual([
      { item: 1, key: "1" },
      { item: 2, key: "2" },
      { item: 3, key: "3" },
      { item: 4, key: "4" },
      { item: 5, key: "5" },
      { item: 6, key: "6" },
    ]);
  });

  it("keys the left ellipsis before the right one (no array index)", () => {
    const slots = paginationSlots(10, 20);
    expect(slots.map((s) => s.key)).toEqual([
      "1",
      "ellipsis-left",
      "9",
      "10",
      "11",
      "ellipsis-right",
      "20",
    ]);
    expect(slots.map((s) => s.item)).toEqual([
      1,
      "ellipsis",
      9,
      10,
      11,
      "ellipsis",
      20,
    ]);
  });

  it("keys a single (right-side) ellipsis as the left side", () => {
    expect(paginationSlots(1, 8).map((s) => s.key)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "ellipsis-left",
      "8",
    ]);
  });
});
