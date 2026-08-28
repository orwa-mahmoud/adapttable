/**
 * Finding out what a right-click landed on.
 *
 * A table has three things worth a context menu — a header, a row, a cell —
 * and they are three different render paths in every adapter. Binding
 * handlers to all three, in eight kits, is twenty-four places for one of
 * them to be forgotten, and a forgotten one is invisible: the menu simply
 * never opens there, and no test that does not already know to look will
 * say so.
 *
 * So the handlers bind once, to the element that contains all three, and
 * the target is read back out of the DOM. That is what
 * `data-adapttable-part` is for — it is public contract, the same names in
 * every kit — and it means a kit wires a context menu by binding one object
 * and tagging its rows with the id they already have.
 *
 * The element the event started from is kept as well as the target, because
 * closing the menu has to put focus back, and the container is not where
 * focus was.
 */
import type { ContextMenuTarget } from "./contextMenuModel";

export type { ContextMenuTarget };

/**
 * The attribute a row carries so its menu knows which row it is.
 *
 * @public
 */
export const ROW_ID_ATTRIBUTE = "data-row-id";

/**
 * What {@link resolveContextTarget} found.
 *
 * @public
 */
export interface ResolvedContextTarget<TRow> {
  /** What the menu was opened on. */
  target: ContextMenuTarget<TRow>;
  /** The element the menu was opened from, for focus on the way back. */
  element: HTMLElement;
}

/** The nearest ancestor carrying a part name, or null. */
function partAncestor(from: Element, part: string): HTMLElement | null {
  return from.closest<HTMLElement>(`[data-adapttable-part="${part}"]`);
}

/**
 * Work out which header, row or cell an event happened in.
 *
 * @param from - The element the event started at.
 * @param rowFor - Turns a row id back into the row, since the DOM only
 *   carries the id. Returning `undefined` means the row is no longer
 *   rendered, and there is nothing to open a menu for.
 * @returns The target and the element to restore focus to, or `null` when
 *   the event happened somewhere with no menu of its own.
 *
 * @public
 */
export function resolveContextTarget<TRow>(
  from: Element,
  rowFor: (rowId: string) => TRow | undefined
): ResolvedContextTarget<TRow> | null {
  const header = partAncestor(from, "header-cell");
  if (header) {
    const columnKey = header.dataset.columnKey;
    if (columnKey === undefined) return null;
    return { target: { kind: "header", columnKey }, element: header };
  }
  const row = partAncestor(from, "row");
  if (!row) return null;
  const rowId = row.getAttribute(ROW_ID_ATTRIBUTE);
  if (rowId === null) return null;
  const value = rowFor(rowId);
  if (value === undefined) return null;
  const cell = partAncestor(from, "cell");
  const columnKey = cell?.dataset.columnKey;
  // A click on the row but outside any cell — the gap between them, a
  // pinned spacer — is a row menu, not a cell menu with no column.
  if (cell && columnKey !== undefined) {
    return {
      target: { kind: "cell", row: value, rowId, columnKey },
      element: cell,
    };
  }
  return { target: { kind: "row", row: value, rowId }, element: row };
}
