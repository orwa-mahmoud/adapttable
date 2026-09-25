import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { computePagination, paginationItems } from "./paginationMath";

const finiteInt = fc.integer({ min: -50, max: 500 });

describe("pagination clamping — properties", () => {
  it("safePage always sits in [1, totalPages] and the range is coherent", () => {
    fc.assert(
      fc.property(
        fc.record({
          page: finiteInt,
          limit: finiteInt,
          total: finiteInt,
        }),
        (input) => {
          const info = computePagination(input);
          const values = Object.values(info);
          expect(values.every((value) => Number.isFinite(value))).toBe(true);
          expect(info.totalPages).toBeGreaterThanOrEqual(1);
          expect(info.safePage).toBeGreaterThanOrEqual(1);
          expect(info.safePage).toBeLessThanOrEqual(info.totalPages);
          if (info.fromIndex === 0) {
            expect(info.toIndex).toBe(0);
          } else {
            expect(info.fromIndex).toBeLessThanOrEqual(info.toIndex);
          }
        }
      )
    );
  });

  it("non-finite inputs still produce finite clamped figures", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(Number.NaN, Infinity, -Infinity),
        fc.constantFrom("page", "limit", "total"),
        (bad, field) => {
          const input = { page: 2, limit: 10, total: 40, [field]: bad };
          const info = computePagination(input);
          for (const value of Object.values(info)) {
            expect(Number.isFinite(value)).toBe(true);
          }
          expect(info.safePage).toBeGreaterThanOrEqual(1);
          expect(info.safePage).toBeLessThanOrEqual(info.totalPages);
        }
      )
    );
  });

  it("pager items stay unique, in range, and include the clamped page", () => {
    fc.assert(
      fc.property(
        finiteInt,
        finiteInt,
        fc.integer({ min: 0, max: 4 }),
        (page, totalPages, siblings) => {
          const items = paginationItems(page, totalPages, siblings);
          const numbers = items.filter(
            (item): item is number => item !== "ellipsis"
          );
          const total = Number.isFinite(totalPages)
            ? Math.max(1, Math.floor(totalPages))
            : 1;
          const current = Math.min(Math.max(Math.floor(page) || 1, 1), total);
          expect(new Set(numbers).size).toBe(numbers.length);
          expect(numbers.every((n) => n >= 1 && n <= total)).toBe(true);
          expect(numbers).toContain(current);
          expect(numbers[0]).toBe(1);
          expect(numbers.at(-1)).toBe(total);
        }
      )
    );
  });
});
