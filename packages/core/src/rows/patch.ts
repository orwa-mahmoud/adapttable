/**
 * Row patches — changing the data you already have, without refetching it.
 *
 * A save returns the updated record, a socket pushes a new one, a delete
 * succeeds. Refetching the page to reflect that costs a round trip and, worse,
 * throws away everything the user had going: the scroll position, which rows
 * were open, sometimes the selection.
 *
 * ```ts
 * const [rows, setRows] = useState(initial);
 * const onSaved = (row: Person) =>
 *   setRows((current) => applyRowPatches(current, [updateRow(row.id, row)], byId));
 * ```
 *
 * Two properties make that safe, and both are tested:
 *
 * - **Untouched rows keep their object identity.** React reconciles them as
 *   unchanged, and anything memoized per row — a `computed` column's cache,
 *   a `memo`'d cell — stays valid instead of recomputing for the whole page.
 * - **A patch that changes nothing returns the very same array.** Applying an
 *   update whose values already match, or removing an id that is not there,
 *   hands back the original reference, so a `setState` with it does not
 *   re-render.
 *
 * Selection and expansion survive because both are keyed by row id, and a
 * patch never changes the id of a row it did not touch.
 *
 * This is a pure function over an array. The table never owns your data and
 * this does not make it start: you hold the rows, you apply the patch.
 */

/**
 * Insert a row. Without `at`, it goes on the end.
 *
 * @public
 */
export interface InsertPatch<TRow> {
  /** Discriminant for the patch union. */
  type: "insert";
  /** The row to write. */
  row: TRow;
  /** Zero-based position. Clamped into range; negative counts from the end. */
  at?: number;
}

/**
 * Merge changes into the row with this id. Absent id: nothing happens.
 *
 * @public
 */
export interface UpdatePatch<TRow> {
  /** Discriminant for the patch union. */
  type: "update";
  /** Identity of the row to change. */
  id: string;
  /** Fields to merge into that row. */
  changes: Partial<TRow>;
}

/**
 * Replace the row with this id, or append it when it is not there yet.
 *
 * @public
 */
export interface UpsertPatch<TRow> {
  /** Discriminant for the patch union. */
  type: "upsert";
  /** The row to write. */
  row: TRow;
}

/**
 * Drop the row with this id. Absent id: nothing happens.
 *
 * @public
 */
export interface RemovePatch {
  /** Discriminant for the patch union. */
  type: "remove";
  /** Identity of the row to change. */
  id: string;
}

/**
 * One change to a row set.
 *
 * @public
 */
export type RowPatch<TRow> =
  InsertPatch<TRow> | UpdatePatch<TRow> | UpsertPatch<TRow> | RemovePatch;

/**
 * Insert a row, optionally at a position.
 *
 * @public
 */
export function insertRow<TRow>(row: TRow, at?: number): InsertPatch<TRow> {
  return { type: "insert", row, at };
}

/**
 * Merge changes into one row.
 *
 * @public
 */
export function updateRow<TRow>(
  id: string,
  changes: Partial<TRow>
): UpdatePatch<TRow> {
  return { type: "update", id, changes };
}

/**
 * Replace a row, or add it if it is new.
 *
 * @public
 */
export function upsertRow<TRow>(row: TRow): UpsertPatch<TRow> {
  return { type: "upsert", row };
}

/**
 * Remove a row by id.
 *
 * @public
 */
export function removeRow(id: string): RemovePatch {
  return { type: "remove", id };
}

/** Is every own key of `changes` already equal on `row`? */
function alreadyApplied<TRow>(row: TRow, changes: Partial<TRow>): boolean {
  return (Object.keys(changes) as (keyof TRow)[]).every((key) =>
    Object.is(row[key], changes[key])
  );
}

/** Clamp an insert position, letting a negative index count from the end. */
function insertIndex(at: number | undefined, length: number): number {
  if (at === undefined) return length;
  const resolved = at < 0 ? length + at : at;
  return Math.min(Math.max(resolved, 0), length);
}

/** Where a row with this id sits, or -1. */
function indexOfId<TRow>(
  list: readonly TRow[],
  id: string,
  getRowId: (row: TRow) => string
): number {
  return list.findIndex((row) => getRowId(row) === id);
}

/**
 * One mutation {@link applyRowPatchesWithLog} actually performed.
 *
 * Incremental re-evaluation walks this list instead of scanning the row set
 * to find what changed. Indices are taken at the moment the event ran, so a
 * later event sees the array the earlier one left behind.
 *
 * @public
 */
export type RowPatchEvent<TRow> =
  | { type: "insert"; id: string; row: TRow; index: number }
  | { type: "remove"; id: string; row: TRow; index: number }
  | { type: "update"; id: string; prev: TRow; next: TRow; index: number };

/**
 * The result of applying patches, plus the events an incremental view needs
 * so it does not have to diff two 20k-row arrays to find one update.
 *
 * @public
 */
