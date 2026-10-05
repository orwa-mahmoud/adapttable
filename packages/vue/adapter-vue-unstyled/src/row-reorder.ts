import {
  extendFeature,
  slotRender,
  type TableFeature,
} from "@adapttable/vue/adapter";
import {
  rowReorder as bindingRowReorder,
  rowReorderControlKey,
  type RowReorderHandler,
  type RowReorderOptions,
} from "@adapttable/vue/features";
import { h } from "vue";

import NativeRowReorder from "./reorder/NativeRowReorder.vue";
export {
  type RowReorderHandler,
  type RowReorderOptions,
  useRowReorder,
} from "@adapttable/vue/features";
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
