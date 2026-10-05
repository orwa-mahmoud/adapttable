import {
  extendFeature,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/vue/adapter";
import {
  BULK_ACTIONS_CONTROL,
  bulkActions as bindingBulkActions,
  BulkActionsChrome,
} from "@adapttable/vue/bulk-actions";
import { h } from "vue";

import { nativeActionButton } from "./actions/nativeControls";
export function bulkActions(
  actions: Parameters<typeof bindingBulkActions>[0]
): StaticTableFeature {
  return extendFeature(bindingBulkActions(actions), [
    slotRender(BULK_ACTIONS_CONTROL, (props) =>
      h(BulkActionsChrome, { ...props, slots: { Button: nativeActionButton } })
    ),
  ]);
}
export type * from "@adapttable/vue/bulk-actions";
