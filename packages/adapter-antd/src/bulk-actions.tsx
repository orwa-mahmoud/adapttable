import {
  BULK_BAR,
  extendFeature,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import {
  type BulkAction,
  bulkActions as core,
} from "@adapttable/core/features";

import { BulkBar } from "./components/BulkActionBar";

function BulkSlot(props: Parameters<typeof BulkBar>[0]) {
  return <BulkBar {...props} />;
}

export function bulkActions<TRow>(
  actions: readonly BulkAction[]
): TableFeature<TRow> {
  return extendFeature(core<TRow>(actions), [
    slotRender(BULK_BAR, (props) => <BulkSlot {...props} />),
  ]);
}
