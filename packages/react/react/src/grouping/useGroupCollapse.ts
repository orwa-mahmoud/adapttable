import {
  groupCollapseActions,
  type GroupCollapseState,
  idSetReader,
} from "@adapttable/core/binding";
import { useCallback, useMemo, useState } from "react";

import { useControllableStore } from "../hooks/useControllableStore";
export type { GroupCollapseState } from "@adapttable/core/binding";

/**
 * Headless collapse state for row groups, at any depth. Ephemeral — not
 * URL-synced. Groups default to expanded (empty set).
 *
 * @public
 */
export function useGroupCollapse(controlled?: {
  collapsedGroupIds?: readonly string[];
  onCollapsedGroupIdsChange?: (ids: string[]) => void;
}): GroupCollapseState {
  const [readIds] = useState(idSetReader);
  const onCollapsedGroupIdsChange = controlled?.onCollapsedGroupIdsChange;
  // The store's mutators are stable, so an action here never changes with the
  // options object the caller passes fresh every render — which would rebuild
  // the whole grouped model on a keystroke unrelated to grouping.
  const [collapsedGroupIds, store] = useControllableStore<ReadonlySet<string>>(
    () => new Set(),
    {
      value: readIds(controlled?.collapsedGroupIds),
      onChange:
        onCollapsedGroupIdsChange &&
        ((next) => onCollapsedGroupIdsChange([...next])),
    }
  );

  const isCollapsed = useCallback(
    (groupKey: string) => collapsedGroupIds.has(groupKey),
    [collapsedGroupIds]
  );

  const [{ toggle, expandAll, collapseAll, collapseToDepth }] = useState(() =>
    groupCollapseActions(store)
  );

  return useMemo(
    () => ({
      collapsedGroupIds,
      isCollapsed,
      toggle,
      expandAll,
      collapseAll,
      collapseToDepth,
    }),
    [
      collapsedGroupIds,
      isCollapsed,
      toggle,
      expandAll,
      collapseAll,
      collapseToDepth,
    ]
  );
}
