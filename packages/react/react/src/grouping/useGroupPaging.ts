/**
 * How much of a paged group model has been asked for — the React side of
 * core's group paging controller.
 */

import {
  createGroupPagingController,
  type GroupPagingState,
} from "@adapttable/core/binding";
import { useMemo, useState, useSyncExternalStore } from "react";
export type { GroupPagingState } from "@adapttable/core/binding";

/**
 * Track how much of a paged group model is showing.
 *
 * @returns The state; inert until something calls `showMore`.
 *
 * @public
 */
export function useGroupPaging(): GroupPagingState {
  const [controller] = useState(createGroupPagingController);
  const paging = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot
  );
  const { showMore, reset } = controller;

  return useMemo(
    () => ({ paging, showMore, reset }),
    [paging, showMore, reset]
  );
}
