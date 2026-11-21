import { describe, expect, it } from "vitest";

import {
  type CoreStandardFeatureFactories,
  standardFeatureList,
} from "./standardPreset";

type Made = readonly [string, unknown?];

const factories: CoreStandardFeatureFactories<Made, string, string, object> = {
  columnMenu: () => ["columnMenu"],
  densityChooser: () => ["densityChooser"],
  exportCsv: () => ["exportCsv"],
  findInTable: (options) => ["findInTable", options],
  fitColumns: () => ["fitColumns"],
  fullscreen: () => ["fullscreen"],
  headerFilters: () => ["headerFilters"],
  multiSort: () => ["multiSort"],
  resizableColumns: () => ["resizableColumns"],
  statusBar: () => ["statusBar"],
  grouping: (groupBy) => ["grouping", groupBy],
  bulkActions: (actions) => ["bulkActions", actions],
  filters: (defs) => ["filters", defs],
  savedViews: (options) => ["savedViews", options],
};

/** The column-layout family, then the other fixed members. */
const fixed: Made[] = [
  ["columnMenu"],
  ["resizableColumns"],
  ["fitColumns"],
  ["densityChooser"],
  ["exportCsv"],
  ["findInTable", {}],
  ["fullscreen"],
  ["multiSort"],
  ["statusBar"],
];

/** With no filters given, the header controls stand alone. */
const zeroConfig: Made[] = [...fixed, ["headerFilters"]];

describe("standardFeatureList", () => {
  it("lists the column-layout family and the fixed members, then header filters", () => {
    expect(standardFeatureList(factories)).toEqual(zeroConfig);
    expect(standardFeatureList(factories, {})).toEqual(zeroConfig);
  });

  it("draws the Find button only when findButton is true", () => {
    const findOf = (findButton?: boolean) =>
      standardFeatureList(factories, { findButton }).find(
        ([name]) => name === "findInTable"
      );
    expect(findOf(true)).toEqual(["findInTable", { button: true }]);
    expect(findOf(false)).toEqual(["findInTable", {}]);
    expect(findOf()).toEqual(["findInTable", {}]);
  });

  it("appends each configured member after the fixed ones, filters as the filtering family", () => {
    const views = { storageKey: "v" };
    expect(
      standardFeatureList(factories, {
        savedViews: views,
        filters: ["status"],
        bulkActions: ["archive"],
        grouping: ["team", "role"],
      })
    ).toEqual([
      ...fixed,
      ["grouping", ["team", "role"]],
      ["bulkActions", ["archive"]],
      ["filters", ["status"]],
      ["headerFilters"],
      ["savedViews", views],
    ]);
  });

  it("adds only the configured members that were named", () => {
    expect(standardFeatureList(factories, { grouping: "team" })).toEqual([
      ...fixed,
      ["grouping", "team"],
      ["headerFilters"],
    ]);
    expect(standardFeatureList(factories, { filters: [] })).toEqual([
      ...fixed,
      ["filters", []],
      ["headerFilters"],
    ]);
  });
});
