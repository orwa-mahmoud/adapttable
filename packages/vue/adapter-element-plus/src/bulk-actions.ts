import type { BulkAction, StaticTableFeature } from "@adapttable/vue";
import {
  BULK_ACTIONS_CONTROL,
  BulkActionsChrome,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import { bulkActions as bindingBulkActions } from "@adapttable/vue/features";

import { elementActionSlots } from "./actions/elementActionSlots";

export function bulkActions(
  actions: readonly BulkAction[]
): StaticTableFeature {
  return extendFeature(bindingBulkActions(actions), [
    slotRender(BULK_ACTIONS_CONTROL, (props) =>
      BulkActionsChrome({ ...props, slots: elementActionSlots })
    ),
  ]);
}
export type { BulkAction, BulkActionContext } from "@adapttable/vue";
