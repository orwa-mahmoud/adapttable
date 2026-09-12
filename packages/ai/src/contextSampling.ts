/**
 * Bounded live sampling — its own route, never a read inside the export.
 *
 * `ColumnAiOptions.sample` is an author saying "a model will understand this
 * column better with a few real values in front of it". Honouring that has to
 * be a deliberate call rather than something the context builder does on its
 * own, for two reasons:
 *
 * - **The exporter performs no I/O.** `buildAgentContext` is synchronous and
 *   reads no cell values; a sample is a read, and a read inside the export
 *   would make building a contract a data access with a latency and a failure
 *   mode nobody asked for.
 * - **A sample is disclosure.** It goes out through `rows.read`, under the
 *   session's own permission predicate, so a column the agent may not read is
 *   never sampled and an excluded `rows.read` means no samples at all.
 *
 * The host binding runs this at contract build time and hands the values to
 * `buildAgentContext`, which marks them `sampled` so a reader of the contract
 * can tell an author's example from a value out of somebody's table. Re-run it
 * with the contract, never on a data tick: a contract that changes every time
 * a row does is a cache nothing can hold.
 *
 * @packageDocumentation
 */
import { SAMPLE_CAP, matchesType } from "./contextSnapshot";
import type { AgentSession, RowProvenanceEnvelope } from "./types";

/** How many rows are read to find {@link SAMPLE_CAP} distinct values. */
const READ_WINDOW = 25;

/** Whether a result is the row envelope the session labels reads with. */
function isRowEnvelope(value: unknown): value is RowProvenanceEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { source?: unknown }).source === "table-rows"
  );
}

/**
 * A few real values from one column, or nothing.
 *
 * @param session - The live session. The read goes through its executor, so
 *   exclusion, the revision check and redaction all apply.
 * @param key - The column to sample.
 * @param signal - Cancellation.
 * @returns Up to {@link SAMPLE_CAP} distinct values that match the column's
 *   declared type, or an empty list when the column may not be read, the
 *   table offers no `rows.read`, or the read returned nothing usable.
 *
 * @public
 */
export async function sampleColumnValues(
  session: AgentSession,
  key: string,
  signal?: AbortSignal
): Promise<readonly unknown[]> {
  const manifest = session.manifest();
  const column = manifest.columns.find((entry) => entry.id === key);
  // Unreadable is not a permission to work around. Neither is a table that
  // does not offer reads at all.
  if (!column?.readable) return [];
  if (!session.catalog().some((entry) => entry.key === "rows.read")) return [];

  const limit = Math.min(READ_WINDOW, manifest.limits.readMax);
  const result = await session.execute(
    "rows.read",
    { offset: 0, limit, columns: [key] },
    manifest.viewRevision,
    `sample:${JSON.stringify({ tableId: manifest.tableId, key, revision: manifest.viewRevision })}`,
    signal
  );
  if (!result.ok || !isRowEnvelope(result.result)) return [];
  // The session redacts by column; a column it refused simply is not here.
  if (result.result.rows.redacted.includes(key)) return [];

  const seen = new Set<string>();
  const values: unknown[] = [];
  for (const row of result.result.rows.rows) {
    if (values.length >= SAMPLE_CAP) break;
    const value = row.cells[key];
    if (value === null || value === undefined || value === "") continue;
    // Revalidated rather than trusted: a column declared numeric whose cells
    // hold strings would otherwise teach a model to send the wrong type.
    if (!matchesType(value, column.type)) continue;
    const identity = JSON.stringify(value);
    if (seen.has(identity)) continue;
    seen.add(identity);
    values.push(value);
  }
  return values;
}

/**
 * Sample every column whose author asked for it.
 *
 * @param session - The live session.
 * @param wanted - Column ids the author opted in, from `ColumnAiOptions.sample`.
 * @param signal - Cancellation.
 * @returns Column id to values, with empty results left out entirely.
 *
 * @public
 */
export async function sampleColumns(
  session: AgentSession,
  wanted: readonly string[],
  signal?: AbortSignal
): Promise<Readonly<Record<string, readonly unknown[]>>> {
  const samples: Record<string, readonly unknown[]> = {};
  for (const key of wanted) {
    // One at a time: each is a read against the live table, and a table that
    // publishes fifty sampled columns should not open fifty reads at once.
    const values = await sampleColumnValues(session, key, signal);
    if (values.length > 0) samples[key] = values;
  }
  return samples;
}
