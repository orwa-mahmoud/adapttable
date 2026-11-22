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

import {
  idSetReader,
  rekeyRowIdSet,
  treeExpansionActions,
  type TreeExpansionState,
} from "@adapttable/core/binding";
import { useCallback, useMemo, useState } from "react";

import { useControllableStore } from "../hooks/useControllableStore";
export type { TreeExpansionState } from "@adapttable/core/binding";

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
  const [readIds] = useState(idSetReader);
  const onExpandedIdsChange = controlled?.onExpandedIdsChange;
  const [expandedIds, store] = useControllableStore<ReadonlySet<string>>(
    () => new Set(),
    {
      value: readIds(controlled?.expandedIds),
      onChange:
        onExpandedIdsChange && ((next) => onExpandedIdsChange([...next])),
    },
    undefined,
    rekeyRowIdSet
  );

  const isExpanded = useCallback(
    (id: string) => expandedIds.has(id),
    [expandedIds]
  );

  const [{ toggle, expand, expandAll, collapseAll }] = useState(() =>
    treeExpansionActions(store)
  );

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
