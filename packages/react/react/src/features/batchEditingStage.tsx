/**
 * Batch editing's part of the editing stage: the staged edits, the conflict
 * check across them and the cell a batch draws. Only `batchEditing()` brings
 * it.
 */
import { type ReactNode, useEffect } from "react";

import { useBatchEditing } from "../editing/batchEditing";
import { BatchEditCell } from "../editing/RowEditGate";
import {
  BATCH_EDIT_CELL,
  BATCH_EDITING_STAGE,
  type EditUnitStageProps,
} from "./editingStageKeys";
import { featureHostOf } from "./featureHost";
import { slotRender } from "./providers";

function BatchEditingStage({
  enabled,
  props,
  columns,
  lifecycle,
  conflict,
  rows,
  children,
}: EditUnitStageProps<ReturnType<typeof useBatchEditing<unknown>>>): ReactNode {
  const batch = useBatchEditing({
    enabled,
    columns,
    onBatchEdit: props.onBatchEdit,
    onEditStart: lifecycle.onEditStart,
    onEditCancel: lifecycle.onEditCancel,
    onEditCommit: lifecycle.onEditCommit,
    validateRow: props.validateRow,
    applyEdit: props.applyEdit,
    formatEditError: props.formatEditError,
    onEditError: lifecycle.onEditError,
    onValidationFail: lifecycle.onValidationFail,
    featureHost: featureHostOf(props),
  });
  const rowKey = props.rowKey;
  // A batch is the same question across several rows at once, so a cell is
  // named by its row as well as its column.
  useEffect(() => {
    if (!enabled) return;
    conflict.reconcileBatch({
      entries: batch.entries,
      rows,
      columns,
      rowKey: (row: unknown) => rowKey(row),
      policy: props.editConflictPolicy ?? "ask",
      onEditConflict: props.onEditConflict,
      accept: (row: unknown, rowId: string, columnKeys: readonly string[]) => {
        batch.acceptSeeds(row, rowId, columnKeys);
      },
      take: (row: unknown, rowId: string, columnKeys: readonly string[]) => {
        batch.takeSeeds(row, rowId, columnKeys);
      },
    });
  }, [
    enabled,
    batch,
    rows,
    rowKey,
    conflict,
    columns,
    props.editConflictPolicy,
    props.onEditConflict,
  ]);
  return children(enabled ? batch : undefined);
}

/** The stage and the batch cell, as `batchEditing()` composes them. */
export const BATCH_EDITING_RENDERS = [
  slotRender(BATCH_EDITING_STAGE, (props) => <BatchEditingStage {...props} />),
  slotRender(BATCH_EDIT_CELL, (props) => <BatchEditCell {...props} />),
];
