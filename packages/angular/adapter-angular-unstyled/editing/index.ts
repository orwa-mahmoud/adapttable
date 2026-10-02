/**
 * Cell and row editing — `@adapttable/angular-unstyled/editing`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  type CellEditHandler,
  EDITABLE_CELL,
  editing as coreAngularEditing,
  type EditingLifecycleExtras,
  extendFeature,
  ROW_EDIT_ACTIONS,
  type RowEditHandler,
  rowEditing as coreAngularRowEditing,
  slotRender,
  TOOLBAR_EXTRAS,
  undoRedoButtons as bindingUndoRedoButtons,
} from "@adapttable/angular";
import {
  AdaptEditableCell,
  AdaptUndoRedoButtons,
} from "@adapttable/angular-unstyled";

import { AdaptRowEditActions } from "./rowEditActions";

const cellChrome = [
  slotRender(EDITABLE_CELL, () => AdaptEditableCell),
  slotRender(ROW_EDIT_ACTIONS, () => AdaptRowEditActions),
];

/**
 * Edit a single cell in place. The host's write receives the row, column
 * key and committed value; the table never mutates the array. Fills
 * {@link EDITABLE_CELL} with this kit's native editors.
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
export {
  dirtyIndicators,
  editHistory,
  type EditHistoryHandle,
  type EditHistoryOptions,
} from "@adapttable/angular";
