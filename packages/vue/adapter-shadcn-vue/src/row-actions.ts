import type {
  RowAction,
  RowMutationHandlers,
  TableFeature,
} from "@adapttable/vue";
import { extendFeature } from "@adapttable/vue/adapter";
import { rowActions as bindingRowActions } from "@adapttable/vue/features";

import { shadcnRowActionsRender } from "./rows/render";

export function rowActions<TRow>(
  actions?: readonly RowAction<TRow>[],
  handlers?: RowMutationHandlers<TRow>
): TableFeature<TRow> {
  return extendFeature(bindingRowActions(actions, handlers), [
    shadcnRowActionsRender,
  ]);
}
