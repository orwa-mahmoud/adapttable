import { useCallback, useMemo, useState } from "react";

/** Collapse state + actions returned by {@link useGroupCollapse}. */
export interface GroupCollapseState {
  /** Ids of currently collapsed groups (`group:…` keys). */
  collapsedIds: ReadonlySet<string>;
  /** Whether a group is collapsed. */
  isCollapsed: (groupKey: string) => boolean;
  /** Toggle a group's collapsed state. */
  toggle: (groupKey: string) => void;
  /** Expand every group (clear the collapsed set). */
  expandAll: () => void;
  /** Collapse every group in `groupKeys`. */
  collapseAll: (groupKeys: readonly string[]) => void;
}

/**
 * Headless collapse state for single-level row groups. Ephemeral — not
 * URL-synced (punch-list #62). Groups default to expanded (empty set).
 */
export function useGroupCollapse(controlled?: {
  collapsedGroupIds?: readonly string[];
  /** Alias for `collapsedGroupIds` (v1 name) — deleted before the 2.0.0 release. */
  collapsedIds?: readonly string[];
  onCollapsedGroupIdsChange?: (ids: string[]) => void;
  /** Alias for `onCollapsedGroupIdsChange` (v1 name) — deleted before the 2.0.0 release. */
  onCollapsedIdsChange?: (ids: string[]) => void;
}): GroupCollapseState {
  const controlledIds =
    controlled?.collapsedGroupIds ?? controlled?.collapsedIds;
  const isControlled = controlledIds !== undefined;
  const [uncontrolled, setUncontrolled] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  const collapsedIds = useMemo(
    () => (isControlled ? new Set(controlledIds ?? []) : uncontrolled),
    [isControlled, controlledIds, uncontrolled]
  );

  const commit = useCallback(
    (next: Set<string>) => {
      if (isControlled) {
        (
          controlled?.onCollapsedGroupIdsChange ??
          controlled?.onCollapsedIdsChange
        )?.([...next]);
      } else {
        setUncontrolled(next);
      }
    },
    [controlled, isControlled]
  );

  const isCollapsed = useCallback(
    (groupKey: string) => collapsedIds.has(groupKey),
    [collapsedIds]
  );

  const toggle = useCallback(
    (groupKey: string) => {
      const next = new Set(collapsedIds);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      commit(next);
    },
    [collapsedIds, commit]
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

  return useMemo(
    () => ({ collapsedIds, isCollapsed, toggle, expandAll, collapseAll }),
    [collapsedIds, isCollapsed, toggle, expandAll, collapseAll]
  );
}
