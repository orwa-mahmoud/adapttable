/**
 * The slots row and batch editing fill inside the editing stage.
 *
 * Cell editing runs the shared machinery — lifecycle, validation, save state,
 * dirty marks and conflicts. Row and batch editing each add one hook, the
 * conflict check for their unit and the cell they draw, and fill these slots
 * with them, so a table that composes only cell editing carries neither.
 */
import type { EditableColumnLike, EditConflictState } from "@adapttable/core";
import { featureSlotKey } from "@adapttable/core/binding";
import type { ReactNode } from "react";

import type { BatchEditingState } from "../editing/batchEditing";
import type { EditLifecycle } from "../editing/editingEvents";
import type {
  BatchEditCellProps,
  RowEditCellProps,
} from "../editing/RowEditGate";
import type { RowEditingState } from "../editing/rowEditing";
import type { ComposedTableProps } from "../props";

/**
 * What the editing stage hands a unit's stage: the table's props and columns,
 * the shared lifecycle and conflict state, and the rows edits apply to.
 */
export interface EditUnitStageProps<TUnit> {
  /** Whether the unit is armed for this table. */
  readonly enabled: boolean;
  /** The table's props, features applied. */
  readonly props: ComposedTableProps<unknown>;
  /** Every column, hidden ones included. */
  readonly columns: readonly EditableColumnLike<unknown>[];
  /** The shared edit lifecycle callbacks. */
  readonly lifecycle: EditLifecycle<unknown>;
  /** The shared conflict state. */
  readonly conflict: EditConflictState<unknown>;
  /** The rows edits apply to (leaf rows when grouped). */
  readonly rows: readonly unknown[];
  /** Renders the rest of the stage with the unit's state. */
  readonly children: (unit: TUnit | undefined) => ReactNode;
}

/** Row editing's stage: its form state and its conflict check. */
export const ROW_EDITING_STAGE = featureSlotKey<
  EditUnitStageProps<RowEditingState<unknown>>
>("row-editing-stage", { single: true });

/** Batch editing's stage: its staged edits and their conflict check. */
export const BATCH_EDITING_STAGE = featureSlotKey<
  EditUnitStageProps<BatchEditingState<unknown>>
>("batch-editing-stage", { single: true });

/** A cell inside a row form. */
export const ROW_EDIT_CELL = featureSlotKey<RowEditCellProps<unknown>>(
  "row-edit-cell",
  { single: true }
);

/** A cell inside a batch. */
export const BATCH_EDIT_CELL = featureSlotKey<BatchEditCellProps<unknown>>(
  "batch-edit-cell",
  { single: true }
);
