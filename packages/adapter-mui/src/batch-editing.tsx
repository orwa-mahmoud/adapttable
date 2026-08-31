import {
  BATCH_EDIT_BAR,
  EDITABLE_CELL,
  extendFeature,
  ROW_EDIT_ACTIONS,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { batchEditing as core } from "@adapttable/core/features";

import { EditableDataCell } from "./components/EditableCell";
import { BatchEditBar, RowEditActions } from "./components/kitControls";

/**
 * Hold every edit until the reader saves, with MUI's own save and discard
 * buttons.
 *
 * @public
 */
export function batchEditing<TRow>(
  onBatchEdit: Parameters<typeof core<TRow>>[0]
): TableFeature<TRow> {
  return extendFeature(core<TRow>(onBatchEdit), [
    slotRender(EDITABLE_CELL, (props) => <EditableDataCell {...props} />),
    slotRender(ROW_EDIT_ACTIONS, (props) => <RowEditActions {...props} />),
    slotRender(BATCH_EDIT_BAR, (props) => <BatchEditBar {...props} />),
  ]);
}
