import {
  extendFeature,
  rowReorderControlKey,
  slotRender,
} from "@adapttable/vue/adapter";
import type {
  RowReorderHandler,
  RowReorderOptions,
  TableFeature,
} from "@adapttable/vue";
import { rowReorder as bindingRowReorder } from "@adapttable/vue/features";
import { h } from "vue";

import NativeRowReorder from "./reorder/NativeRowReorder.vue";
export {
  type RowReorderHandler,
  type RowReorderOptions,
  useRowReorder,
} from "@adapttable/vue";
export function rowReorder<TRow>(
  onRowReorder: RowReorderHandler<TRow>,
  options?: RowReorderOptions<TRow>
): TableFeature<TRow> {
  return extendFeature(bindingRowReorder(onRowReorder, options), [
    slotRender(rowReorderControlKey<TRow>(), (props) =>
      h(NativeRowReorder<TRow>, { ...props })
    ),
  ]);
}
