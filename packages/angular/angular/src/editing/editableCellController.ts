import {
  type EditableCellController,
  editableCellController as coreEditableCellController,
  type EditingBundle,
} from "@adapttable/core";
import type { RowEditIcons } from "@adapttable/core/binding";

import type { ColumnDef } from "../columnDef";

export type {
  EditableCellController,
  EditableCellMode,
  EditingBundle,
} from "@adapttable/core";

/**
 * Opt-in editing bundle from the table's composed editing features.
 *
 * @public
 */
export interface EditableCellEditing<TRow> extends EditingBundle<TRow> {
  /** Glyph overrides for the row-mode controls, when the host set any. */
  rowEditIcons?: RowEditIcons;
}

/**
 * Derive the per-cell editing controller. When `editing` is omitted, always
 * returns `mode: "display"`.
 *
 * @public
 */
export function editableCellController<TRow>(options: {
  editing: EditableCellEditing<TRow> | undefined;
  row: TRow;
  column: ColumnDef<TRow>;
  rowId: string;
  rows: readonly TRow[];
  columns: readonly ColumnDef<TRow>[];
  rowKey: (row: TRow) => string;
}): EditableCellController {
  return coreEditableCellController(options);
}
