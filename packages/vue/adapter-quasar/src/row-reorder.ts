import type {
  RowReorderHandler,
  RowReorderOptions,
  TableFeature,
} from "@adapttable/vue";
import {
  extendFeature,
  RowReorderChrome,
  rowReorderControlKey,
  slotRender,
} from "@adapttable/vue/adapter";
import { rowReorder as bindingRowReorder } from "@adapttable/vue/features";
import type { MaybeRefOrGetter } from "vue";

import { quasarReorderSlots } from "./reorder/controls";

export function rowReorder<TRow>(
  onRowReorder: RowReorderHandler<TRow>,
  options?: MaybeRefOrGetter<RowReorderOptions<TRow> | undefined>
): TableFeature<TRow> {
  return extendFeature(bindingRowReorder(onRowReorder, options), [
    slotRender(rowReorderControlKey<TRow>(), (props) =>
      RowReorderChrome({ ...props, slots: quasarReorderSlots })
    ),
  ]);
}
export {
  type RowReorderHandler,
  type RowReorderOptions,
  useRowReorder,
} from "@adapttable/vue";
