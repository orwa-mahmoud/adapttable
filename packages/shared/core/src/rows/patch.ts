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
import type {
  InsertPatch,
  RemovePatch,
  RowPatch,
  RowPatchEvent,
  RowPatchLog,
  UpdatePatch,
  UpsertPatch,
} from "../contracts/rows";
export type {
  InsertPatch,
  RemovePatch,
  RowPatch,
  RowPatchEvent,
  RowPatchLog,
  UpdatePatch,
  UpsertPatch,
} from "../contracts/rows";

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

/**
 * The whole-number slot an insert lands in, read the way `Array#splice`
 * reads a start: `NaN` is 0, a fraction drops toward zero, a negative index
 * counts from the end, and the result is clamped to the list. The list, the
 * id lookup and the event all use this one value.
 */
function insertIndex(at: number | undefined, length: number): number {
  if (at === undefined) return length;
  const whole = Number.isNaN(at) ? 0 : Math.trunc(at);
  const resolved = whole < 0 ? length + whole : whole;
  return Math.min(Math.max(resolved, 0), length);
}

/**
 * Row lookup by id for one batch. The first lookup walks the list as a
 * single patch always has. Later ones read each row's id at most once: the
 * ids read so far are kept in list order, following every splice the batch
 * makes, and a map of first positions answers in constant time until a
 * splice inside the read prefix moves them.
 */
interface RowIds<TRow> {
  /** Where the first row with this id sits, or -1. */
  find(id: string): number;
  /** A row with this id now sits at `index`. */
  inserted(index: number, id: string): void;
  /** The row at `index` left the list. */
  removed(index: number): void;
  /** The row at `index` was replaced by `row`. */
  replaced(index: number, row: TRow): void;
}

function rowIds<TRow>(
  list: readonly TRow[],
  getRowId: (row: TRow) => string
): RowIds<TRow> {
  const ids: string[] = [];
  let firstAt: Map<string, number> | undefined = new Map();
  let lookups = 0;
  const record = (id: string): void => {
    if (firstAt && !firstAt.has(id)) firstAt.set(id, ids.length);
    ids.push(id);
  };
  const cached = (id: string): number =>
    firstAt ? (firstAt.get(id) ?? -1) : ids.indexOf(id);
  return {
    find(id) {
      lookups += 1;
      if (lookups === 1) return list.findIndex((row) => getRowId(row) === id);
      const known = cached(id);
      if (known !== -1) return known;
      while (ids.length < list.length) {
        const next = getRowId(list[ids.length]!);
        record(next);
        if (next === id) return ids.length - 1;
      }
      return -1;
    },
    inserted(index, id) {
      if (index === ids.length) record(id);
      else if (index < ids.length) {
        ids.splice(index, 0, id);
        firstAt = undefined;
      }
    },
    removed(index) {
      if (index === ids.length - 1) {
        const id = ids.pop()!;
        if (firstAt?.get(id) === index) firstAt.delete(id);
      } else if (index < ids.length) {
        ids.splice(index, 1);
        firstAt = undefined;
      }
    },
    replaced(index, row) {
      if (index >= ids.length) return;
      const id = getRowId(row);
      if (ids[index] === id) return;
      ids[index] = id;
      firstAt = undefined;
    },
  };
}

const PATCH_LOGS = /* @__PURE__ */ new WeakMap<WeakKey, RowPatchLog<unknown>>();
const ROW_IDENTITIES = /* @__PURE__ */ new WeakMap<WeakKey, object>();
const PATCH_BASES = /* @__PURE__ */ new WeakMap<WeakKey, object>();

/** Check the exact pre-patch identity without retaining older row arrays. */
export function rowPatchLogStartsAt<TRow>(
  log: RowPatchLog<TRow>,
  rows: readonly TRow[]
): boolean {
  const base = PATCH_BASES.get(log);
  return base !== undefined && ROW_IDENTITIES.get(rows) === base;
}

/**
 * The log `applyRowPatches` attached to a result array, when the
 * patches actually changed something. A host that already called
 * `applyRowPatches` (the Scale demo, a socket handler) can hand this to
 * the incremental view instead of applying the same patches twice.
 *
 * Spreading the result (`[...applyRowPatches(...)]`) drops the log — the
 * copy is a different array.
 *
 * @typeParam TRow - The row type.
 * @param rows - An array returned by `applyRowPatches`.
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

function rememberLog<TRow>(
  log: RowPatchLog<TRow>,
  base: readonly TRow[]
): void {
  if (log.events.length === 0) return;
  PATCH_LOGS.set(log.rows, log);
  const identity = ROW_IDENTITIES.get(base) ?? {};
  ROW_IDENTITIES.set(base, identity);
  PATCH_BASES.set(log, identity);
}

/** Apply one patch to a working copy. Returns the event when something changed. */
function applyOne<TRow>(
  list: TRow[],
  patch: RowPatch<TRow>,
  getRowId: (row: TRow) => string,
  ids: RowIds<TRow>
): RowPatchEvent<TRow> | undefined {
  if (patch.type === "insert") {
    const index = insertIndex(patch.at, list.length);
    const id = getRowId(patch.row);
    list.splice(index, 0, patch.row);
    ids.inserted(index, id);
    return { type: "insert", id, row: patch.row, index };
  }

  if (patch.type === "remove") {
    const index = ids.find(patch.id);
    if (index === -1) return undefined;
    const row = list[index]!;
    list.splice(index, 1);
    ids.removed(index);
    return { type: "remove", id: patch.id, row, index };
  }

  if (patch.type === "upsert") {
    const id = getRowId(patch.row);
    const index = ids.find(id);
    if (index === -1) {
      list.push(patch.row);
      ids.inserted(list.length - 1, id);
      return { type: "insert", id, row: patch.row, index: list.length - 1 };
    }
    // Re-upserting the row already in place is not a change, and replacing it
    // with itself would invalidate every per-row memo for nothing.
    const prev = list[index]!;
    if (prev === patch.row) return undefined;
    list[index] = patch.row;
    return { type: "update", id, prev, next: patch.row, index };
  }

  const index = ids.find(patch.id);
  const existing = list[index];
  if (!existing) return undefined;
  // An update that changes nothing must not replace the row object, or every
  // per-row memo downstream would be invalidated for no reason.
  if (alreadyApplied(existing, patch.changes)) return undefined;
  const next = { ...existing, ...patch.changes };
  list[index] = next;
  // The changes may hold a new id; a later patch looks the row up by it.
  ids.replaced(index, next);
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
 * `applyRowPatches` is this without the log. Incremental re-evaluation
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
  const ids = rowIds(working, getRowId);
  const events: RowPatchEvent<TRow>[] = [];
  for (const patch of patches) {
    // Every patch runs, so a later one acts on what an earlier one did.
    const event = applyOne(working, patch, getRowId, ids);
    if (event) events.push(event);
  }
  const log: RowPatchLog<TRow> = {
    rows: events.length > 0 ? working : rows,
    events,
  };
  rememberLog(log, rows);
  return log;
}
