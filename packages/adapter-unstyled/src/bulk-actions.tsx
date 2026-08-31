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
import { useClassNames } from "./components/classNamesContext";

import { BulkBar } from "./components/BulkActionBar";

function BulkSlot(props: Omit<Parameters<typeof BulkBar>[0], "classNames">) {
  const classNames = useClassNames();
  return <BulkBar {...props} classNames={classNames} />;
}

export function bulkActions<TRow>(
  actions: readonly BulkAction[]
): TableFeature<TRow> {
  return extendFeature(core<TRow>(actions), [
    slotRender(BULK_BAR, (props) => <BulkSlot {...props} />),
  ]);
}
