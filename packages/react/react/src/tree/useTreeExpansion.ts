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
import { idSetReader, toggleId } from "@adapttable/core";
import { useCallback, useMemo, useState } from "react";

import { useControllableStore } from "../hooks/useControllableStore";

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
  const [readIds] = useState(idSetReader);
  const onExpandedIdsChange = controlled?.onExpandedIdsChange;
  const [expandedIds, store] = useControllableStore<ReadonlySet<string>>(
    () => new Set(),
    {
      value: readIds(controlled?.expandedIds),
      onChange:
        onExpandedIdsChange && ((next) => onExpandedIdsChange([...next])),
    }
  );

  const isExpanded = useCallback(
    (id: string) => expandedIds.has(id),
    [expandedIds]
  );

  const toggle = useCallback(
    (id: string) => store.update((prev) => toggleId(prev, id)),
    [store]
  );

  const expand = useCallback(
    (id: string) => {
      if (store.current().has(id)) return;
      store.update((prev) => new Set(prev).add(id));
    },
    [store]
  );

  const expandAll = useCallback(
    (ids: readonly string[]) => store.commit(new Set(ids)),
    [store]
  );

  const collapseAll = useCallback(() => store.commit(new Set()), [store]);

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
