import {
  BATCH_EDIT_BAR,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { batchEditing as core } from "@adapttable/core/features";

import { BatchEditBar } from "./components/kitControls";

/**
 * Hold every edit until the reader saves, with MUI's own save and discard
 * buttons.
 *
 * @public
 */
export function batchEditing<TRow>(
  onBatchEdit: Parameters<typeof core<TRow>>[0]
): TableFeature<TRow> {
  return {
    ...core<TRow>(onBatchEdit),
    renders: [
      slotRender(BATCH_EDIT_BAR, (props) => <BatchEditBar {...props} />),
    ],
  };
}
