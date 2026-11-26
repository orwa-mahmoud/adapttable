import { describe, expect, it } from "vitest";

import {
  columnLayoutFamilyList,
  editingFamilyList,
  filteringFamilyList,
  flattenFeatures,
} from "./featureFamilies";

interface Made {
  readonly id: string;
  readonly args?: readonly unknown[];
}

const made = (id: string, ...args: unknown[]): Made =>
  args.length === 0 ? { id } : { id, args };

describe("flattenFeatures", () => {
  it("puts each family's members where the family stood", () => {
    const list = [
      made("a"),
      [made("b"), made("c")],
      made("d"),
      [],
      [made("e")],
    ] as const;
    expect(flattenFeatures<Made>(list).map((f) => f.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
    ]);
  });

  it("keeps a list without families as the same array", () => {
    const list = [made("a"), made("b")];
    expect(flattenFeatures<Made>(list)).toBe(list);
  });
});

describe("family lists", () => {
  it("builds all of editing from the kit's factories", () => {
    const save = () => undefined;
    const extras = { onEditStart: () => undefined };
    expect(
      editingFamilyList(
        {
          editing: (onCellEdit, more) => made("editing", onCellEdit, more),
          dirtyIndicators: () => made("dirtyIndicators"),
          editHistory: () => made("editHistory"),
          undoRedoButtons: () => made("undoRedoButtons"),
        },
        save,
        extras
      )
    ).toEqual([
      made("editing", save, extras),
      made("dirtyIndicators"),
      made("editHistory"),
      made("undoRedoButtons"),
    ]);
  });

  it("builds all of filtering for the given definitions", () => {
    const defs = [{ key: "team" }];
    expect(
      filteringFamilyList(
        {
          filters: (given) => made("filters", given),
          headerFilters: () => made("headerFilters"),
        },
        defs
      )
    ).toEqual([made("filters", defs), made("headerFilters")]);
  });

  it("builds all of column layout", () => {
    expect(
      columnLayoutFamilyList({
        columnMenu: () => made("columnMenu"),
        resizableColumns: () => made("resizableColumns"),
        fitColumns: () => made("fitColumns"),
      }).map((f) => f.id)
    ).toEqual(["columnMenu", "resizableColumns", "fitColumns"]);
  });
});
