/** The same neutral collapsed-group codec that URL links and Saved Views use. */
import { groupCollapseSlice } from "@adapttable/core";
import { computed, type MaybeRefOrGetter, type ShallowRef, toValue } from "vue";

import type { MaybeRefOrGetterOptional } from "../store";
import { type UrlSliceOptions, useUrlSlice } from "./useUrlSlice";
export interface UseGroupCollapseUrlStateOptions extends UrlSliceOptions {
  readonly defaultCollapsedGroupIds?: MaybeRefOrGetterOptional<
    readonly string[]
  >;
}
export interface UseGroupCollapseUrlStateResult {
  readonly collapsedGroupIds: Readonly<ShallowRef<string[]>>;
  readonly onCollapsedGroupIdsChange: (ids: string[]) => void;
}
/** Opt into serialized collapse state by passing this controlled pair to grouping. @public */
export function useGroupCollapseUrlState(
  input: MaybeRefOrGetter<UseGroupCollapseUrlStateOptions> = {},
  activity?: MaybeRefOrGetter<boolean>
): UseGroupCollapseUrlStateResult {
  const options = computed(() => toValue(input));
  const slice = useUrlSlice(
    options,
    groupCollapseSlice,
    () => ({
      defaultCollapsedGroupIds: toValue(options.value.defaultCollapsedGroupIds),
    }),
    activity
  );
  return {
    collapsedGroupIds: slice.value,
    onCollapsedGroupIdsChange: slice.set,
  };
}
