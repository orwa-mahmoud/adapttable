/**
 * One identity for a cell on every edit path: dirty marks, saves,
 * validation and conflicts all key their per-cell state by it.
 *
 * A row id and a column key are host strings and may hold any character, so
 * the two are encoded as a JSON pair rather than joined: no space, colon or
 * control character in either can make two cells share a key, or put one
 * row's cell under another row.
 */

/**
 * The key a cell's editing state is kept under.
 *
 * @param rowId - The cell's row id.
 * @param columnKey - The cell's column key.
 * @returns A key no other cell shares.
 */
export function cellIdentity(rowId: string, columnKey: string): string {
  return JSON.stringify([rowId, columnKey]);
}

/**
 * The row id and column key a {@link cellIdentity} key names.
 *
 * @throws When `key` is not a cell identity — a key built some other way
 *   names no cell, and guessing one would move its state.
 */
export function cellIdentityParts(
  key: string
): readonly [rowId: string, columnKey: string] {
  let parts: unknown;
  try {
    parts = JSON.parse(key);
  } catch (error) {
    throw notCellKey(key, error);
  }
  if (
    Array.isArray(parts) &&
    parts.length === 2 &&
    typeof parts[0] === "string" &&
    typeof parts[1] === "string"
  ) {
    return [parts[0], parts[1]];
  }
  throw notCellKey(key);
}

function notCellKey(key: string, cause?: unknown): Error {
  return new Error(
    `AdaptTable: ${JSON.stringify(key)} is not a cell key; build cell keys with the table's key helpers.`,
    cause === undefined ? undefined : { cause }
  );
}

/** One prepared row index per keyed collection a snapshot holds. */
const rowIndexes = new WeakMap<
  object,
  ReadonlyMap<string, readonly string[]>
>();

/**
 * The keys of a snapshot's cell collection, grouped by the row they belong
 * to, in insertion order. Snapshots replace their collections on every write,
 * so the index is prepared once per collection and shared by every reader.
 *
 * @param cells - A set of cell keys, or a map keyed by them.
 * @returns Each row id with its cells' keys.
 */
export function cellKeysByRow(
  cells: ReadonlySet<string> | ReadonlyMap<string, unknown>
): ReadonlyMap<string, readonly string[]> {
  const cached = rowIndexes.get(cells);
  if (cached) return cached;
  const index = new Map<string, string[]>();
  for (const key of cells.keys()) {
    const [rowId] = cellIdentityParts(key);
    const keys = index.get(rowId);
    if (keys) keys.push(key);
    else index.set(rowId, [key]);
  }
  rowIndexes.set(cells, index);
  return index;
}

/** A cell key under its row's new id, or the same key when the row kept it. */
function movedCellKey(key: string, ids: ReadonlyMap<string, string>): string {
  const [rowId, columnKey] = cellIdentityParts(key);
  const id = ids.get(rowId);
  return id === undefined ? key : cellIdentity(id, columnKey);
}

/** Whether a cell collection holds a cell of a row the rekey moved. */
function holdsMovedRow(
  cells: ReadonlySet<string> | ReadonlyMap<string, unknown>,
  ids: ReadonlyMap<string, string>
): boolean {
  if (ids.size === 0 || cells.size === 0) return false;
  for (const rowId of cellKeysByRow(cells).keys()) {
    if (ids.has(rowId)) return true;
  }
  return false;
}

/**
 * A set of cell keys with each rekeyed row's cells under its new id; the same
 * set when no row moved.
 *
 * @param cells - The cell keys.
 * @param ids - Old row id to new row id.
 * @returns The cell keys after the rekey.
 */
export function rekeyCellSet(
  cells: ReadonlySet<string>,
  ids: ReadonlyMap<string, string>
): ReadonlySet<string> {
  if (!holdsMovedRow(cells, ids)) return cells;
  return new Set([...cells].map((key) => movedCellKey(key, ids)));
}

/**
 * A map keyed by cell with each rekeyed row's cells under its new id; the
 * same map when no row moved.
 *
 * @param cells - The map.
 * @param ids - Old row id to new row id.
 * @returns The map after the rekey.
 */
export function rekeyCellMap<T>(
  cells: ReadonlyMap<string, T>,
  ids: ReadonlyMap<string, string>
): ReadonlyMap<string, T> {
  if (!holdsMovedRow(cells, ids)) return cells;
  return new Map(
    [...cells].map(([key, value]) => [movedCellKey(key, ids), value])
  );
}
