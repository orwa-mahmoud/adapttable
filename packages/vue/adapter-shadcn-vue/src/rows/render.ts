import { slotRender } from "@adapttable/vue/adapter";
import { h } from "vue";

import { ShadcnRowActions } from "./RowActions";
import { rowActionsControlKey } from "./slot";

/** Row pinning and explicit actions share one optional native action surface. */
export const shadcnRowActionsRender = slotRender(
  rowActionsControlKey<unknown>(),
  (props) => h(ShadcnRowActions<unknown>, props)
);
