/**
 * Per-cell editing controller — core's pipeline bound to Angular's column
 * type and the editing bundle the table hands every cell.
 */
import {
  type EditableCellController,
  editableCellController as coreEditableCellController,
  type EditingBundle,
  rowEditingSignature as coreRowEditingSignature,
  rowIsDirty as coreRowIsDirty,
} from "@adapttable/core";
import type { RowEditIcons } from "@adapttable/core/binding";

import type { ColumnDef } from "../columnDef";

export type {
  EditableCellController,
  EditableCellMode,
  EditingBundle,
} from "@adapttable/core";
export { focusEditorOnMount, stopCellEditKeyboard } from "@adapttable/core";

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
 * Whether a row holds any dirty cell mark.
 *
 * @public
 */
export function rowIsDirty<TRow>(
  editing: EditableCellEditing<TRow> | undefined,
  rowId: string
): boolean {
  return coreRowIsDirty(
    editing as Parameters<typeof coreRowIsDirty<TRow>>[0],
    rowId
  );
}

/**
 * Signature of a row's editing state for memo comparators.
 *
 * @public
 */
export function rowEditingSignature<TRow>(
  editing: EditableCellEditing<TRow> | undefined,
  rowId: string
): string | null {
  return coreRowEditingSignature(
    editing as Parameters<typeof coreRowEditingSignature<TRow>>[0],
    rowId
  );
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
