import type { BulkAction, StaticTableFeature } from "@adapttable/vue";
import {
  BULK_ACTIONS_CONTROL,
  BulkActionsChrome,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import { bulkActions as bindingBulkActions } from "@adapttable/vue/features";

import { antdActionSlots } from "./actions/antdActionSlots";

export function bulkActions(
  actions: readonly BulkAction[]
): StaticTableFeature {
  return extendFeature(bindingBulkActions(actions), [
    slotRender(BULK_ACTIONS_CONTROL, (props) =>
      BulkActionsChrome({ ...props, slots: antdActionSlots })
    ),
  ]);
}
export type { BulkAction, BulkActionContext } from "@adapttable/vue";
