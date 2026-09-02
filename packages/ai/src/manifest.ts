import {
  AGENT_SCHEMA_VERSION,
  CAPABILITY_KEYS,
  type CapabilityKey,
} from "./keys";
import type { AgentManifest, AgentObservation } from "./types";

const FEATURE_FOR: Partial<Record<CapabilityKey, string>> = {
  "view.setFilters": "filters",
  "view.setGroupBy": "grouping",
  "export.run": "export-csv",
  "edit.cells": "editing",
  "rows.reorder": "row-reorder",
};

/**
 * Which capabilities this observation actually wires.
 *
 * Package presence never participates. A grouping key stays off when the
 * source says grouping is false, even if the feature id is listed.
 */
export function enabledKeys(observation: AgentObservation): CapabilityKey[] {
  const features = new Set(observation.featureIds);
  const keys: CapabilityKey[] = [];
  for (const key of CAPABILITY_KEYS) {
    if (!isEnabled(key, observation, features)) continue;
    keys.push(key);
  }
  return keys;
}

function isEnabled(
  key: CapabilityKey,
  observation: AgentObservation,
  features: ReadonlySet<string>
): boolean {
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
    case "export.run":
      return observation.hasExport;
    case "edit.cells":
      return observation.hasEdit && observation.writePolicy === "allow";
    case "rows.reorder":
      return observation.hasReorder && observation.writePolicy === "allow";
  }
}

/** Deterministic manifest for one observation. */
export function buildManifest(observation: AgentObservation): AgentManifest {
  return {
    schemaVersion: AGENT_SCHEMA_VERSION,
    tableId: observation.tableId,
    viewRevision: observation.viewRevision,
    capabilities: enabledKeys(observation),
    columns: observation.columns,
    rowAddressing: {
      scope: observation.rowAddressScope,
      key: "rowKey",
    },
    limits: { pageMax: observation.pageMax },
    policy: { write: observation.writePolicy },
    source: observation.source,
  };
}
