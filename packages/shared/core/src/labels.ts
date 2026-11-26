import { ACTION_LABELS } from "./labelGroups/actionLabels";
import { ASSISTANT_LABELS } from "./labelGroups/assistantLabels";
import { BASE_LABELS } from "./labelGroups/baseLabels";
import { COLUMN_MENU_LABELS } from "./labelGroups/columnMenuLabels";
import { EDITING_LABELS } from "./labelGroups/editingLabels";
import { EXPORT_LABELS } from "./labelGroups/exportLabels";
import { FILTER_LABELS } from "./labelGroups/filterLabels";
import { FIND_LABELS } from "./labelGroups/findLabels";
import { GRID_LABELS } from "./labelGroups/gridLabels";
import { GROUPING_LABELS } from "./labelGroups/groupingLabels";
import { PIVOT_LABELS } from "./labelGroups/pivotLabels";
import { ROW_LABELS } from "./labelGroups/rowLabels";
import { SAVED_VIEW_LABELS } from "./labelGroups/savedViewLabels";
import { VIEW_CONTROL_LABELS } from "./labelGroups/viewControlLabels";
import { VIRTUALIZE_LABELS } from "./labelGroups/virtualizeLabels";
import type { TableLabels } from "./types";

/**
 * English default strings. Consumers override any subset via the
 * `labels` option; `resolveLabels` merges their overrides on top.
 *
 * @public
 */
export const defaultLabels: Required<TableLabels> = /* @__PURE__ */ allLabels(
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
  VIRTUALIZE_LABELS
);

/**
 * Merge caller overrides over `defaultLabels`. Undefined entries in
 * the override are ignored, so partial `labels` objects are safe.
 *
 * @param overrides - A partial set of label overrides.
 * @returns A fully-populated, immutable label set.
 *
 * @public
 */
export function resolveLabels(
  overrides: TableLabels | undefined
): Required<TableLabels> {
  if (!overrides) return defaultLabels;
  const merged = { ...defaultLabels };
  for (const key of Object.keys(overrides) as (keyof TableLabels)[]) {
    const value = overrides[key];
    if (value !== undefined) {
      // Each key's value type matches the same key in the target.
      (merged[key] as unknown) = value;
    }
  }
  return merged;
}

/**
 * Every string, from the base strings and each feature's. A call rather than
 * an object spread, so a graph that never reads every string drops it.
 */
/* @__NO_SIDE_EFFECTS__ */
function allLabels(
  base: typeof BASE_LABELS,
  ...groups: readonly Partial<TableLabels>[]
): Required<TableLabels> {
  // The base and the thirteen feature groups name every key exactly once.
  return Object.assign({}, base, ...groups) as Required<TableLabels>;
}
