import {
  BATCH_EDIT_BAR,
  EDITABLE_CELL,
  type EditableCellSlotProps,
  extendFeature,
  ROW_EDIT_ACTIONS,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import {
  batchEditing as coreBatch,
  dirtyIndicators as coreDirty,
  editHistory as coreHistory,
  editing as coreEditing,
  rowEditing as coreRowEditing,
  undoRedoButtons as coreButtons,
  type FeaturePatch,
} from "@adapttable/core/features";

import { EditableDataCell } from "./components/EditableCell";
import { BatchEditBar, RowEditActions } from "./components/kitControls";

function EditableSlot(props: EditableCellSlotProps<never>) {
  return (
    <EditableDataCell
      {...props}
      display={
        props.display ??
        (props.column.Cell ? (
          <props.column.Cell row={props.row} rowIndex={props.rowIndex} />
        ) : (
          props.column.accessor?.(props.row)
        ))
      }
    />
  );
}

const cellChrome = [
  slotRender(EDITABLE_CELL, (props) => <EditableSlot {...props} />),
  slotRender(ROW_EDIT_ACTIONS, (props) => <RowEditActions {...props} />),
];

export function editing<TRow>(
  onCellEdit: (row: TRow, key: string, nextValue: unknown) => unknown,
  extras?: FeaturePatch<TRow>
): TableFeature<TRow> {
  return extendFeature(coreEditing(onCellEdit, extras), cellChrome);
}

export function rowEditing<TRow>(
  onRowEdit: (row: TRow, patch: Readonly<Record<string, unknown>>) => unknown,
  extras?: FeaturePatch<TRow>
): TableFeature<TRow> {
  return extendFeature(coreRowEditing(onRowEdit, extras), cellChrome);
}

export function dirtyIndicators<TRow>(): TableFeature<TRow> {
  return extendFeature(coreDirty<TRow>(), []);
}

export function editHistory<TRow>(
  options: boolean | { depth?: number } = true
): TableFeature<TRow> {
  return extendFeature(coreHistory(options), []);
}

export function undoRedoButtons<TRow>(): TableFeature<TRow> {
  return extendFeature(coreButtons<TRow>(), []);
}

export function batchEditing<TRow>(
  onBatchEdit: Parameters<typeof coreBatch<TRow>>[0]
): TableFeature<TRow> {
  return extendFeature(coreBatch<TRow>(onBatchEdit), [
    ...cellChrome,
    slotRender(BATCH_EDIT_BAR, (props) => <BatchEditBar {...props} />),
  ]);
}
