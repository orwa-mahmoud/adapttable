/**
 * How commands address rows and what a row read may disclose.
 *
 * Every row-targeting command resolves its rows here, and every path that
 * puts rows in front of a model projects them here, so a scope, a column
 * allowlist or a read ceiling is enforced once.
 */
import type { RowAddressScope } from "../keys";
import type {
  AgentApply,
  AgentColumn,
  AgentObservation,
  ResolvedRow,
  RowProvenanceEnvelope,
  RowRef,
  RowWindow,
} from "../types";
import { ApplyError } from "./command";

/** The most rows one read may return on this table. */
export function readMaxOf(observation: AgentObservation): number {
  return observation.readMax ?? 50;
}

/** A non-negative integer bound, ignoring a missing or unusable value. */
export function boundedInt(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? Math.floor(value) : Number.NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, parsed);
}

/** Columns a read may return: readable ones, narrowed to those asked for. */
export function readableAllowlist(
  columns: readonly AgentColumn[],
  wanted: readonly string[] | undefined
): Set<string> {
  const readable = columns
    .filter((column) => column.readable)
    .map((column) => column.id);
  if (!wanted) return new Set(readable);
  const declared = new Set(readable);
  return new Set(wanted.filter((id) => declared.has(id)));
}

export function redactedIds(columns: readonly AgentColumn[]): string[] {
  return columns
    .filter((column) => !column.readable)
    .map((column) => column.id);
}

/**
 * Project a host window onto what the CURRENT declaration permits: allowed
 * columns only, no more rows than the permitted limit, and window metadata
 * that describes the window actually returned.
 */
export function projectWindow(
  window: RowWindow,
  allow: ReadonlySet<string>,
  columns: readonly AgentColumn[],
  offset: number,
  limit: number
): RowWindow {
  const rows = window.rows.slice(0, limit).map((row) => {
    const cells: Record<string, unknown> = {};
    for (const [id, value] of Object.entries(row.cells)) {
      if (!allow.has(id)) continue;
      cells[id] = value;
    }
    return { rowKey: row.rowKey, cells };
  });
  return { rows, offset, limit, redacted: redactedIds(columns) };
}

/** Rows as what they are: somebody's data, read at one revision. */
export function rowProvenance(
  rows: RowWindow,
  revision: number
): RowProvenanceEnvelope {
  return { source: "table-rows", untrusted: true, revision, rows };
}

/** The scope a call reads in, refused when the source cannot serve it. */
export function assertScope(
  scope: RowAddressScope | undefined,
  observation: AgentObservation
): RowAddressScope {
  const resolved = scope ?? observation.rowAddressScope;
  if (resolved === "full" && observation.source.fullDataset !== true) {
    throw new ApplyError(
      "scope-denied",
      "scope full requires source.fullDataset"
    );
  }
  return resolved;
}

function isRowKeyRef(
  value: Record<string, unknown>
): value is { rowKey: string } {
  return typeof value.rowKey === "string" && value.rowKey.length > 0;
}

/** A row reference from a request body, by key or by 1-based position. */
export function asRowRef(
  value: Record<string, unknown>,
  fallbackRevision?: number
): RowRef {
  if (isRowKeyRef(value)) return { rowKey: value.rowKey };
  if (typeof value.position === "number") {
    const scope = (value.scope as RowAddressScope | undefined) ?? "visible";
    const expectedRevision =
      typeof value.expectedRevision === "number"
        ? value.expectedRevision
        : fallbackRevision;
    if (typeof expectedRevision !== "number") {
      throw new ApplyError(
        "invalid-arguments",
        "position refs require expectedRevision"
      );
    }
    return {
      position: value.position,
      scope,
      expectedRevision,
    };
  }
  throw new ApplyError(
    "invalid-arguments",
    "a rowKey or 1-based position is required"
  );
}

/** Resolve a row reference through the host, at the admitted revision. */
export async function resolveRowArg(
  body: Record<string, unknown>,
  observation: AgentObservation,
  apply: AgentApply
): Promise<ResolvedRow> {
  // An omitted revision binds to the observation this call was admitted
  // against — the same one `edit.cells` binds to, and one the session has
  // already refused the call over if the table had moved. The schema publishes
  // `expectedRevision` as optional, so a caller that leaves it out is following
  // the contract; a caller that states one is still held to it below.
  const ref = asRowRef(body, observation.viewRevision);
  if ("position" in ref) {
    assertScope(ref.scope, observation);
    if (ref.expectedRevision !== observation.viewRevision) {
      throw new ApplyError(
        "revision-mismatch",
        `expected revision ${ref.expectedRevision}, table is at ${observation.viewRevision}`
      );
    }
  }
  if (!apply.resolveRow) {
    throw new ApplyError("apply-failed", "resolveRow is not wired");
  }
  return apply.resolveRow(ref);
}
