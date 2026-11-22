import {
  rekeyRowIdSet,
  type RowExpansionState,
  toggleId,
} from "@adapttable/core/binding";
import { useCallback, useMemo } from "react";

import {
  UNCONTROLLED,
  useControllableStore,
} from "../hooks/useControllableStore";
export type { RowExpansionState } from "@adapttable/core/binding";

/**
 * Headless row-expansion state for `renderRowDetail`: multiple rows may be
 * open at once, keyed by row id so expansion survives sorting and paging
 * (a row that leaves the page simply re-opens when it returns).
 *
 * @param defaultExpandedIds - Row ids whose panel starts open.
 *
 * @public
 */
export function useRowExpansion(
  defaultExpandedIds?: readonly string[]
): RowExpansionState {
  const [expandedIds, store] = useControllableStore<ReadonlySet<string>>(
    () => new Set(defaultExpandedIds),
    UNCONTROLLED,
    undefined,
    rekeyRowIdSet
  );

  const isExpanded = useCallback(
    (id: string) => expandedIds.has(id),
    [expandedIds]
  );

  const toggle = useCallback(
    (id: string) => store.update((prev) => toggleId(prev, id)),
    [store]
  );

  return useMemo(
    () => ({ expandedIds, isExpanded, toggle }),
    [expandedIds, isExpanded, toggle]
  );
}