export interface RowPatchLog<TRow> {
  /** The row set after the patches — same contract as {@link applyRowPatches}. */
  rows: readonly TRow[];
  /** Empty when nothing changed; the original array is then on `rows`. */
  events: readonly RowPatchEvent<TRow>[];
}

const PATCH_LOGS = new WeakMap<WeakKey, RowPatchLog<unknown>>();

/**
 * The log {@link applyRowPatches} attached to a result array, when the
 * patches actually changed something. A host that already called
 * `applyRowPatches` (the Scale demo, a socket handler) can hand this to
 * the incremental view instead of applying the same patches twice.
 *
 * Spreading the result (`[...applyRowPatches(...)]`) drops the log — the
 * copy is a different array.
 *
 * @typeParam TRow - The row type.
 * @param rows - An array returned by {@link applyRowPatches}.
 * @returns The log, or `undefined` when this array was not produced by a
 *   changing patch (or was copied).
 *
 * @public
 */
export function rowPatchLog<TRow>(
  rows: readonly TRow[]
): RowPatchLog<TRow> | undefined {
  return PATCH_LOGS.get(rows) as RowPatchLog<TRow> | undefined;
}

function rememberLog<TRow>(log: RowPatchLog<TRow>): void {
  if (log.events.length === 0) return;
  PATCH_LOGS.set(log.rows, log);
}

/** Apply one patch to a working copy. Returns the event when something changed. */
function applyOne<TRow>(
  list: TRow[],
  patch: RowPatch<TRow>,
  getRowId: (row: TRow) => string
): RowPatchEvent<TRow> | undefined {
  if (patch.type === "insert") {
    const index = insertIndex(patch.at, list.length);
    list.splice(index, 0, patch.row);
    return { type: "insert", id: getRowId(patch.row), row: patch.row, index };
  }

  if (patch.type === "remove") {
    const index = indexOfId(list, patch.id, getRowId);
    if (index === -1) return undefined;
    const row = list[index]!;
    list.splice(index, 1);
    return { type: "remove", id: patch.id, row, index };
  }

  if (patch.type === "upsert") {
    const id = getRowId(patch.row);
    const index = indexOfId(list, id, getRowId);
    if (index === -1) {
      list.push(patch.row);
      return { type: "insert", id, row: patch.row, index: list.length - 1 };
    }
    // Re-upserting the row already in place is not a change, and replacing it
    // with itself would invalidate every per-row memo for nothing.
    const prev = list[index]!;
    if (prev === patch.row) return undefined;
    list[index] = patch.row;
    return { type: "update", id, prev, next: patch.row, index };
  }

  const index = indexOfId(list, patch.id, getRowId);
  const existing = list[index];
  if (!existing) return undefined;
  // An update that changes nothing must not replace the row object, or every
  // per-row memo downstream would be invalidated for no reason.
  if (alreadyApplied(existing, patch.changes)) return undefined;
  const next = { ...existing, ...patch.changes };
  list[index] = next;
  return { type: "update", id: patch.id, prev: existing, next, index };
}

/**
 * Apply patches to a row set, in order, and return the result.
 *
 * Returns the original array — the same reference — when no patch changed
 * anything. Rows that no patch touched keep their object identity.
 *
 * @typeParam TRow - The row type.
 * @param rows - The current rows.
 * @param patches - The changes to apply, in order.
 * @param getRowId - How a row's id is derived; the table's own `rowKey`.
 *
 * @public
 */
export function applyRowPatches<TRow>(
  rows: readonly TRow[],
  patches: readonly RowPatch<TRow>[],
  getRowId: (row: TRow) => string
): readonly TRow[] {
  return applyRowPatchesWithLog(rows, patches, getRowId).rows;
}

/**
 * Apply patches and return the events each real mutation produced.
 *
 * {@link applyRowPatches} is this without the log. Incremental re-evaluation
 * sits on the log so a 200-update burst does not walk 20k rows looking for
 * what changed.
 *
 * @typeParam TRow - The row type.
 * @param rows - The current rows.
 * @param patches - The changes to apply, in order.
 * @param getRowId - How a row's id is derived; the table's own `rowKey`.
 *
 * @public
 */
export function applyRowPatchesWithLog<TRow>(
  rows: readonly TRow[],
  patches: readonly RowPatch<TRow>[],
  getRowId: (row: TRow) => string
): RowPatchLog<TRow> {
  const working = [...rows];
  const events: RowPatchEvent<TRow>[] = [];
  for (const patch of patches) {
    // Every patch runs, so a later one acts on what an earlier one did.
    const event = applyOne(working, patch, getRowId);
    if (event) events.push(event);
  }
  const log: RowPatchLog<TRow> = {
    rows: events.length > 0 ? working : rows,
    events,
  };
  rememberLog(log);
  return log;
}
