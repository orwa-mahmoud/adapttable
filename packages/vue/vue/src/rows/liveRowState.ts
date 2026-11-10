import type { Attrs } from "../attrs";
import type { TableBodySlot, TableRowModel } from "../layout/tableModels";
import type { RowSelection } from "../selection/selection";

/** Which element a row is drawn as, and the attribute that marks it selected. */
export type RowElement = "row" | "card";

/** The attributes that say a row is selected, for each element. */
function selectedAttrs(
  element: RowElement,
  selected: boolean
): Readonly<Record<string, unknown>> {
  return element === "row"
    ? { "aria-selected": selected }
    : { "data-selected": selected ? "" : undefined };
}

/**
 * The row with its selected state read when its attributes are read.
 *
 * The body model is built without reading the selection, so a selection
 * change leaves it, and every row model in it, as they were. The row that is
 * drawn reads its own state here, and only that row follows the change.
 * Every other property, the lazily built cells among them, stays as the row
 * defines it.
 */
export function withLiveSelection<TRow>(
  row: TableRowModel<TRow>,
  selection: RowSelection | undefined,
  element: RowElement
): TableRowModel<TRow> {
  if (!selection || row.summary) return row;
  const base: Attrs = row.attrs;
  const attrs = (): Attrs => ({
    ...base,
    ...selectedAttrs(element, selection.isSelected(row.key)),
  });
  return Object.defineProperties(
    {
      key: row.key,
      row: row.row,
      index: row.index,
      attrs: base,
      get cells() {
        return row.cells;
      },
    },
    {
      ...Object.getOwnPropertyDescriptors(row),
      attrs: { get: attrs, enumerable: true, configurable: true },
    }
  );
}

/** Each row slot's row, with its selected state read when it is drawn. */
export function withLiveSelectionSlots<TRow>(
  slots: readonly TableBodySlot<TRow>[] | undefined,
  selection: RowSelection | undefined,
  element: RowElement
): readonly TableBodySlot<TRow>[] | undefined {
  if (!slots || !selection) return slots;
  return slots.map((slot) =>
    slot.kind === "row"
      ? { ...slot, wiring: withLiveSelection(slot.wiring, selection, element) }
      : slot
  );
}
