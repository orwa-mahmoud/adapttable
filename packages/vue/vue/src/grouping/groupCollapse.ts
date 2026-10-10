import { groupCollapseActions } from "@adapttable/core";
import type { GroupCollapseState } from "@adapttable/core/binding";
import {
  computed,
  type ComputedRef,
  type MaybeRefOrGetter,
  toValue,
} from "vue";

import { useHierarchyIds } from "../hierarchy/idState";
import type { MaybeRefOrGetterOptional } from "../store";
export interface GroupCollapseOptions {
  readonly collapsedGroupIds?: MaybeRefOrGetterOptional<readonly string[]>;
  readonly defaultCollapsedGroupIds?: readonly string[];
  readonly onCollapsedGroupIdsChange?: (ids: string[]) => void;
  readonly enabled?: MaybeRefOrGetter<boolean>;
}
/** A reactive controlled pair; omitted ids retain scope-local state. @public */
export function useGroupCollapse(
  input: MaybeRefOrGetter<GroupCollapseOptions> = {}
): ComputedRef<GroupCollapseState> {
  const state = useHierarchyIds(() => {
    const value = toValue(input);
    return {
      ids: value.collapsedGroupIds,
      defaultIds: value.defaultCollapsedGroupIds,
      onChange: value.onCollapsedGroupIdsChange,
      enabled: value.enabled,
    };
  });
  const actions = groupCollapseActions(state.store);
  return computed(() => ({
    collapsedGroupIds: state.ids.value,
    isCollapsed: (id) => state.ids.value.has(id),
    toggle: (id) => {
      state.run(() => actions.toggle(id));
    },
    expandAll: () => {
      state.run(actions.expandAll);
    },
    collapseAll: (ids) => {
      state.run(() => actions.collapseAll(ids));
    },
    collapseToDepth: (depth, groups) => {
      state.run(() => actions.collapseToDepth(depth, groups));
    },
  }));
}
export type { GroupCollapseState } from "@adapttable/core/binding";
