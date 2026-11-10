/**
 * Copy, cut and paste for a grid that opted into them.
 *
 * A late clipboard answer is dropped when the rows, columns, window or enabled
 * flag changed, or the container was detached. The host still writes the cells.
 */
import { GRID_LABELS } from "../labelGroups/gridLabels";
import { type CellRange, cellRangeSize } from "./cellRange";
import {
  clipboardRangeText,
  readClipboardText,
  writeClipboardText,
} from "./clipboardRange";
import type { GridNavSession } from "./gridNavigation";
import { pasteRangeEdits } from "./pasteRange";

/** Ctrl/Cmd+C and Ctrl/Cmd+X — the rectangle, as a spreadsheet reads it. */
export function copyGridSelection<TRow>(
  session: GridNavSession<TRow>,
  selection: CellRange,
  cut: boolean
): void {
  const version = session.clipboardVersion;
  let text: string;
  try {
    text = clipboardRangeText({
      range: selection,
      rows: session.options.rows,
      columns: session.options.columns,
      firstRowIndex: session.firstRow(),
    });
  } catch {
    session.say(
      session.labels()?.gridRangeCopyFailed ?? GRID_LABELS.gridRangeCopyFailed
    );
    return;
  }
  void writeClipboardText(text).then((ok) => {
    if (!session.options.enabled || version !== session.clipboardVersion)
      return;
    session.say(
      ok
        ? (session.labels()?.gridRangeCopied ?? GRID_LABELS.gridRangeCopied)(
            cellRangeSize(selection)
          )
        : (session.labels()?.gridRangeCopyFailed ??
            GRID_LABELS.gridRangeCopyFailed)
    );
    if (ok && cut) session.options.onCut?.(selection);
  });
}

/** Copy or cut the named cell, or the current selection. */
export function copyGridCells<TRow>(
  session: GridNavSession<TRow>,
  cell: { row: number; col: number } | undefined,
  cut: boolean
): void {
  const selection: CellRange | null = cell
    ? { anchor: cell, head: cell }
    : session.snapshot.range;
  if (!selection) return;
  copyGridSelection(session, selection, cut);
}

/** Ctrl/Cmd+V — the clipboard, mapped onto the selection's top-left cell. */
export function pasteGridSelection<TRow>(
  session: GridNavSession<TRow>,
  target: CellRange
): void {
  const version = session.clipboardVersion;
  void readClipboardText().then((text) => {
    if (!session.options.enabled || version !== session.clipboardVersion)
      return;
    if (text === null) {
      session.say(
        session.labels()?.gridRangePasteFailed ??
          GRID_LABELS.gridRangePasteFailed
      );
      return;
    }
    let count = 0;
    session.applyGesture(
      () => {
        const edits = pasteRangeEdits({
          text,
          range: target,
          rows: session.options.rows,
          columns: session.options.columns,
          firstRowIndex: session.firstRow(),
        });
        count = edits.length;
        return session.options.onPaste?.(edits);
      },
      () =>
        session.say(
          (session.labels()?.gridRangePasted ?? GRID_LABELS.gridRangePasted)(
            count
          )
        ),
      session.labels()?.gridRangePasteFailed ?? GRID_LABELS.gridRangePasteFailed
    );
  });
}
