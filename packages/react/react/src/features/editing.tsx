/**
 * Editing — `@adapttable/<kit>/editing`.
 *
 * Cell, row and batch editing hooks live on this entry. A table that never
 * imports it never carries the editor state machines. The hooks mount
 * in-tree through `EDITING_LIVE`.
 *
 * {@link editing}, {@link rowEditing} and {@link batchEditing} all fill
 * the same slot; apply() sets the channel each one owns.
 */
import {
  devWarn,
  type EditableColumnLike,
  type EditConflictState,
} from "@adapttable/core";
import {
  coreBatchEditing,
  coreDirtyIndicators,
  coreEditing,
  coreRowEditing,
} from "@adapttable/core/binding";
import {
  dirtyMarkerView,
  resolveEditingArming,
} from "@adapttable/core/editing";
import { type ReactNode, useEffect, useMemo, useRef } from "react";

import type { BatchEditingState, BatchRowEdit } from "../editing/batchEditing";
import { useDirtyCells } from "../editing/dirtyCells";
import { useEditConflict } from "../editing/editConflict";
import { type EditLifecycle, useEditLifecycle } from "../editing/editingEvents";
import type { RowEditingState } from "../editing/rowEditing";
import { useCellSaveState } from "../editing/saveState";
import { useCellEditing } from "../editing/useCellEditing";
import { useEditValidation } from "../editing/validation";
import type { ComposedTableProps } from "../props";
import { BATCH_EDIT_BAR_RENDER } from "./barRegions";
import { BATCH_EDITING_RENDERS } from "./batchEditingStage";
import { BATCH_EDITING_STAGE, ROW_EDITING_STAGE } from "./editingStageKeys";
import { featureHostOf } from "./featureHost";
import { FeatureSlot, slotRender, useFeatureSlotFilled } from "./providers";
import { ROW_EDITING_RENDERS } from "./rowEditingStage";
import {
  type ChromeExtraDraw,
  type ChromeExtraSlotProps,
  EDITING_LIVE,
} from "./slotKeys";
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
  onDirtyChange: ComposedTableProps<unknown>["onDirtyChange"],
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

/** The shared editing pieces the units' state joins into one bundle. */
interface EditingAssemblyProps<TRow> extends ChromeExtraSlotProps<TRow> {
  readonly lifecycle: EditLifecycle<TRow>;
  readonly cellEditingState: ReturnType<typeof useCellEditing<TRow>>;
  readonly conflict: EditConflictState<unknown>;
  readonly validation: ReturnType<typeof useEditValidation<TRow>>;
  readonly saving: ReturnType<typeof useCellSaveState<TRow>>;
  readonly dirty: ReturnType<typeof dirtyMarkerView>;
  readonly armed: boolean;
  readonly editingRows: readonly TRow[];
  readonly rowEditing: RowEditingState<unknown> | undefined;
  readonly batch: BatchEditingState<unknown> | undefined;
}

function EditingAssembly<TRow>({
  chrome,
  props,
  children,
  lifecycle,
  cellEditingState,
  conflict,
  validation,
  saving,
  dirty,
  armed,
  editingRows,
  rowEditing,
  batch,
}: EditingAssemblyProps<TRow>): ReactNode {
  const onCellEdit = props.onCellEdit;
  const editing = useMemo(
    () =>
      armed
        ? {
            onCellEdit,
            state: cellEditingState,
            validation,
            saving,
            dirty,
            rowEditing,
            rowEditIcons: props.rowEditIcons,
            batch,
            lifecycle,
            conflict,
            conflictLabels: {
              message: chrome.table.labels.editConflict,
              keepMine: chrome.table.labels.keepMine,
              takeTheirs: chrome.table.labels.takeTheirs,
              theirsValue: chrome.table.labels.theirsValue,
            },
            featureHost: featureHostOf(props),
            activation: props.editActivation,
          }
        : undefined,
    [
      armed,
      onCellEdit,
      cellEditingState,
      validation,
      saving,
      dirty,
      rowEditing,
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

  return children({ ...chrome, editing, editingRows } as never);
}

function LiveEditing<TRow>({
  chrome,
  props,
  children,
}: ChromeExtraSlotProps<TRow>): ReactNode {
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
  const validation = useEditValidation({
    validateRow: props.validateRow,
    applyEdit: props.applyEdit,
  });
  const saving = useCellSaveState({
    onRollback: props.onEditRollback,
    formatError: props.formatEditError,
    onEditError: lifecycle.onEditError,
  });
  const armed = resolveEditingArming(props);
  const tracked = useDirtyCells({ enabled: armed.trackDirty });
  useReportDirty(props.onDirtyChange, tracked);
  const markers = armed.dirtyMarkers;
  const dirty = useMemo(
    () => dirtyMarkerView(tracked, markers),
    [tracked, markers]
  );

  const editingRows = useMemo(() => {
    if (!chrome.grouping) return chrome.source.rows;
    const leaves: TRow[] = [];
    for (const entry of chrome.grouping.entries) {
      if (entry.kind === "row") leaves.push(entry.row);
    }
    return leaves;
  }, [chrome.grouping, chrome.source.rows]);

  // Row and batch editing run their own stages when composed; a table with
  // only cell editing renders neither.
  const rowStage = useFeatureSlotFilled(ROW_EDITING_STAGE);
  const batchStage = useFeatureSlotFilled(BATCH_EDITING_STAGE);
  const unit = {
    props: props as ComposedTableProps<unknown>,
    columns: chrome.allColumns as readonly EditableColumnLike<unknown>[],
    lifecycle: lifecycle as EditLifecycle<unknown>,
    conflict: conflict,
    rows: editingRows,
  };
  const assemble = (
    rowEditing: RowEditingState<unknown> | undefined,
    batch: BatchEditingState<unknown> | undefined
  ): ReactNode => (
    <EditingAssembly
      chrome={chrome}
      props={props}
      lifecycle={lifecycle}
      cellEditingState={cellEditingState}
      conflict={conflict}
      validation={validation}
      saving={saving}
      dirty={dirty}
      armed={armed.any}
      editingRows={editingRows}
      rowEditing={rowEditing}
      batch={batch}
    >
      {children}
    </EditingAssembly>
  );
  const withBatch = (rowEditing: RowEditingState<unknown> | undefined) =>
    batchStage ? (
      <FeatureSlot
        slot={BATCH_EDITING_STAGE}
        props={{
          ...unit,
          enabled: armed.batch,
          children: (batch) => assemble(rowEditing, batch),
        }}
      />
    ) : (
      assemble(rowEditing, undefined)
    );
  return rowStage ? (
    <FeatureSlot
      slot={ROW_EDITING_STAGE}
      props={{ ...unit, enabled: armed.row, children: withBatch }}
    />
  ) : (
    withBatch(undefined)
  );
}

const editingRender = slotRender<ChromeExtraDraw>(EDITING_LIVE, (props) => (
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
    ...coreEditing(onCellEdit, extras),
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
    ...coreRowEditing(onRowEdit, extras),
    renders: [editingRender, ...ROW_EDITING_RENDERS],
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
    ...coreBatchEditing(onBatchEdit, extras),
    renders: [editingRender, ...BATCH_EDITING_RENDERS, BATCH_EDIT_BAR_RENDER],
  };
}

/**
 * Mark cells and rows that have unsaved edits.
 *
 * @public
 */
export function dirtyIndicators(): StaticTableFeature {
  return {
    ...coreDirtyIndicators(),
    renders: [editingRender],
  };
}

export type { BatchRowEdit } from "../editing/batchEditing";
