import {
  BULK_BAR,
  extendFeature,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/react/adapter";
import {
  type BulkAction,
  bulkActions as core,
} from "@adapttable/react/features";

import { BulkBar } from "./components/BulkActionBar";

function BulkSlot(props: Parameters<typeof BulkBar>[0]) {
  return <BulkBar {...props} />;
}

/**
 * Actions that run against the selected rows, drawn with Radix UI's own bar.
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
