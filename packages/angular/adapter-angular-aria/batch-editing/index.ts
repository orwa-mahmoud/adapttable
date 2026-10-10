/**
 * Batch editing — `@adapttable/angular-aria/batch-editing`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  type BatchEditHandler,
  extendFeature,
  slotRender,
} from "@adapttable/angular";
import {
  BATCH_EDIT_BAR,
  EDITABLE_CELL,
  ROW_EDIT_ACTIONS,
} from "@adapttable/angular/adapter";
import { batchEditing as coreAngularBatchEditing } from "@adapttable/angular/features";
import { AdaptEditableCell } from "@adapttable/angular-aria";
import { AdaptRowEditActions } from "@adapttable/angular-aria/editing";

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
