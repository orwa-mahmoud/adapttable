import type {
  RowAction,
  RowMutationHandlers,
  TableFeature,
} from "@adapttable/vue";
import { extendFeature, slotRender } from "@adapttable/vue/adapter";
import { rowActions as bindingRowActions } from "@adapttable/vue/features";
import { h } from "vue";

import { RekaRowActions } from "./controls/RekaRowActions";
import { rowActionsControlKey } from "./rowActionsSlot";

/** The host owns actions; the kit contributes their optional native presentation. */
export function rowActions<TRow>(
  actions?: readonly RowAction<TRow>[],
  handlers?: RowMutationHandlers<TRow>
): TableFeature<TRow> {
  return extendFeature(bindingRowActions(actions, handlers), [
    slotRender(rowActionsControlKey<TRow>(), (props) =>
      h(RekaRowActions<TRow>, props)
    ),
  ]);
}
