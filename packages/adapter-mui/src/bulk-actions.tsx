import {
  BULK_BAR,
  extendFeature,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/core/adapter";
import type { BulkAction } from "@adapttable/core/features";
import { bulkActions as core } from "@adapttable/core/features";

import { BulkBar } from "./components/BulkActionBar";

/**
 * Actions that run against the selected rows, drawn with MUI's own bar.
 *
 * Concatenate onto the core live render — replacing `renders` would drop
 * {@link SELECTION_LIVE}.
 *
 * @public
 */
export function bulkActions(
  actions: readonly BulkAction[]
): StaticTableFeature {
  return extendFeature(core(actions), [
    slotRender(BULK_BAR, (props) => <BulkBar {...props} />),
  ]);
}
