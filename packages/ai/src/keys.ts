/**
 * Protocol identity for the adaptive table agent.
 *
 * Keys and the schema version never change for caching. Translated labels
 * are for people; execution is locale-independent.
 */

/** Manifest and describe/execute schema family. */
export const AGENT_SCHEMA_VERSION = "adapttable.agent.v1";

/**
 * Stable capability keys, in catalog order.
 *
 * A table advertises a key only when that operation is actually wired.
 *
 * @public
 */
export const CAPABILITY_KEYS = [
  "columns.describe",
  "view.describe",
  "view.setPage",
  "view.setSort",
  "view.setSearch",
  "view.setFilters",
  "view.setGroupBy",
  "export.run",
  "edit.cells",
  "rows.reorder",
] as const;

/** One advertised operation. */
export type CapabilityKey = (typeof CAPABILITY_KEYS)[number];

/** Whether the host already authorized data writes through its callbacks. */
export type WritePolicy = "deny" | "allow";

/** How an agent may address rows without receiving the whole dataset. */
export type RowAddressScope = "visible" | "page" | "full";
