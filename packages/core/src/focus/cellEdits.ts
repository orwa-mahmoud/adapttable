/**
 * What a batch gesture commits, and who receives it.
 *
 * Paste and fill both write many cells at once, and both do it as ORDINARY
 * edits: the same shape an inline commit produces, through the same handler.
 * That is deliberate — anything later wrapped around single-cell editing
 * (validation, async saves, conflict handling) covers a batch without the
 * batch knowing it exists, and there is never a second half-maintained
 * editing route to keep in step.
 */
/**
 * One cell written — exactly what an inline commit writes.
 *
 * @public
 */
export interface CellEdit<TRow> {
  /** The row being written. */
  row: TRow;
  /** Which column, by key. */
  columnKey: string;
  /** The value to commit, already through the column's `parseValue`. */
  value: unknown;
}

/**
 * Resolve who receives a batch of edits.
 *
 * A table that can already be edited can already be pasted into and filled:
 * with no batch handler, each edit goes through `onCellEdit`, the exact call
 * an inline commit makes. The batch handler exists for hosts that want the
 * whole set at once — one server round trip, one undo entry — and takes
 * precedence when given.
 *
 * @typeParam TRow - The row type.
 * @param batch - The host's batch handler, when it has one.
 * @param onCellEdit - The ordinary inline-edit channel.
 * @returns The handler, or `undefined` when the table takes no edits at all —
 *   which leaves the gesture's key or drag to the browser.
 *
 * @public
 */
export function batchEditHandler<TRow>(
  batch: ((edits: CellEdit<TRow>[]) => void) | undefined,
  onCellEdit: ((row: TRow, key: string, nextValue: unknown) => void) | undefined
): ((edits: CellEdit<TRow>[]) => void) | undefined {
  if (batch) return batch;
  if (!onCellEdit) return undefined;
  return (edits) => {
    for (const edit of edits) onCellEdit(edit.row, edit.columnKey, edit.value);
  };
}
