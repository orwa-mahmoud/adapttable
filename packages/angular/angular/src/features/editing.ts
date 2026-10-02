/**
 * Editing feature factories for Angular: cell, row and batch editing, and
 * the marks on unsaved edits, over core's binding factories.
 */
import type {
  EditConflictHandler,
  EditConflictPolicy,
  EditEventHandler,
  RowValidator,
} from "@adapttable/core";
import {
  coreBatchEditing,
  coreDirtyIndicators,
  coreEditing,
  coreRowEditing,
} from "@adapttable/core/binding";

import type { DirtyEdits } from "../editing/dirtyCells";
import type {
  BatchEditHandler,
  CellEditHandler,
  RowEditHandler,
} from "../editing/editing";
import type { AdaptTableFeature } from "../featureHost";

/**
 * Lifecycle observers a host may pass to {@link editing}.
 *
 * @public
 */
export interface EditingLifecycleExtras<TRow = unknown> {
  /** Unsaved-edit count and confirmation operations, on mount and on change. */
  readonly onDirtyChange?: (dirty: DirtyEdits) => void;
  /** An editor opened. */
  readonly onEditStart?: EditEventHandler<TRow>;
  /** A commit reached the host. */
  readonly onEditCommit?: EditEventHandler<TRow>;
  /** The reader threw the draft away. */
  readonly onEditCancel?: EditEventHandler<TRow>;
  /** A validator refused a commit, leaving the editor open. */
  readonly onValidationFail?: EditEventHandler<TRow>;
  /** A host save promise rejected. */
  readonly onEditError?: EditEventHandler<TRow>;
  /** Localized explanation of a rejected save. */
  readonly formatEditError?: (error: unknown) => string;
  /** Restore the previous row value after a rejected save. */
  readonly onEditRollback?: (previous: TRow, columnKey: string) => void;
  /** Validate the proposed whole row before committing a cell. */
  readonly validateRow?: RowValidator<TRow>;
  /** Build a proposed row for whole-row validation without mutating it. */
  readonly applyEdit?: (row: TRow, columnKey: string, value: unknown) => TRow;
  /** Optional whole-row version used to detect incoming changes. */
  readonly rowVersion?: (row: TRow) => string | number;
  /** Default resolution for incoming changes under a draft. */
  readonly editConflictPolicy?: EditConflictPolicy;
  /** Host resolution, taking precedence over the default policy. */
  readonly onEditConflict?: EditConflictHandler<TRow>;
  /** Extra patch fields merged into the feature. */
  readonly [key: string]: unknown;
}

/**
 * A cell-editing feature that also carries the host's write.
 */
interface EditingFeature<TRow> extends AdaptTableFeature {
  readonly onCellEdit: CellEditHandler<TRow>;
}

/**
 * Edit a single cell in place.
 *
 * @param onCellEdit - The host's write for a committed edit.
 * @param extras - Optional lifecycle observers merged into the feature patch;
 *   {@link injectCellEditing} reads `onEditStart` / `onEditCancel`, and the
 *   editing bundle's lifecycle carries `onEditCommit`.
 * @returns The feature.
 *
 * @public
 */
export function editing<TRow>(
  onCellEdit: CellEditHandler<TRow>,
  extras: EditingLifecycleExtras<TRow> = {}
): AdaptTableFeature {
  return {
    ...coreEditing(onCellEdit, extras),
    onCellEdit,
  } as EditingFeature<TRow>;
}

/**
 * Edit a whole row at once.
 *
 * @param onRowEdit - The host's write for a committed row patch.
 * @param extras - Optional lifecycle observers merged into the feature patch.
 * @returns The feature.
 *
 * @public
 */
export function rowEditing<TRow>(
  onRowEdit: RowEditHandler<TRow>,
  extras: Record<string, unknown> = {}
): AdaptTableFeature {
  return coreRowEditing(onRowEdit, extras);
}

/**
 * Collect edits and save them in one batch.
 *
 * @param onBatchEdit - The host's write for every pending row.
 * @param extras - Optional lifecycle observers merged into the feature patch.
 * @returns The feature.
 *
 * @public
 */
export function batchEditing<TRow>(
  onBatchEdit: BatchEditHandler<TRow>,
  extras: Record<string, unknown> = {}
): AdaptTableFeature {
  return coreBatchEditing(onBatchEdit, extras);
}

/**
 * Marks on the cells and rows that hold unsaved edits.
 *
 * @returns The feature.
 *
 * @public
 */
export function dirtyIndicators(): AdaptTableFeature {
  return coreDirtyIndicators();
}

export type {
  BatchEditHandler,
  CellEditHandler,
  RowEditHandler,
} from "../editing/editing";
