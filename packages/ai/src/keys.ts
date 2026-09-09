/**
 * Protocol identity for the adaptive table agent.
 *
 * Keys and the schema version never change for caching. Translated labels
 * are for people; execution is locale-independent.
 */

/** Manifest and describe/execute schema family. Custom capabilities are additive
 * within this version; hosts reject unknown `schemaVersion` values at the
 * transport boundary rather than coercing them. @public */
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
  "view.setAggregations",
  "view.pinColumn",
  "view.pinRow",
  "view.setSelection",
  "views.apply",
  "rows.read",
  "rows.resolve",
  "export.run",
  "edit.cells",
  "rows.add",
  "rows.delete",
  "rows.reorder",
] as const;

/**
 * One advertised operation.
 *
 * @public
 */
export type CapabilityKey = (typeof CAPABILITY_KEYS)[number];

/**
 * Whether the host already authorized data writes through its callbacks.
 *
 * @public
 */
export type WritePolicy = "deny" | "allow";

/**
 * When a write must be confirmed before it is staged or applied.
 *
 * - `writes` — every data-write capability (`edit.cells`, `rows.add`, `rows.delete`,
 *   `rows.reorder`, and custom capabilities with `kind: "write"` or `"destructive"`)
 * - `destructive` — only `rows.delete` (and custom `kind: "destructive"`)
 * - `never` — skip chrome and `onApprove`; still validate and honour commit
 *
 * @public
 */
export type ApprovalPolicy = "writes" | "destructive" | "never";

/**
 * When an approved write reaches the host.
 *
 * - `stage` — dirty/batch path; Save still belongs to the reader (default)
 * - `immediate` — invoke the host callback now
 *
 * @public
 */
export type CommitPolicy = "stage" | "immediate";

/**
 * How an agent may address rows without receiving the whole dataset.
 *
 * @public
 */
export type RowAddressScope = "visible" | "page" | "full";

/** Keys that mutate table data (not ordinary view state). @public */
export const WRITE_KEYS = [
  "edit.cells",
  "rows.add",
  "rows.delete",
  "rows.reorder",
] as const;

/** One mutating capability key. @public */
export type WriteKey = (typeof WRITE_KEYS)[number];

/** Keys that remove records. @public */
export const DESTRUCTIVE_KEYS = ["rows.delete"] as const;

/** One destructive capability key. @public */
export type DestructiveKey = (typeof DESTRUCTIVE_KEYS)[number];
