import { toggleId } from "@adapttable/core";
import type { RowExpansionState } from "@adapttable/core/binding";
import {
  computed,
  type ComputedRef,
  type MaybeRefOrGetter,
  toValue,
} from "vue";

import { useHierarchyIds } from "../hierarchy/idState";
import type { MaybeRefOrGetterOptional } from "../store";
export interface RowExpansionOptions {
  readonly expandedRowIds?: MaybeRefOrGetterOptional<readonly string[]>;
  readonly defaultExpandedRowIds?: readonly string[];
  readonly onExpandedRowIdsChange?: (ids: string[]) => void;
  readonly enabled?: MaybeRefOrGetter<boolean>;
}
/** Stable row ids preserve open panels through sorting and paging. @public */
export function useRowExpansion(
  input: MaybeRefOrGetter<RowExpansionOptions> = {}
): ComputedRef<RowExpansionState> {
  const state = useHierarchyIds(() => {
    const value = toValue(input);
    return {
      ids: value.expandedRowIds,
      defaultIds: value.defaultExpandedRowIds,
      onChange: value.onExpandedRowIdsChange,
      enabled: value.enabled,
    };
  });
  const toggle = (id: string): void => {
    state.run(() => state.store.update((ids) => toggleId(ids, id)));
  };
  return computed(() => ({
    expandedIds: state.ids.value,
    isExpanded: (id) => state.ids.value.has(id),
    toggle,
  }));
}
export type { RowExpansionState } from "@adapttable/core/binding";
