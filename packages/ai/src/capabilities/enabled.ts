import { CAPABILITY_KEYS, type CapabilityKey } from "../keys";
import type { AgentObservation } from "../types";

const FEATURE_FOR: Partial<Record<CapabilityKey, string>> = {
  "view.setFilters": "filters",
  "view.setGroupBy": "grouping",
  "export.run": "export-csv",
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
    case "view.setAggregations": {
      if (!features.has("grouping") && !features.has("grouping-panel")) {
        return false;
      }
      if (observation.source.grouping === false) return false;
      return (observation.aggregations?.columns.length ?? 0) > 0;
    }
    // Pinning is advertised from the wired operation, never from a feature
    // name: a table can compose the column menu and still hand the agent no
    // way to change the layout.
    case "view.pinColumn":
      return (
        observation.hasColumnPinning === true &&
        observation.columns.some((column) => column.pinnable !== false)
      );
    case "view.pinRow":
      return observation.hasRowPinning === true;
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
    // Read from the wired channel, never from a feature name: cell, row and
    // batch editing compose under three different ids, and a table editable
    // through any of them hands the agent a real write path. `hasEdit` is
    // already that answer — it is true only where a host callback or a
    // composed editing channel exists.
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
