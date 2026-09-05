import { CAPABILITY_KEYS, type CapabilityKey } from "../keys";
import type { AgentObservation } from "../types";

const FEATURE_FOR: Partial<Record<CapabilityKey, string>> = {
  "view.setFilters": "filters",
  "view.setGroupBy": "grouping",
  "export.run": "export-csv",
  "edit.cells": "editing",
  "rows.reorder": "row-reorder",
};

/** Whether a built-in capability is wired for this observation. */
export function isBuiltInEnabled(
  key: CapabilityKey,
  observation: AgentObservation
): boolean {
  const features = new Set(observation.featureIds);
  const needed = FEATURE_FOR[key];
  if (needed && !features.has(needed)) return false;
  switch (key) {
    case "columns.describe":
    case "view.describe":
      return true;
    case "view.setPage":
      return observation.hasPagination;
    case "view.setSort":
      return observation.hasSort;
    case "view.setSearch":
      return observation.hasSearch;
    case "view.setFilters":
      return observation.hasFilters;
    case "view.setGroupBy":
      return observation.source.grouping !== false;
    case "view.setSelection":
      return observation.hasSelection === true;
    case "views.apply":
      return features.has("saved-views") && observation.hasSavedViews === true;
    case "rows.read":
      return observation.columns.length > 0;
    case "rows.resolve":
      return observation.columns.length > 0;
    case "export.run":
      return observation.hasExport;
    case "edit.cells":
      return observation.hasEdit && observation.writePolicy === "allow";
    case "rows.add":
      return observation.hasAdd === true && observation.writePolicy === "allow";
    case "rows.delete":
      return (
        observation.hasDelete === true && observation.writePolicy === "allow"
      );
    case "rows.reorder":
      return observation.hasReorder && observation.writePolicy === "allow";
  }
}

/** Enabled built-in keys in catalog order. */
export function enabledBuiltInKeys(
  observation: AgentObservation
): CapabilityKey[] {
  const keys: CapabilityKey[] = [];
  for (const key of CAPABILITY_KEYS) {
    if (isBuiltInEnabled(key, observation)) keys.push(key);
  }
  return keys;
}
