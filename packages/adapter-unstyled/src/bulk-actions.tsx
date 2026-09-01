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
import { useClassNames } from "./components/classNamesContext";

function BulkSlot(
  props: Readonly<Omit<Parameters<typeof BulkBar>[0], "classNames">>
) {
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
