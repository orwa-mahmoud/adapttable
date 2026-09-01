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
import { useClassNames } from "./components/classNamesContext";

function BulkSlot(
  props: Readonly<Omit<Parameters<typeof BulkBar>[0], "classNames">>
) {
  const classNames = useClassNames();
  return <BulkBar {...props} classNames={classNames} />;
}

export function bulkActions(
  actions: readonly BulkAction[]
): StaticTableFeature {
  return extendFeature(core(actions), [
    slotRender(BULK_BAR, (props) => <BulkSlot {...props} />),
  ]);
}
