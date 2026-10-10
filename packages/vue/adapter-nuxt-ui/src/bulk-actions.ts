import type { StaticTableFeature } from "@adapttable/vue";
import {
  BULK_ACTIONS_CONTROL,
  BulkActionsChrome,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import { bulkActions as bindingBulkActions } from "@adapttable/vue/features";
import { h } from "vue";

import { nuxtButton } from "./controls/button";

export function bulkActions(
  actions: Parameters<typeof bindingBulkActions>[0]
): StaticTableFeature {
  return extendFeature(bindingBulkActions(actions), [
    slotRender(BULK_ACTIONS_CONTROL, (props) =>
      h(BulkActionsChrome, { ...props, slots: { Button: nuxtButton } })
    ),
  ]);
}
