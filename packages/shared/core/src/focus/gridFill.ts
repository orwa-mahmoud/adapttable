/**
 * Fill-handle and Ctrl/Cmd+D behavior.
 *
 * The filled rectangle is ordinary cell edits. The host writes them. A fill
 * that never leaves the selection writes nothing.
 */
import { defaultLabels } from "../labels";
import { type CellRange, cellRangeBounds } from "./cellRange";
import { fillRangeEdits, fillTargetRange } from "./fillRange";
import type { GridCell } from "./gridFocus";
import type { GridNavSession } from "./gridNavigation";

/** Whether a rectangle is one row tall — there is nothing to fill down into. */
function isSingleRowRange(range: CellRange): boolean {
  const bounds = cellRangeBounds(range);
  return bounds.fromRow === bounds.toRow;
}

/**
 * The cell carrying the fill handle — the selection's bottom inline-end
 * corner — or `null` when there is nothing to fill from or no host to receive
 * a fill.
 *
 * @param input - Whether navigation is on, the selection, and whether the
 *   host takes fills.
 * @returns The handle's cell.
 *
 * @public
 */
export function gridFillHandleCell(input: {
  readonly enabled: boolean;
  readonly range: CellRange | null;
  readonly canFill: boolean;
}): GridCell | null {
  const { enabled, range, canFill } = input;
  if (!enabled || !range || !canFill) return null;
  const b = cellRangeBounds(range);
  return { row: b.toRow, col: b.toCol };
}

/** What a fill in progress would cover, cached while the drag is still. */
export function previewGridFill<TRow>(
  session: GridNavSession<TRow>,
  range: CellRange | null
): CellRange | null {
  if (range === session.previewOf.range && session.fillTo === session.previewOf.to) {
    return session.snapshot.fillPreview;
  }
  session.previewOf = { range, to: session.fillTo };
  return range && session.fillTo ? fillTargetRange(range, session.fillTo) : null;
}

/** Commit a fill drag. The filled rectangle stays selected. */
export function commitGridFill<TRow>(
  session: GridNavSession<TRow>,
  to: GridCell
): void {
  const { range } = session.snapshot;
  const { onFill } = session.options;
  if (!range || !onFill) return;
  let count = 0;
  session.applyGesture(
    () => {
      const edits = fillRangeEdits({
        source: range,
        to,
        rows: session.options.rows,
        columns: session.options.columns,
        firstRowIndex: session.firstRow(),
      });
      count = edits.length;
      return count > 0 ? onFill(edits) : undefined;
    },
    () =>
      session.batch(() => {
        if (count === 0) return;
        if (session.snapshot.range === range) {
          session.write({ range: fillTargetRange(range, to) });
        }
        session.say(
          (session.labels()?.gridRangeFilled ?? defaultLabels.gridRangeFilled)(count)
        );
      }),
    session.labels()?.gridRangeFillFailed ?? defaultLabels.gridRangeFillFailed
  );
}

/** Ctrl/Cmd+D — the selection's top row carries into the rest of it. */
export function fillGridDown<TRow>(
  session: GridNavSession<TRow>,
  selection: CellRange
): void {
  if (isSingleRowRange(selection)) return;
  const b = cellRangeBounds(selection);
  let count = 0;
  session.applyGesture(
    () => {
      const edits = fillRangeEdits({
        source: {
          anchor: { row: b.fromRow, col: b.fromCol },
          head: { row: b.fromRow, col: b.toCol },
        },
        to: { row: b.toRow, col: b.toCol },
        rows: session.options.rows,
        columns: session.options.columns,
        firstRowIndex: session.firstRow(),
      });
      count = edits.length;
      return session.options.onFill?.(edits);
    },
    () =>
      session.say(
        (session.labels()?.gridRangeFilled ?? defaultLabels.gridRangeFilled)(count)
      ),
    session.labels()?.gridRangeFillFailed ?? defaultLabels.gridRangeFillFailed
  );
}

/** True when the selection has more than one row for Ctrl/Cmd+D to fill. */
export function canFillDown(range: CellRange): boolean {
  return !isSingleRowRange(range);
}

/** A pointer press on the fill handle. */
export function pressGridFillHandle<TRow>(
  session: GridNavSession<TRow>,
  event: { preventDefault: () => void; stopPropagation: () => void }
): void {
  event.preventDefault();
  event.stopPropagation();
  session.filling = true;
}

/** Move the fill preview. Returns false when no fill is in progress. */
export function enterGridFill<TRow>(
  session: GridNavSession<TRow>,
  cell: GridCell
): boolean {
  if (!session.filling) return false;
  session.setFillTo(cell);
  return true;
}

/** End a drag, and commit a fill that left the selection. */
export function releaseGridPointer<TRow>(session: GridNavSession<TRow>): void {
  session.dragging = false;
  if (!session.filling) return;
  session.filling = false;
  const to = session.fillTo;
  session.batch(() => {
    session.setFillTo(null);
    if (to) commitGridFill(session, to);
  });
}
