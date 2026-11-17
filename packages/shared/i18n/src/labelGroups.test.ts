/**
 * Every locale follows core's per-feature label groups.
 *
 * Core keeps a table's strings in one group per feature beside the base
 * strings every table draws, and a table carries the groups of the features
 * it composes. A locale that lacks one of a group's strings leaves that
 * feature speaking English in that language, so each locale is checked group
 * by group against the English strings, and a gap is reported by the feature
 * it belongs to.
 */
import {
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
} from "@adapttable/core/binding";
import { describe, expect, it } from "vitest";

import { locales } from "./getLabels";
import { en } from "./locales/en";

/** Core's label groups, by the name core gives them. */
const GROUPS: Readonly<Record<string, object>> = {
  BASE_LABELS,
  FILTER_LABELS,
  SAVED_VIEW_LABELS,
  EXPORT_LABELS,
  EDITING_LABELS,
  ASSISTANT_LABELS,
  ROW_LABELS,
  GRID_LABELS,
  FIND_LABELS,
  PIVOT_LABELS,
  GROUPING_LABELS,
  COLUMN_MENU_LABELS,
  ACTION_LABELS,
  VIEW_CONTROL_LABELS,
};

/** Whether a locale's string stands in for the English one it translates. */
function carries(preset: object, key: string): boolean {
  const english: unknown = Reflect.get(en, key);
  const value: unknown = Reflect.get(preset, key);
  if (typeof value !== typeof english) return false;
  return typeof value !== "string" || value.trim() !== "";
}

/** Every string a locale lacks, named `GROUP.key`. */
function missingStrings(preset: object): string[] {
  return Object.entries(GROUPS).flatMap(([group, strings]) =>
    Object.keys(strings)
      .filter((key) => !carries(preset, key))
      .map((key) => `${group}.${key}`)
  );
}

describe("locales follow core's label groups", () => {
  it("cover every English string with one of core's groups", () => {
    const grouped = Object.values(GROUPS).flatMap((strings) =>
      Object.keys(strings)
    );
    expect(new Set(grouped)).toEqual(new Set(Object.keys(en)));
    expect(grouped).toHaveLength(Object.keys(en).length);
  });

  it.each(Object.entries(locales))(
    "%s carries every string of every feature's group",
    (_, preset) => {
      expect(missingStrings(preset)).toEqual([]);
    }
  );

  it("names a missing string by its feature group", () => {
    const withoutOne: Partial<typeof locales.de> = { ...locales.de };
    delete withoutOne.filterAddGroup;
    expect(missingStrings(withoutOne)).toEqual([
      "FILTER_LABELS.filterAddGroup",
    ]);
    expect(missingStrings({ ...locales.de, noData: " " })).toEqual([
      "BASE_LABELS.noData",
    ]);
  });
});
