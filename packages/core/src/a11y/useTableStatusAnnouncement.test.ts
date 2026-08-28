/**
 * What the table says when the rows change, case by case.
 *
 * The resolver is pure so every case is checkable without rendering — including
 * the one that matters most and is easiest to get wrong: the FIRST settle, where
 * a table that has only just arrived must say nothing at all.
 */
import { describe, expect, it } from "vitest";

import { defaultLabels } from "../labels";
import {
  resolveTableStatus,
  type TableStatusAnnouncementOptions,
} from "./useTableStatusAnnouncement";

const base: TableStatusAnnouncementOptions = {
  labels: defaultLabels,
  total: 100,
  shown: 25,
  page: 1,
  limit: 25,
  paged: true,
};

/** Settle once to get a baseline signature, then settle again with changes. */
function change(
  from: Partial<TableStatusAnnouncementOptions>,
  to: Partial<TableStatusAnnouncementOptions>
): string {
  const first = resolveTableStatus({ ...base, ...from }, undefined);
  return resolveTableStatus({ ...base, ...to }, first.signature).announcement;
}

describe("resolveTableStatus", () => {
  it("says nothing on the first settle", () => {
    expect(resolveTableStatus(base, undefined).announcement).toBe("");
  });

  it("says nothing when neither the sort nor the row set moved", () => {
    expect(change({}, {})).toBe("");
  });

  it("names the column and direction when a sort is applied", () => {
    expect(
      change({}, { sortBy: "name", sortDir: "asc", sortColumnName: "Name" })
    ).toBe("Sorted by Name, ascending");
  });

  it("names the new direction when a sort is reversed", () => {
    expect(
      change(
        { sortBy: "name", sortDir: "asc", sortColumnName: "Name" },
        { sortBy: "name", sortDir: "desc", sortColumnName: "Name" }
      )
    ).toBe("Sorted by Name, descending");
  });

  it("falls back to the column key when it has no text header", () => {
    expect(change({}, { sortBy: "name", sortDir: "asc" })).toBe(
      "Sorted by name, ascending"
    );
  });

  it("says the sort was removed", () => {
    expect(
      change({ sortBy: "name", sortDir: "asc", sortColumnName: "Name" }, {})
    ).toBe("Sorting cleared");
  });

  it("states the new count when a filter narrows the rows", () => {
    expect(change({}, { total: 87 })).toBe("Page 1 of 4. Showing 1–25 of 87");
  });

  it("leaves the empty case to the empty state, which announces itself", () => {
    // Every adapter renders its no-results panel as a `role="status"` region.
    // Saying the same words here would have a screen reader read them twice.
    expect(change({}, { total: 0 })).toBe("");
  });

  it("still names a sort that cleared the rows out", () => {
    expect(
      change(
        {},
        { total: 0, sortBy: "name", sortDir: "asc", sortColumnName: "Name" }
      )
    ).toBe("Sorted by Name, ascending");
  });

  it("states the page position when the user pages", () => {
    expect(change({}, { page: 3 })).toBe("Page 3 of 4. Showing 51–75 of 100");
  });

  it("leaves the page position out when the source does not page", () => {
    expect(change({ paged: false }, { paged: false, total: 87 })).toBe(
      "Showing 1–25 of 87"
    );
  });

  it("leaves the page position out when there is only one page", () => {
    expect(change({ limit: 500 }, { limit: 500, total: 87 })).toBe(
      "Showing 1–87 of 87"
    );
  });

  it("says both halves when a sort also moves the row set", () => {
    expect(
      change(
        {},
        {
          sortBy: "name",
          sortDir: "asc",
          sortColumnName: "Name",
          total: 87,
        }
      )
    ).toBe("Sorted by Name, ascending. Page 1 of 4. Showing 1–25 of 87");
  });

  it("falls back to the rendered count when a source reports no limit", () => {
    expect(
      change({ limit: 0, paged: false }, { limit: 0, paged: false, total: 40 })
    ).toBe("Showing 1–25 of 40");
  });
});
