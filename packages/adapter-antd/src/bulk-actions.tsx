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

import { BulkBar } from "./components/BulkActionBar";

function BulkSlot(props: Parameters<typeof BulkBar>[0]) {
  return <BulkBar {...props} />;
}

export function bulkActions(
  actions: readonly BulkAction[]
): StaticTableFeature {
  return extendFeature(core(actions), [
    slotRender(BULK_BAR, (props) => <BulkSlot {...props} />),
  ]);
}
