/**
 * A user's column rename is a display name, never a new identity: the key that
 * URL state, saved views, filters and exports are written against has to
 * survive it untouched. A column that did not opt into renaming keeps its
 * declared name even if a stale state names it.
 */
import { describe, expect, it } from "vitest";

import type { ColumnMetadata } from "../columnModel";
import { applyColumnNames, declaredColumnName } from "./columnNames";

interface Row {
  id: string;
}

const COLUMNS: ColumnMetadata<Row>[] = [
  { key: "name", header: "Name", renameable: true },
  { key: "team", header: "Team" },
  {
    key: "chip",
    header: { rendered: true },
    mobileLabel: "Chip",
    renameable: true,
  },
];

describe("declaredColumnName", () => {
  it("is the header, then the mobile label, then the key", () => {
    expect(declaredColumnName(COLUMNS[0]!)).toBe("Name");
    expect(declaredColumnName(COLUMNS[2]!)).toBe("Chip");
    expect(declaredColumnName({ key: "notes" })).toBe("notes");
  });
});

describe("applyColumnNames", () => {
  it("copies the columns through when no name is overridden", () => {
    expect(applyColumnNames(COLUMNS, undefined)).toEqual(COLUMNS);
    expect(applyColumnNames(COLUMNS, {})).toEqual(COLUMNS);
    expect(applyColumnNames(COLUMNS, undefined)).not.toBe(COLUMNS);
  });

  it("renames only a column that opted in, and keeps its key", () => {
    const named = applyColumnNames(COLUMNS, {
      name: "  Full name  ",
      team: "Squad",
    });
    expect(named[0]).toMatchObject({
      key: "name",
      header: "Full name",
      mobileLabel: "Full name",
    });
    expect(named[1]).toBe(COLUMNS[1]);
  });

  it("ignores a name that trims away to nothing", () => {
    expect(applyColumnNames(COLUMNS, { name: "   " })[0]).toBe(COLUMNS[0]);
  });
});
