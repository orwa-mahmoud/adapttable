/**
 * The emptiness rules behind the funnel on a column header.
 *
 * Every adapter used to carry a byte-identical copy of this predicate, so a
 * mistake in it would have been a mistake seven times. It decides whether a
 * column is marked as filtered, and a funnel that lights up for a value the
 * user cleared sends them looking for a filter that is not there — so each
 * shape a cleared control leaves behind is checked on its own.
 */
import { describe, expect, it, vi } from "vitest";

import type { ExtraFilters } from "../types";
import type { FilterDef } from "./filterDefs";
import { hasActiveHeaderFilter } from "./FilterHeaderRow";

const TEXT: FilterDef = { key: "name", type: "text", label: "Name" };
const MULTI: FilterDef = {
  key: "tags",
  type: "multiSelect",
  label: "Tags",
  options: [
    { value: "a", label: "A" },
    { value: "b", label: "B" },
  ],
};
const RANGE: FilterDef = { key: "age", type: "numberRange", label: "Age" };

const active = (def: FilterDef, extra: ExtraFilters) =>
  hasActiveHeaderFilter({
    def,
    // The predicate only reads `extra`; the writers exist to satisfy the type.
    source: { extra, setExtra: vi.fn(), setExtras: vi.fn() },
  });

describe("hasActiveHeaderFilter", () => {
  it("is quiet when the filter bag has nothing for the column", () => {
    expect(active(TEXT, {})).toBe(false);
  });

  it("treats a cleared text field as no filter", () => {
    // A text input that was typed in and emptied leaves "", not undefined.
    expect(active(TEXT, { name: "" })).toBe(false);
  });

  it("treats a key that is present but unset as no filter", () => {
    // `FilterValue` admits `undefined` but not `null`, so this is the shape a
    // caller can actually put in the bag; the predicate's `== null` covers both.
    expect(active(TEXT, { name: undefined })).toBe(false);
  });

  it("treats a cleared multi-select as no filter", () => {
    // Unchecking the last option leaves [], which is the shape most likely to
    // be mistaken for a value: it is truthy.
    expect(active(MULTI, { tags: [] })).toBe(false);
  });

  it("marks a typed value", () => {
    expect(active(TEXT, { name: "Ada" })).toBe(true);
  });

  it("marks a non-empty multi-select", () => {
    expect(active(MULTI, { tags: ["a"] })).toBe(true);
  });

  it("marks a zero, which is a value and not an absence", () => {
    // A number range writes Min/Max, not the From/To a date range uses.
    expect(active(RANGE, { ageMin: 0 })).toBe(true);
  });

  it("marks a range that only has its upper bound set", () => {
    // A range spreads over more than one state key, so any one of them counts.
    expect(active(RANGE, { ageMax: 65 })).toBe(true);
  });

  it("stays quiet when every key of a multi-key filter is empty", () => {
    expect(active(RANGE, { ageMin: "", ageMax: undefined })).toBe(false);
  });

  it("ignores state belonging to another column", () => {
    expect(active(TEXT, { team: "Core" })).toBe(false);
  });
});
