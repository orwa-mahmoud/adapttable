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

/**
 * Actions that run against the selected rows, drawn with native controls bar.
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
