import {
  BULK_BAR,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { bulkActions as core } from "@adapttable/core/features";
import type { BulkAction } from "@adapttable/core/features";

import { BulkBar } from "./components/BulkActionBar";

/**
 * Actions that run against the selected rows, drawn with MUI's own bar.
 *
 * @public
 */
export function bulkActions<TRow>(
  actions: readonly BulkAction[]
): TableFeature<TRow> {
  return {
    ...core<TRow>(actions),
    renders: [slotRender(BULK_BAR, (props) => <BulkBar {...props} />)],
  };
}
