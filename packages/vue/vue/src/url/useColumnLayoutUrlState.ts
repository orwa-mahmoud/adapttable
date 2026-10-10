/** Explicit URL persistence for the host-controlled column layout. */
import { columnLayoutSlice, type ColumnLayoutState } from "@adapttable/core";
import { type MaybeRefOrGetter, toValue } from "vue";

import type { MaybeRefOrGetterOptional } from "../store";
import { type UrlSliceOptions, useUrlSlice } from "./useUrlSlice";

export { URL_SLICE_WRITE_DEBOUNCE_MS as LAYOUT_URL_WRITE_DEBOUNCE_MS } from "@adapttable/core";

/** Reactive destination and default for a table's column layout. @public */
export interface UseColumnLayoutUrlStateOptions extends UrlSliceOptions {
  readonly defaultColumnLayout?: MaybeRefOrGetterOptional<
    Partial<ColumnLayoutState>
  >;
}

/**
 * Bind `layout` and `onLayoutChange` to the table's `columnLayout` and
 * `update:columnLayout`. The table does not opt into persistence itself.
 * `flush` commits any pending resize before saving or applying a URL capture.
 * Component resources activate after mount and suspend during KeepAlive.
 * @public
 */
export function useColumnLayoutUrlState(
  input: MaybeRefOrGetter<UseColumnLayoutUrlStateOptions> = {},
  activity?: MaybeRefOrGetter<boolean>
) {
  const slice = useUrlSlice(
    input,
    columnLayoutSlice,
    () => ({
      defaultColumnLayout: toValue(toValue(input).defaultColumnLayout),
    }),
    activity
  );
  return {
    layout: slice.value,
    onLayoutChange: slice.set,
    flush: slice.flush,
  };
}

/** Destructurable layout ref and stable persistence actions. @public */
export type UseColumnLayoutUrlStateResult = ReturnType<
  typeof useColumnLayoutUrlState
>;
