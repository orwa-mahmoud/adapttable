/**
 * How much of a paged group model has been asked for.
 *
 * Revealing more is not a query: the rows are already in hand on the frontend
 * tier, and on a server tier the host fetches them and hands over a longer
 * list. So this holds nothing but counts — how many extra top-level groups,
 * and how many extra leaves per group — which is all the model needs to show
 * one more page of either.
 */
import { useCallback, useMemo, useState } from "react";

import type { GroupPaging } from "./groupRows";

/**
 * Paging state and the one action that changes it.
 *
 * @public
 */
export interface GroupPagingState {
  /** What the model reads. */
  paging: GroupPaging;
  /**
   * Reveal one more page. `groupKey` names the group whose leaves to extend;
   * omit it for the top-level groups.
   */
  showMore: (pageSize: number, groupKey?: string) => void;
  /** Back to the first page of everything — what new data calls for. */
  reset: () => void;
}

/**
 * Track how much of a paged group model is showing.
 *
 * @returns The state; inert until something calls `showMore`.
 *
 * @public
 */
export function useGroupPaging(): GroupPagingState {
  const [paging, setPaging] = useState<GroupPaging>({});

  const showMore = useCallback((pageSize: number, groupKey?: string) => {
    setPaging((current) => {
      if (groupKey === undefined) {
        return { ...current, groups: (current.groups ?? 0) + pageSize };
      }
      const rows = { ...current.rows };
      rows[groupKey] = (rows[groupKey] ?? 0) + pageSize;
      return { ...current, rows };
    });
  }, []);

  const reset = useCallback(() => {
    setPaging({});
  }, []);

  return useMemo(
    () => ({ paging, showMore, reset }),
    [paging, showMore, reset]
  );
}
