import {
  BULK_BAR,
  extendFeature,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/core/adapter";
import {
  type BulkAction,
  bulkActions as core,
} from "@adapttable/core/features";

import { BulkActionBar } from "./components/BulkActionBar";

function BulkSlot(props: Parameters<typeof BulkActionBar>[0]) {
  return <BulkActionBar {...props} />;
}

/**
 * Actions that run against the selected rows, drawn with Mantine's own bar.
 *
 * Concatenate onto the core live render — replacing `renders` would drop
 * `SELECTION_LIVE`.
 *
 * @public
 */
export function bulkActions(
  actions: readonly BulkAction[]
): StaticTableFeature {
  return extendFeature(core(actions), [
    slotRender(BULK_BAR, (props) => <BulkSlot {...props} />),
  ]);
}
