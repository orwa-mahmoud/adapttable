import {
  BULK_BAR,
  extendFeature,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { bulkActions as core } from "@adapttable/core/features";
import type { BulkAction } from "@adapttable/core/features";

import { BulkBar } from "./components/BulkActionBar";

/**
 * Actions that run against the selected rows, drawn with MUI's own bar.
 *
 * Concatenate onto the core live render — replacing `renders` would drop
 * {@link SELECTION_LIVE}.
 *
 * @public
 */
export function bulkActions<TRow>(
  actions: readonly BulkAction[]
): TableFeature<TRow> {
  return extendFeature(core<TRow>(actions), [
    slotRender(BULK_BAR, (props) => <BulkBar {...props} />),
  ]);
}
