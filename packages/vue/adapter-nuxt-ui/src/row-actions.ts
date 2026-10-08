import type {
  RowAction,
  RowMutationHandlers,
  TableFeature,
} from "@adapttable/vue";
import { extendFeature, slotRender } from "@adapttable/vue/adapter";
import { rowActions as bindingRowActions } from "@adapttable/vue/features";
import { h } from "vue";

import { NuxtRowActions } from "./NuxtRowActions";
import { rowActionsControlKey } from "./rowActionsSlot";

/** The host owns actions; the kit contributes their Nuxt UI presentation. */
export function rowActions<TRow>(
  actions?: readonly RowAction<TRow>[],
  handlers?: RowMutationHandlers<TRow>
): TableFeature<TRow> {
  return extendFeature(bindingRowActions(actions, handlers), [
    slotRender(rowActionsControlKey<TRow>(), (props) =>
      h(NuxtRowActions<TRow>, props)
    ),
  ]);
}
