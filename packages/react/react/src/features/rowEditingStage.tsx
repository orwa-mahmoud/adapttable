/**
 * Row editing's part of the editing stage: the form state, the conflict check
 * for an open form and the cell a form draws. Only `rowEditing()` brings it.
 */
import { type ReactNode, useEffect } from "react";

import { RowEditCell } from "../editing/RowEditGate";
import { useRowEditing } from "../editing/rowEditing";
import {
  type EditUnitStageProps,
  ROW_EDIT_CELL,
  ROW_EDITING_STAGE,
} from "./editingStageKeys";
import { featureHostOf } from "./featureHost";
import { slotRender } from "./providers";

function RowEditingStage({
  enabled,
  props,
  columns,
  lifecycle,
  conflict,
  rows,
  children,
}: EditUnitStageProps<ReturnType<typeof useRowEditing<unknown>>>): ReactNode {
  const rowEditing = useRowEditing({
    enabled,
    columns,
    onRowEdit: props.onRowEdit,
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
  // A form is measured field by field: a field the reader never typed in has
  // nothing of theirs to lose and simply takes what arrived, and only the ones
  // they were working in become a question.
  useEffect(() => {
    if (!enabled) return;
    conflict.reconcileRow({
      activeRowId: rowEditing.activeRowId,
      openedRow: rowEditing.openedRow(),
      seeds: rowEditing.seeds(),
      drafts: rowEditing.drafts,
      rows,
      columns,
      rowKey: (row: unknown) => rowKey(row),
      policy: props.editConflictPolicy ?? "ask",
      onEditConflict: props.onEditConflict,
      accept: (row: unknown, columnKeys: readonly string[]) => {
        rowEditing.acceptSeeds(row, columnKeys);
      },
      take: (row: unknown, columnKeys: readonly string[]) => {
        rowEditing.takeSeeds(row, columnKeys);
      },
    });
  }, [
    enabled,
    rowEditing,
    rows,
    rowKey,
    conflict,
    columns,
    props.editConflictPolicy,
    props.onEditConflict,
  ]);
  return children(enabled ? rowEditing : undefined);
}

/** The stage and the form cell, as `rowEditing()` composes them. */
export const ROW_EDITING_RENDERS = [
  slotRender(ROW_EDITING_STAGE, (props) => <RowEditingStage {...props} />),
  slotRender(ROW_EDIT_CELL, (props) => <RowEditCell {...props} />),
];
