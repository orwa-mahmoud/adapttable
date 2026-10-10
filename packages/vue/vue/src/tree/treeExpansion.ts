import { treeExpansionActions } from "@adapttable/core";
import type { TreeExpansionState } from "@adapttable/core/binding";
import {
  computed,
  type ComputedRef,
  type MaybeRefOrGetter,
  toValue,
} from "vue";

import { useHierarchyIds } from "../hierarchy/idState";
import type { MaybeRefOrGetterOptional } from "../store";
export interface TreeExpansionOptions {
  readonly expandedIds?: MaybeRefOrGetterOptional<readonly string[]>;
  readonly defaultExpandedIds?: readonly string[];
  readonly onExpandedIdsChange?: (ids: string[]) => void;
  readonly enabled?: MaybeRefOrGetter<boolean>;
}
/** Independent from detail expansion and group collapse. @public */
export function useTreeExpansion(
  input: MaybeRefOrGetter<TreeExpansionOptions> = {}
): ComputedRef<TreeExpansionState> {
  const state = useHierarchyIds(() => {
    const value = toValue(input);
    return {
      ids: value.expandedIds,
      defaultIds: value.defaultExpandedIds,
      onChange: value.onExpandedIdsChange,
      enabled: value.enabled,
    };
  });
  const actions = treeExpansionActions(state.store);
  return computed(() => ({
    expandedIds: state.ids.value,
    isExpanded: (id) => state.ids.value.has(id),
    toggle: (id) => {
      state.run(() => actions.toggle(id));
    },
    expand: (id) => {
      state.run(() => actions.expand(id));
    },
    expandAll: (ids) => {
      state.run(() => actions.expandAll(ids));
    },
    collapseAll: () => {
      state.run(actions.collapseAll);
    },
  }));
}
export type { TreeExpansionState } from "@adapttable/core/binding";
