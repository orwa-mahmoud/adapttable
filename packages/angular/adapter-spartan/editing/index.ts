/**
 * Cell and row editing — `@adapttable/spartan/editing`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  type CellEditHandler,
  extendFeature,
  type RowEditHandler,
  slotRender,
} from "@adapttable/angular";
import {
  EDITABLE_CELL,
  editingFamilyList,
  ROW_EDIT_ACTIONS,
  TOOLBAR_EXTRAS,
} from "@adapttable/angular/adapter";
import {
  dirtyIndicators,
  editHistory,
  editing as coreAngularEditing,
  type EditingLifecycleExtras,
  rowEditing as coreAngularRowEditing,
  undoRedoButtons as bindingUndoRedoButtons,
} from "@adapttable/angular/features";
import { AdaptEditableCell, AdaptUndoRedoButtons } from "@adapttable/spartan";

import { AdaptRowEditActions } from "./rowEditActions";

const cellChrome = [
  slotRender(EDITABLE_CELL, () => AdaptEditableCell),
  slotRender(ROW_EDIT_ACTIONS, () => AdaptRowEditActions),
];

/**
 * Edit a single cell in place. The host's write receives the row, column
 * key and committed value; the table never mutates the array. Fills
 * `EDITABLE_CELL` with this kit's native editors.
 *
 * @param onCellEdit - Called when a draft commits.
 * @param extras - Optional lifecycle observers merged into the patch.
 *
 * @public
 */
export function editing<TRow>(
  onCellEdit: CellEditHandler<TRow>,
  extras: EditingLifecycleExtras<TRow> = {}
): AdaptTableFeature {
  return extendFeature(coreAngularEditing(onCellEdit, extras), cellChrome);
}

/**
 * Edit a whole row at once. The host receives one patch of parsed values.
 *
 * @param onRowEdit - Called with the row and its changed fields.
 * @param extras - Optional lifecycle observers merged into the patch.
 *
 * @public
 */
export function rowEditing<TRow>(
  onRowEdit: RowEditHandler<TRow>,
  extras: EditingLifecycleExtras<TRow> = {}
): AdaptTableFeature {
  return extendFeature(coreAngularRowEditing(onRowEdit, extras), cellChrome);
}

export { AdaptRowEditActions } from "./rowEditActions";

/** Draw localized undo and redo controls when history is enabled. @public */
export function undoRedoButtons(): AdaptTableFeature {
  return extendFeature(bindingUndoRedoButtons(), [
    slotRender(TOOLBAR_EXTRAS, () => AdaptUndoRedoButtons, {
      orderAs: "undo-redo",
    }),
  ]);
}
export type {
  EditHistoryHandle,
  EditHistoryOptions,
} from "@adapttable/angular";
export { dirtyIndicators, editHistory };

/**
 * All of editing — cell editing, dirty marks, edit history and undo
 * controls — with this kit's controls, passed to `features` as one entry.
 * Row and batch editing join beside it.
 *
 * @public
 */
export function editingFamily<TRow>(
  onCellEdit: CellEditHandler<TRow>,
  extras?: EditingLifecycleExtras<TRow>
): readonly AdaptTableFeature[] {
  return editingFamilyList<
    AdaptTableFeature,
    CellEditHandler<TRow>,
    EditingLifecycleExtras<TRow> | undefined
  >(
    {
      editing: (save, more) => editing(save, more),
      dirtyIndicators,
      editHistory: () => editHistory(),
      undoRedoButtons,
    },
    onCellEdit,
    extras
  );
}
