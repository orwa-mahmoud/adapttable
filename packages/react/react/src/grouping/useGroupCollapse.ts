import {
  groupsCollapsedToDepth,
  idSetReader,
  toggleId,
} from "@adapttable/core";
import { useCallback, useMemo, useState } from "react";

import { useControllableStore } from "../hooks/useControllableStore";

/**
 * Collapse state + actions returned by `useGroupCollapse`.
 *
 * @public
 */
export interface GroupCollapseState {
  /** Ids of currently collapsed groups (`group:…` keys). */
  collapsedGroupIds: ReadonlySet<string>;
  /** Whether a group is collapsed. */
  isCollapsed: (groupKey: string) => boolean;
  /** Toggle a group's collapsed state. */
  toggle: (groupKey: string) => void;
  /** Expand every group (clear the collapsed set). */
  expandAll: () => void;
  /** Collapse every group in `groupKeys`. */
  collapseAll: (groupKeys: readonly string[]) => void;
  /**
   * Show the tree down to `depth` and no further: every group at that depth or
   * deeper closes, everything above it opens. Depth 0 collapses the top level,
   * so only the outermost headers show.
   */
  collapseToDepth: (
    depth: number,
    groups: readonly { key: string; level: number }[]
  ) => void;
}

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

  const toggle = useCallback(
    (groupKey: string) => store.update((prev) => toggleId(prev, groupKey)),
    [store]
  );

  const expandAll = useCallback(() => store.commit(new Set()), [store]);

  const collapseAll = useCallback(
    (groupKeys: readonly string[]) => store.commit(new Set(groupKeys)),
    [store]
  );

  const collapseToDepth = useCallback(
    (depth: number, groups: readonly { key: string; level: number }[]) =>
      store.commit(groupsCollapsedToDepth(groups, depth)),
    [store]
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
