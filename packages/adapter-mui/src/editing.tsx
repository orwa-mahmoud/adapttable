import {
  BATCH_EDIT_BAR,
  EDITABLE_CELL,
  extendFeature,
  ROW_EDIT_ACTIONS,
  slotRender,
  type StaticTableFeature,
  type TableFeature,
  TOOLBAR_EXTRAS,
} from "@adapttable/core/adapter";
import {
  batchEditing as coreBatch,
  dirtyIndicators as coreDirty,
  editHistory as coreHistory,
  editing as coreEditing,
  type FeaturePatch,
  rowEditing as coreRowEditing,
  undoRedoButtons as coreButtons,
} from "@adapttable/core/features";

import { EditableDataCell } from "./components/EditableCell";
import { BatchEditBar, RowEditActions } from "./components/kitControls";
import { UndoRedoButtons } from "./components/toolbarExtras";

const cellChrome = [
  slotRender(EDITABLE_CELL, (props) => <EditableDataCell {...props} />),
  slotRender(ROW_EDIT_ACTIONS, (props) => <RowEditActions {...props} />),
];

/**
 * Edit a single cell in place, with MUI's own editors.
 *
 * @public
 */
export function editing<TRow>(
  onCellEdit: (row: TRow, key: string, nextValue: unknown) => unknown,
  extras?: FeaturePatch<TRow>
): TableFeature<TRow> {
  return extendFeature(coreEditing(onCellEdit, extras), cellChrome);
}

/**
 * Edit a whole row at once, saved or cancelled together.
 *
 * @public
 */
export function rowEditing<TRow>(
  onRowEdit: (row: TRow, patch: Readonly<Record<string, unknown>>) => unknown,
  extras?: FeaturePatch<TRow>
): TableFeature<TRow> {
  return extendFeature(coreRowEditing(onRowEdit, extras), cellChrome);
}

/**
 * Mark cells and rows that have unsaved edits.
 *
 * @public
 */
export function dirtyIndicators(): StaticTableFeature {
  return extendFeature(coreDirty(), []);
}

const undoChrome = [
  slotRender(TOOLBAR_EXTRAS, (props) => <UndoRedoButtons {...props} />),
];

/**
 * Track edits so they can be undone and redone.
 *
 * @public
 */
export function editHistory(
  options: boolean | { depth?: number } = true
): StaticTableFeature {
  return extendFeature(coreHistory(options), undoChrome);
}

/**
 * Add undo and redo controls for edits.
 *
 * @public
 */
export function undoRedoButtons(): StaticTableFeature {
  return extendFeature(coreButtons(), undoChrome);
}

/**
 * Hold every edit until the reader saves, with MUI's own save and discard
 * buttons.
 *
 * @public
 */
export function batchEditing<TRow>(
  onBatchEdit: Parameters<typeof coreBatch<TRow>>[0]
): TableFeature<TRow> {
  return extendFeature(coreBatch(onBatchEdit), [
    ...cellChrome,
    slotRender(BATCH_EDIT_BAR, (props) => <BatchEditBar {...props} />),
  ]);
}
