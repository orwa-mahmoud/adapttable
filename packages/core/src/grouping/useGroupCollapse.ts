import { useCallback, useMemo, useState } from "react";

import { useEventCallback } from "../hooks/useEventCallback";

/**
 * Collapse state + actions returned by {@link useGroupCollapse}.
 *
 * @internal
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
 * URL-synced (punch-list #62). Groups default to expanded (empty set).
 *
 * @internal
 */
export function useGroupCollapse(controlled?: {
  collapsedGroupIds?: readonly string[];
  onCollapsedGroupIdsChange?: (ids: string[]) => void;
}): GroupCollapseState {
  const controlledIds = controlled?.collapsedGroupIds;
  const isControlled = controlledIds !== undefined;
  const [uncontrolled, setUncontrolled] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  const collapsedGroupIds = useMemo(
    () => (isControlled ? new Set(controlledIds ?? []) : uncontrolled),
    [isControlled, controlledIds, uncontrolled]
  );

  // Stable across renders on purpose: the options object arrives fresh from
  // the caller every time, and a `commit` that changed with it would change
  // every action here — which rebuilds the whole grouped model on a keystroke
  // that has nothing to do with grouping.
  const commit = useEventCallback((next: Set<string>) => {
    if (isControlled) {
      controlled?.onCollapsedGroupIdsChange?.([...next]);
    } else {
      setUncontrolled(next);
    }
  });

  const isCollapsed = useCallback(
    (groupKey: string) => collapsedGroupIds.has(groupKey),
    [collapsedGroupIds]
  );

  const toggle = useCallback(
    (groupKey: string) => {
      const next = new Set(collapsedGroupIds);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      commit(next);
    },
    [collapsedGroupIds, commit]
  );

  const expandAll = useCallback(() => {
    commit(new Set());
  }, [commit]);

  const collapseAll = useCallback(
    (groupKeys: readonly string[]) => {
      commit(new Set(groupKeys));
    },
    [commit]
  );

  const collapseToDepth = useCallback(
    (depth: number, groups: readonly { key: string; level: number }[]) => {
      commit(
        new Set(
          groups.filter((group) => group.level >= depth).map((g) => g.key)
        )
      );
    },
    [commit]
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
