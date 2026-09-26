/**
 * The table's status announcement, case by case: settle once for a baseline,
 * settle again with a change, read what the table would say.
 */
import { describe, expect, it } from "vitest";

import { defaultLabels } from "../labels";
import {
  resolveTableStatus,
  type TableStatusAnnouncementOptions,
} from "./statusAnnouncement";

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
  it("says nothing on the first settle, and still returns a signature", () => {
    expect(resolveTableStatus(base, undefined)).toEqual({
      announcement: "",
      signature: { sort: ":", result: "100:1:25" },
    });
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

  it("treats a column with no direction as no sort at all", () => {
    expect(change({ sortBy: "name", sortDir: "asc" }, { sortBy: "name" })).toBe(
      "Sorting cleared"
    );
  });

  it("states the new count when a filter narrows the rows", () => {
    expect(change({}, { total: 87 })).toBe("Page 1 of 4. Showing 1–25 of 87");
  });

  it("leaves the empty case to the empty state, which announces itself", () => {
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

  it("moves the bounds with the rendered count when a source reports no limit", () => {
    expect(
      change(
        { limit: 0, paged: false, total: 40 },
        { limit: 0, paged: false, total: 40, shown: 40 }
      )
    ).toBe("Showing 1–40 of 40");
  });

  it("keeps a one-row window when nothing is rendered and no limit is set", () => {
    expect(
      resolveTableStatus({ ...base, limit: 0, shown: 0, total: 3 }, undefined)
        .signature.result
    ).toBe("3:1:1");
  });

  it("uses the table's own labels, so every locale hears its own words", () => {
    const labels = {
      ...defaultLabels,
      sortedBy: ({
        column,
        ascending,
      }: {
        column: string;
        ascending: boolean;
      }) => `Trié par ${column}, ${ascending ? "croissant" : "décroissant"}`,
    };
    expect(
      change(
        { labels },
        { labels, sortBy: "name", sortDir: "desc", sortColumnName: "Nom" }
      )
    ).toBe("Trié par Nom, décroissant");
  });
});
