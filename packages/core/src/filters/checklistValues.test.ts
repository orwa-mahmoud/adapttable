/**
 * A checklist offers the values that are actually in the data, with counts, so
 * a reader never ticks a box that matches nothing. Static `options` only
 * supply prettier labels — inventing a value from them would put a choice in
 * front of the user that the rows cannot satisfy. A value the user has already
 * ticked stays on the list at zero, because removing the tick they can see is
 * worse than showing that it now matches nothing.
 */
import { describe, expect, it } from "vitest";

import { isDeclarativeFilters } from "../source/isDeclarativeFilters";
import { collectChecklistValues } from "./checklistValues";

interface Row {
  id: string;
  team: string;
  seats: number;
  active: boolean;
  ref: bigint;
  nested: { city: string };
  missing?: string;
}

const ROWS: Row[] = [
  {
    id: "1",
    team: "core",
    seats: 3,
    active: true,
    ref: 7n,
    nested: { city: "Paris" },
  },
  {
    id: "2",
    team: "web",
    seats: 3,
    active: false,
    ref: 8n,
    nested: { city: "Lyon" },
  },
  {
    id: "3",
    team: "core",
    seats: 1,
    active: true,
    ref: 7n,
    nested: { city: "Paris" },
  },
];

describe("collectChecklistValues", () => {
  it("counts the distinct values in the rows, alphabetically", () => {
    expect(
      collectChecklistValues({ key: "team", type: "checklist" }, ROWS)
    ).toEqual([
      { value: "core", label: "core", count: 2 },
      { value: "web", label: "web", count: 1 },
    ]);
  });

  it("reads numbers, booleans and bigints as their text", () => {
    expect(
      collectChecklistValues({ key: "seats", type: "checklist" }, ROWS).map(
        (item) => item.value
      )
    ).toEqual(["1", "3"]);
    expect(
      collectChecklistValues({ key: "active", type: "checklist" }, ROWS).map(
        (item) => item.value
      )
    ).toEqual(["false", "true"]);
    expect(
      collectChecklistValues({ key: "ref", type: "checklist" }, ROWS).map(
        (item) => item.value
      )
    ).toEqual(["7", "8"]);
  });

  it("skips a row with nothing in that field", () => {
    expect(
      collectChecklistValues({ key: "missing", type: "checklist" }, ROWS)
    ).toEqual([]);
  });

  it("reads through a projection when the definition supplies one", () => {
    expect(
      collectChecklistValues(
        { key: "city", type: "checklist", getValue: (row) => row.nested.city },
        ROWS
      ).map((item) => item.value)
    ).toEqual(["Lyon", "Paris"]);
  });

  it("labels a value from static options without inventing one", () => {
    const def = {
      key: "team",
      type: "checklist" as const,
      options: [
        { value: "core", label: "Core team" },
        { value: "ops", label: "Operations" },
      ],
    };
    expect(collectChecklistValues(def, ROWS)).toEqual([
      { value: "core", label: "Core team", count: 2 },
      { value: "web", label: "web", count: 1 },
    ]);
  });

  it("keeps a ticked value on the list even at zero", () => {
    const values = collectChecklistValues(
      { key: "team", type: "checklist" },
      ROWS,
      ["ops", ""]
    );
    expect(values).toContainEqual({ value: "ops", label: "ops", count: 0 });
    expect(values.some((item) => item.value === "")).toBe(false);
  });
});

describe("isDeclarativeFilters", () => {
  it("recognises the array form and nothing else", () => {
    expect(isDeclarativeFilters([{ key: "team", type: "text" }])).toBe(true);
    expect(isDeclarativeFilters([])).toBe(true);
    expect(isDeclarativeFilters(undefined)).toBe(false);
    expect(isDeclarativeFilters({ rendered: true })).toBe(false);
    expect(isDeclarativeFilters("filters")).toBe(false);
  });
});
