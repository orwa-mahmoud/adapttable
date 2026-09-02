/**
 * `@adapttable/ai` — provider-neutral capability discovery for a live table.
 *
 * The root entry imports no React and no model SDK. Compose
 * `tableAgent` from `@adapttable/ai/react` when a table should publish
 * a manifest. `@adapttable/core`, every adapter root, and
 * `@adapttable/server` stay out of this graph.
 *
 * @packageDocumentation
 */
export { guideOf, summaryOf } from "./guides";
export {
  AGENT_SCHEMA_VERSION,
  CAPABILITY_KEYS,
  type CapabilityKey,
  type RowAddressScope,
  type WritePolicy,
} from "./keys";
export { buildManifest, enabledKeys } from "./manifest";
export { createAgentSession, type CreateAgentSessionOptions } from "./session";
export type {
  AgentApply,
  AgentColumn,
  AgentManifest,
  AgentObservation,
  AgentSession,
  CapabilityGuide,
  CatalogEntry,
  ExecuteResult,
  JsonSchema,
  TableAgentBridge,
} from "./types";
export { validateSchema } from "./validate";
