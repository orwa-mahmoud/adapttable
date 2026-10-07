import type { StaticTableFeature } from "@adapttable/vue";
import {
  BULK_ACTIONS_CONTROL,
  BulkActionsChrome,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import { bulkActions as bindingBulkActions } from "@adapttable/vue/features";

import { vuetifyActionButton } from "./actions/button";

export function bulkActions(
  actions: Parameters<typeof bindingBulkActions>[0]
): StaticTableFeature {
  return extendFeature(bindingBulkActions(actions), [
    slotRender(BULK_ACTIONS_CONTROL, (props) =>
      BulkActionsChrome({ ...props, slots: { Button: vuetifyActionButton } })
    ),
  ]);
}
export type { BulkAction, BulkActionContext } from "@adapttable/vue";
