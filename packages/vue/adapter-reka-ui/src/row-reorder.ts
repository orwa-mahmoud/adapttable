import type {
  RowReorderHandler,
  RowReorderOptions,
  TableFeature,
} from "@adapttable/vue";
import {
  extendFeature,
  rowReorderControlKey,
  slotRender,
} from "@adapttable/vue/adapter";
import { rowReorder as bindingRowReorder } from "@adapttable/vue/features";
import { h } from "vue";

import RowReorder from "./reorder/RowReorder.vue";

export function rowReorder<TRow>(
  onRowReorder: RowReorderHandler<TRow>,
  options?: RowReorderOptions<TRow>
): TableFeature<TRow> {
  return extendFeature(bindingRowReorder(onRowReorder, options), [
    slotRender(rowReorderControlKey<TRow>(), (props) =>
      h(RowReorder<TRow>, { ...props })
    ),
  ]);
}
export {
  type RowReorderHandler,
  type RowReorderOptions,
  useRowReorder,
} from "@adapttable/vue";
