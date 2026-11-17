import { describe, expect, expectTypeOf, it } from "vitest";

import { defaultLabels } from "../labels";
import type { TableLabels } from "../types";
import { ACTION_LABELS } from "./actionLabels";
import { ASSISTANT_LABELS } from "./assistantLabels";
import { BASE_LABELS } from "./baseLabels";
import { COLUMN_MENU_LABELS } from "./columnMenuLabels";
import { EDITING_LABELS } from "./editingLabels";
import { EXPORT_LABELS } from "./exportLabels";
import { FILTER_LABELS } from "./filterLabels";
import { FIND_LABELS } from "./findLabels";
import { GRID_LABELS } from "./gridLabels";
import { GROUPING_LABELS } from "./groupingLabels";
import { PIVOT_LABELS } from "./pivotLabels";
import { ROW_LABELS } from "./rowLabels";
import { SAVED_VIEW_LABELS } from "./savedViewLabels";
import { resolveFeatureLabels, resolveTableLabels } from "./tableLabels";
import { VIEW_CONTROL_LABELS } from "./viewControlLabels";

const GROUPS = {
  ACTION_LABELS,
  ASSISTANT_LABELS,
  BASE_LABELS,
  COLUMN_MENU_LABELS,
  EDITING_LABELS,
  EXPORT_LABELS,
  FILTER_LABELS,
  FIND_LABELS,
  GRID_LABELS,
  GROUPING_LABELS,
  PIVOT_LABELS,
  ROW_LABELS,
  SAVED_VIEW_LABELS,
  VIEW_CONTROL_LABELS,
};

type GroupKeys = {
  [K in keyof typeof GROUPS]: keyof (typeof GROUPS)[K];
}[keyof typeof GROUPS];

describe("label groups", () => {
  it("name every string in exactly one group", () => {
    expectTypeOf<
      Exclude<keyof TableLabels, GroupKeys>
    >().toEqualTypeOf<never>();
    const owners = new Map<string, string[]>();
    for (const [group, labels] of Object.entries(GROUPS))
      for (const key of Object.keys(labels))
        owners.set(key, [...(owners.get(key) ?? []), group]);
    const shared = [...owners].filter(([, groups]) => groups.length > 1);
    expect(shared).toEqual([]);
    const byName = (a: string, b: string) => a.localeCompare(b);
    expect([...owners.keys()].sort(byName)).toEqual(
      Object.keys(defaultLabels).sort(byName)
    );
  });

  it("resolve a table's strings: base, then each feature's, then the host's", () => {
    const labels = resolveTableLabels({ search: "Find" }, [FILTER_LABELS]);
    expect(labels.search).toBe("Find");
    expect(labels.opEqual).toBe(FILTER_LABELS.opEqual);
    expect(labels.noData).toBe(BASE_LABELS.noData);
    expect("opEqual" in resolveTableLabels(undefined)).toBe(false);
  });

  it("share one object per feature list when the host sets no strings", () => {
    expect(resolveTableLabels(undefined)).toBe(resolveTableLabels(undefined));
    const features = [GROUPING_LABELS];
    expect(resolveTableLabels(undefined, features)).toBe(
      resolveTableLabels(undefined, features)
    );
    expect(resolveTableLabels({ search: "Find" })).not.toBe(
      resolveTableLabels({ search: "Find" })
    );
  });

  it("give a feature's chrome the base strings and its own groups alone", () => {
    const groups = [FIND_LABELS] as const;
    const strings = resolveFeatureLabels(undefined, groups);
    expectTypeOf(strings).toHaveProperty("findInTable");
    expectTypeOf(strings).toHaveProperty("noData");
    expectTypeOf(strings).not.toHaveProperty("opEqual");
    expect(strings.findInTable).toBe(FIND_LABELS.findInTable);
    expect("opEqual" in strings).toBe(false);
    expect(resolveFeatureLabels(undefined, groups)).toBe(strings);
    expect(
      resolveFeatureLabels({ findInTable: "Search rows" }, groups).findInTable
    ).toBe("Search rows");
  });
});
