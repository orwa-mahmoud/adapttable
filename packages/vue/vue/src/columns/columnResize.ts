/** Resize interaction ownership belongs to the feature's mounted Vue scope. */
import { columnResizeHandleProps } from "@adapttable/core";
import { DESKTOP_RESIZE_HANDLE_STYLE } from "@adapttable/core/binding";
import { watch } from "vue";

import { toVueAttrs } from "../attrs";
import type { FeatureMountContext } from "../features/tableFeature";
import { COLUMN_RESIZE_MODEL } from "../layout/modelChannels";
export type {
  ColumnResizeHandleOptions,
  ColumnResizeHandleProps,
} from "@adapttable/core";
/** The neutral resize engine owns pointer mechanics; this scope revokes it. */
export function mountColumnResize<TRow>(
  context: FeatureMountContext<TRow>
): void {
  watch(
    [
      context.active,
      () => context.table.allColumns.value,
      () => context.table.source.value.tableEngine,
    ],
    (_current, _previous, onCleanup) => {
      if (!context.active.value) {
        context.state.set(COLUMN_RESIZE_MODEL, undefined);
        return;
      }
      const controller = new AbortController();
      onCleanup(() => controller.abort());
      const setWidth = (column: string, width: number): void => {
        if (controller.signal.aborted || !context.active.value) return;
        const present = context.table.allColumns.value.some(
          (item) => item.key === column
        );
        if (present) context.table.layout.value.setWidth(column, width);
      };
      context.state.set(COLUMN_RESIZE_MODEL, {
        attrs: (key, label) =>
          toVueAttrs({
            ...columnResizeHandleProps(key, setWidth, label, {
              signal: controller.signal,
            }),
            "data-adapttable-part": "resize-handle",
            style: DESKTOP_RESIZE_HANDLE_STYLE,
          }),
      });
    },
    { immediate: true, flush: "sync" }
  );
}
