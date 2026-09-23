/**
 * Editing — `@adapttable/<kit>/editing`.
 *
 * Cell, row and batch editing hooks live on this entry. A table that never
 * imports it never carries the editor state machines. The hooks mount
 * in-tree through {@link EDITING_LIVE}.
 *
 * {@link editing}, {@link rowEditing} and {@link batchEditing} all fill
 * the same slot; apply() sets the channel each one owns.
 */
import { devWarn } from "@adapttable/core";
import { type ReactNode, useEffect, useMemo, useRef } from "react";

import { type BatchRowEdit, useBatchEditing } from "../editing/batchEditing";
import { useDirtyCells } from "../editing/dirtyCells";
import { useEditConflict } from "../editing/editConflict";
import { useEditLifecycle } from "../editing/editingEvents";
import { useRowEditing } from "../editing/rowEditing";
import { useCellSaveState } from "../editing/saveState";
import { useCellEditing } from "../editing/useCellEditing";
import { useEditValidation } from "../editing/validation";
import type { ComposedTableProps } from "../props";
import { featureHostOf } from "./featureHost";
import { slotRender } from "./providers";
import { type ChromeExtraSlotProps, EDITING_LIVE } from "./slotKeys";
import type {
  FeaturePatch,
  StaticTableFeature,
  TableFeature,
} from "./tableFeature";

/**
 * Hand the host the unsaved-edit state on mount and whenever a mark moves.
 * The confirm functions are the table's own stable ones.
 */
function useReportDirty(
  onDirtyChange: ComposedTableProps<never>["onDirtyChange"],
  dirty: {
    readonly count: number;
    readonly signature: string;
    readonly confirm: (rowId: string, columnKey: string) => void;
    readonly confirmRow: (rowId: string) => void;
    readonly confirmAll: () => void;
  }
): void {
  const report = useRef(onDirtyChange);
  report.current = onDirtyChange;
  const { count, signature, confirm, confirmRow, confirmAll } = dirty;
  const wired = onDirtyChange !== undefined;
  useEffect(() => {
    if (!wired) return;
    report.current?.({ count, confirm, confirmRow, confirmAll });
  }, [wired, count, signature, confirm, confirmRow, confirmAll]);
}

