/**
 * Which tree nodes are open.
 *
 * Separate state from row expansion (a detail panel) and from group collapse
 * (a derived bucket), because they answer different questions and a table can
 * have all three at once. The controlled pair mirrors the others: the table
 * performs the change and tells the host, or the host holds the set.
 *
 * Expanded rather than collapsed, unlike groups: a tree starts folded, so the
 * open set is the small one — the opposite default, and the same reasoning.
 */
import { useCallback, useMemo, useState } from "react";

import { useEventCallback } from "../hooks/useEventCallback";

/**
 * Tree expansion state and the actions that change it.
 *
 * @public
 */
export interface TreeExpansionState {
  /** Ids of the currently expanded nodes. */
  expandedIds: ReadonlySet<string>;
  /** Whether a node is expanded. */
  isExpanded: (id: string) => boolean;
  /** Open or close one node. */
  toggle: (id: string) => void;
  /** Open a specific node — what "reveal this row" needs. */
  expand: (id: string) => void;
  /** Open every node in `ids`. */
  expandAll: (ids: readonly string[]) => void;
  /** Fold everything. */
  collapseAll: () => void;
}

/**
 * Headless expansion state for a tree.
 *
 * @param controlled - The host's pair, when it holds the state.
 * @returns The state; uncontrolled unless `expandedIds` is given.
 *
 * @public
 */
export function useTreeExpansion(controlled?: {
  expandedIds?: readonly string[];
  onExpandedIdsChange?: (ids: string[]) => void;
}): TreeExpansionState {
  const controlledIds = controlled?.expandedIds;
  const isControlled = controlledIds !== undefined;
  const [uncontrolled, setUncontrolled] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  const expandedIds = useMemo(
    () => (isControlled ? new Set(controlledIds ?? []) : uncontrolled),
    [isControlled, controlledIds, uncontrolled]
  );

  // Stable across renders: the options object arrives fresh every time, and a
  // commit that changed with it would change every action here.
  const commit = useEventCallback((next: Set<string>) => {
    if (isControlled) controlled?.onExpandedIdsChange?.([...next]);
    else setUncontrolled(next);
  });

  const isExpanded = useCallback(
    (id: string) => expandedIds.has(id),
    [expandedIds]
  );

  const toggle = useCallback(
    (id: string) => {
      const next = new Set(expandedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      commit(next);
    },
    [expandedIds, commit]
  );

  const expand = useCallback(
    (id: string) => {
      if (expandedIds.has(id)) return;
      commit(new Set(expandedIds).add(id));
    },
    [expandedIds, commit]
  );

  const expandAll = useCallback(
    (ids: readonly string[]) => {
      commit(new Set(ids));
    },
    [commit]
  );

  const collapseAll = useCallback(() => {
    commit(new Set());
  }, [commit]);

  return useMemo(
    () => ({
      expandedIds,
      isExpanded,
      toggle,
      expand,
      expandAll,
      collapseAll,
    }),
    [expandedIds, isExpanded, toggle, expand, expandAll, collapseAll]
  );
}
