/**
 * Batch editing — `@adapttable/clarity/batch-editing`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  BATCH_EDIT_BAR,
  type BatchEditHandler,
  batchEditing as coreAngularBatchEditing,
  EDITABLE_CELL,
  extendFeature,
  ROW_EDIT_ACTIONS,
  slotRender,
} from "@adapttable/angular";
import { AdaptEditableCell } from "@adapttable/clarity";
import { AdaptRowEditActions } from "@adapttable/clarity/editing";

import { AdaptBatchEditBar } from "./batchEditBar";

/**
 * Collect edits and save them in one batch.
 *
 * @param onBatchEdit - Called with every pending row at once.
 * @param extras - Optional lifecycle observers merged into the patch.
 *
 * @public
 */
export function batchEditing<TRow>(
  onBatchEdit: BatchEditHandler<TRow>,
  extras: Record<string, unknown> = {}
): AdaptTableFeature {
  return extendFeature(coreAngularBatchEditing(onBatchEdit, extras), [
    slotRender(EDITABLE_CELL, () => AdaptEditableCell),
    slotRender(ROW_EDIT_ACTIONS, () => AdaptRowEditActions),
    slotRender(BATCH_EDIT_BAR, () => AdaptBatchEditBar),
  ]);
}

export { AdaptBatchEditBar } from "./batchEditBar";
