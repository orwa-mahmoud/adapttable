import { toggleId } from "@adapttable/core";
import { useCallback, useMemo } from "react";

import {
  UNCONTROLLED,
  useControllableStore,
} from "../hooks/useControllableStore";

/**
 * Expansion state + actions returned by `useRowExpansion`.
 *
 * @public
 */
export interface RowExpansionState {
  /** Ids of the currently expanded rows. */
  expandedIds: ReadonlySet<string>;
  /** Whether a row is expanded. */
  isExpanded: (id: string) => boolean;
  /** Toggle a row's detail panel. */
  toggle: (id: string) => void;
}

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
    UNCONTROLLED
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
