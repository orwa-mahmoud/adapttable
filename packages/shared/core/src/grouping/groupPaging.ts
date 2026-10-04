/**
 * How much of a paged group model has been asked for.
 *
 * Revealing more is not a query: the rows are already in hand on the frontend
 * tier, and on a server tier the host fetches them and hands over a longer
 * list. So this holds nothing but counts — how many extra top-level groups,
 * and how many extra leaves per group — which is all the model needs to show
 * one more page of either.
 */
import type { GroupPaging } from "./groupRows";

/**
 * Reveal one more page of groups, or of one group's leaves.
 *
 * @param current - What has been asked for so far.
 * @param pageSize - How many more to reveal.
 * @param groupKey - The group whose leaves to extend; omit for the top level.
 * @returns The next paging state.
 *
 * @public
 */
export function advanceGroupPaging(
  current: GroupPaging,
  pageSize: number,
  groupKey?: string
): GroupPaging {
  if (groupKey === undefined) {
    return { ...current, groups: (current.groups ?? 0) + pageSize };
  }
  const rows = { ...current.rows };
  rows[groupKey] = (rows[groupKey] ?? 0) + pageSize;
  return { ...current, rows };
}

/**
 * Group paging state and the actions that change it.
 *
 * @public
 */
export interface GroupPagingController {
  /** What the model reads. A new object whenever it changes. */
  readonly getSnapshot: () => GroupPaging;
  /** Listen for changes. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Reveal one more page — of one group's leaves when `groupKey` is given. */
  readonly showMore: (pageSize: number, groupKey?: string) => void;
  /** Back to the first page of everything — what new data calls for. */
  readonly reset: () => void;
}

/**
 * Create group paging state, inert until something calls `showMore`.
 *
 * @returns The controller.
 *
 * @public
 */
export function createGroupPagingController(): GroupPagingController {
  let paging: GroupPaging = {};
  const listeners = new Set<() => void>();
  const set = (next: GroupPaging): void => {
    paging = next;
    // Subscription changes during a publication apply to the next publication.
    const pendingListeners = [...listeners];
    for (const listener of pendingListeners) listener();
  };
  return {
    getSnapshot: () => paging,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    showMore: (pageSize, groupKey) => {
      set(advanceGroupPaging(paging, pageSize, groupKey));
    },
    reset: () => {
      set({});
    },
  };
}
