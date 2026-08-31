import {
  BULK_BAR,
  extendFeature,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import {
  bulkActions as core,
  type BulkAction,
} from "@adapttable/core/features";

import { BulkActionBar } from "./components/BulkActionBar";

function BulkSlot(props: Parameters<typeof BulkActionBar>[0]) {
  return <BulkActionBar {...props} />;
}

export function bulkActions<TRow>(
  actions: readonly BulkAction[]
): TableFeature<TRow> {
  return extendFeature(core<TRow>(actions), [
    slotRender(BULK_BAR, (props) => <BulkSlot {...props} />),
  ]);
}
