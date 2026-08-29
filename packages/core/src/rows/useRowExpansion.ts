import { useCallback, useMemo, useState } from "react";

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
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(
    () => new Set(defaultExpandedIds)
  );

  const isExpanded = useCallback(
    (id: string) => expandedIds.has(id),
    [expandedIds]
  );

  const toggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return useMemo(
    () => ({ expandedIds, isExpanded, toggle }),
    [expandedIds, isExpanded, toggle]
  );
}
