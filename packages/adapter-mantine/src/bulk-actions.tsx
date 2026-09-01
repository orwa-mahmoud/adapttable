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

export function bulkActions(
  actions: readonly BulkAction[]
): StaticTableFeature {
  return extendFeature(core(actions), [
    slotRender(BULK_BAR, (props) => <BulkSlot {...props} />),
  ]);
}