function LiveEditing({
  chrome,
  props,
  children,
}: ChromeExtraSlotProps<never>): ReactNode {
  const lifecycle = useEditLifecycle({
    onEditStart: props.onEditStart,
    onEditCancel: props.onEditCancel,
    onEditCommit: props.onEditCommit,
    onValidationFail: props.onValidationFail,
    onEditError: props.onEditError,
  });
  const cellEditingState = useCellEditing({
    onEditStart: lifecycle.onEditStart,
    onEditCancel: lifecycle.onEditCancel,
  });
  const conflict = useEditConflict();
  const onCellEdit = props.onCellEdit;
  const validation = useEditValidation({
    validateRow: props.validateRow,
    applyEdit: props.applyEdit,
  });
  const saving = useCellSaveState({
    onRollback: props.onEditRollback,
    formatError: props.formatEditError,
    onEditError: lifecycle.onEditError,
  });
  const dirty = useDirtyCells({ enabled: props.dirtyIndicators === true });
  useReportDirty(props.onDirtyChange, dirty);
  const rowModeArmed =
    props.rowEditing === true && props.onRowEdit !== undefined;
  const rowEditing = useRowEditing({
    enabled: rowModeArmed,
    columns: chrome.allColumns,
    onRowEdit: props.onRowEdit,
    onEditStart: lifecycle.onEditStart,
    onEditCancel: lifecycle.onEditCancel,
    onEditCommit: lifecycle.onEditCommit,
    featureHost: featureHostOf(props),
  });
  const batchArmed =
    props.batchEditing === true && props.onBatchEdit !== undefined;
  const batch = useBatchEditing({
    enabled: batchArmed,
    columns: chrome.allColumns,
    onBatchEdit: props.onBatchEdit,
    onEditStart: lifecycle.onEditStart,
    onEditCancel: lifecycle.onEditCancel,
    onEditCommit: lifecycle.onEditCommit,
    featureHost: featureHostOf(props),
  });
  const editingArmed = onCellEdit !== undefined || rowModeArmed || batchArmed;
  const editing = useMemo(
    () =>
      editingArmed
        ? {
            onCellEdit,
            state: cellEditingState,
            validation,
            saving,
            dirty,
            rowEditing: rowModeArmed ? rowEditing : undefined,
            rowEditIcons: props.rowEditIcons,
            batch: batchArmed ? batch : undefined,
            lifecycle,
            conflict,
            conflictLabels: {
              message: chrome.table.labels.editConflict,
              keepMine: chrome.table.labels.keepMine,
              takeTheirs: chrome.table.labels.takeTheirs,
              theirsValue: chrome.table.labels.theirsValue,
            },
            featureHost: featureHostOf(props),
          }
        : undefined,
    [
      editingArmed,
      onCellEdit,
      cellEditingState,
      validation,
      saving,
      dirty,
      rowModeArmed,
      rowEditing,
      batchArmed,
      batch,
      lifecycle,
      conflict,
      chrome.table.labels.editConflict,
      chrome.table.labels.keepMine,
      chrome.table.labels.takeTheirs,
      chrome.table.labels.theirsValue,
      props,
    ]
  );

  const hasEditableColumn = chrome.allColumns.some((column) => column.editable);
  useEffect(() => {
    if (!hasEditableColumn || onCellEdit) return;
    devWarn(
      "columns declare `editable` but no edit handler is composed — cell editing stays inert. Add `editing(handler)` to the table's features."
    );
  }, [hasEditableColumn, onCellEdit]);

  const editingRows = useMemo(() => {
    if (!chrome.grouping) return chrome.source.rows as never[];
    const leaves: never[] = [];
    for (const entry of chrome.grouping.entries) {
      if (entry.kind === "row") leaves.push(entry.row);
    }
    return leaves;
  }, [chrome.grouping, chrome.source.rows]);

  const rowKey = props.rowKey;
  useEffect(() => {
    if (!editing) return;
    editing.state.discardIfRowMissing(editingRows, (row) =>
      rowKey(row as never)
    );
    conflict.reconcile({
      active: editing.state.active,
      openedRow: editing.state.openedRow(),
      draft: editing.state.draft,
      rows: editingRows,
      columns: chrome.allColumns,
      rowKey: (row: unknown) => rowKey(row as never),
      rowVersion: props.rowVersion as
        ((row: unknown) => string | number) | undefined,
      policy: props.editConflictPolicy ?? "ask",
      onEditConflict: props.onEditConflict as never,
      keep: (row) => {
        editing.state.keepLive(row);
      },
      take: (row, value) => {
        editing.state.takeLive(row, value);
      },
    });
  }, [
    editing,
    editingRows,
    rowKey,
    conflict,
    chrome.allColumns,
    props.rowVersion,
    props.editConflictPolicy,
    props.onEditConflict,
  ]);

  // A form is measured field by field: a field the reader never typed in has
  // nothing of theirs to lose and simply takes what arrived, and only the ones
  // they were working in become a question.
  useEffect(() => {
    if (!rowModeArmed) return;
    conflict.reconcileRow({
      activeRowId: rowEditing.activeRowId,
      openedRow: rowEditing.openedRow(),
      seeds: rowEditing.seeds(),
      drafts: rowEditing.drafts,
      rows: editingRows,
      columns: chrome.allColumns,
      rowKey: (row: unknown) => rowKey(row as never),
      policy: props.editConflictPolicy ?? "ask",
      onEditConflict: props.onEditConflict as never,
      accept: (row: unknown, columnKeys: readonly string[]) => {
        rowEditing.acceptSeeds(row as never, columnKeys);
      },
      take: (row: unknown, columnKeys: readonly string[]) => {
        rowEditing.takeSeeds(row as never, columnKeys);
      },
    });
  }, [
    rowModeArmed,
    rowEditing,
    editingRows,
    rowKey,
    conflict,
    chrome.allColumns,
    props.editConflictPolicy,
    props.onEditConflict,
  ]);

  // A batch is the same question across several rows at once, so a cell is
  // named by its row as well as its column.
  useEffect(() => {
    if (!batchArmed) return;
    conflict.reconcileBatch({
      entries: batch.entries,
      rows: editingRows,
      columns: chrome.allColumns,
      rowKey: (row: unknown) => rowKey(row as never),
      policy: props.editConflictPolicy ?? "ask",
      onEditConflict: props.onEditConflict as never,
      accept: (row: unknown, rowId: string, columnKeys: readonly string[]) => {
        batch.acceptSeeds(row as never, rowId, columnKeys);
      },
      take: (row: unknown, rowId: string, columnKeys: readonly string[]) => {
        batch.takeSeeds(row as never, rowId, columnKeys);
      },
    });
  }, [
    batchArmed,
    batch,
    editingRows,
    rowKey,
    conflict,
    chrome.allColumns,
    props.editConflictPolicy,
    props.onEditConflict,
  ]);

  return children({ ...chrome, editing, editingRows } as never);
}

const editingRender = slotRender(EDITING_LIVE, (props) => (
  <LiveEditing {...props} />
));

/**
 * Edit a single cell in place.
 *
 * @public
 */
export function editing<TRow>(
  onCellEdit: (row: TRow, key: string, nextValue: unknown) => unknown,
  extras?: FeaturePatch<TRow>
): TableFeature<TRow> {
  return {
    id: "editing",
    apply: () => ({ onCellEdit, ...extras }),
    renders: [editingRender],
  };
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
  return {
    id: "row-editing",
    apply: () => ({ rowEditing: true, onRowEdit, ...extras }),
    renders: [editingRender],
  };
}

/**
 * Collect edits and save them in one batch.
 *
 * @public
 */
export function batchEditing<TRow>(
  onBatchEdit: (edits: readonly BatchRowEdit<TRow>[]) => unknown,
  extras?: FeaturePatch<TRow>
): TableFeature<TRow> {
  return {
    id: "batch-editing",
    apply: () => ({ batchEditing: true, onBatchEdit, ...extras }),
    renders: [editingRender],
  };
}

/**
 * Mark cells and rows that have unsaved edits.
 *
 * @public
 */
export function dirtyIndicators(): StaticTableFeature {
  return {
    id: "dirty-indicators",
    apply: () => ({ dirtyIndicators: true }),
    renders: [editingRender],
  };
}

export type { BatchRowEdit } from "../editing/batchEditing";
