import { AGENT_SCHEMA_VERSION, type CapabilityKey } from "./keys";
import type { AgentManifest, AgentObservation } from "./types";
import { enabledBuiltInKeys } from "./capabilities/enabled";

/**
 * Which built-in capabilities this observation actually wires.
 *
 * @public
 */
export function enabledKeys(observation: AgentObservation): CapabilityKey[] {
  return enabledBuiltInKeys(observation);
}

/**
 * Deterministic manifest for one observation.
 *
 * @public
 */
export function buildManifest(
  observation: AgentObservation,
  capabilities: readonly string[] = enabledKeys(observation)
): AgentManifest {
  return {
    schemaVersion: AGENT_SCHEMA_VERSION,
    tableId: observation.tableId,
    viewRevision: observation.viewRevision,
    capabilities,
    columns: observation.columns,
    rowAddressing: {
      scope: observation.rowAddressScope,
      key: "rowKey",
    },
    limits: {
      pageMax: observation.pageMax,
      readMax: observation.readMax ?? 50,
    },
    policy: {
      write: observation.writePolicy,
      approval: observation.approval ?? "writes",
      commit: observation.commit ?? "stage",
    },
    source: observation.source,
  };
}
