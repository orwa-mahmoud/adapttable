/**
 * Collapsed groups, in the URL.
 *
 * Which groups are folded is part of what someone means when they send a link
 * to a table: "look at this, the other regions are in the way". So it belongs
 * in the address bar for the same reason sorting and filtering do — and it is
 * opt-in for the same reason column layout is, because a table with twenty
 * collapsed groups would otherwise write a long URL nobody asked for.
 *
 * Pair it with `<DataTable collapsedGroupIds onCollapsedGroupIdsChange>` and
 * grouping's state travels with the link.
 */

import {
  groupCollapseSlice,
  type UseGroupCollapseUrlStateResult,
} from "@adapttable/core/binding";

import type { UrlStateAdapter } from "./adapter";
import { useUrlSlice } from "./useUrlSlice";
export type { UseGroupCollapseUrlStateResult } from "@adapttable/core/binding";

/**
 * What {@link useGroupCollapseUrlState} needs.
 *
 * @public
 */
export interface UseGroupCollapseUrlStateOptions {
  /** URL backend; defaults to the History API. */
  urlAdapter?: UrlStateAdapter;
  /** Sync to the URL at all. Defaults to `true`. */
  urlSync?: boolean;
  /** Namespace, when several tables share a page. */
  urlKey?: string;
  /** Groups collapsed before the URL says otherwise. */
  defaultCollapsedGroupIds?: readonly string[];
}

/**
 * Keep collapsed groups in the URL.
 *
 * @param options - See {@link UseGroupCollapseUrlStateOptions}.
 * @returns The controlled pair to spread onto the table.
 *
 * @public
 */
export function useGroupCollapseUrlState(
  options: UseGroupCollapseUrlStateOptions = {}
): UseGroupCollapseUrlStateResult {
  const [collapsedGroupIds, onCollapsedGroupIdsChange] = useUrlSlice(
    options,
    groupCollapseSlice,
    { defaultCollapsedGroupIds: options.defaultCollapsedGroupIds }
  );
  return { collapsedGroupIds, onCollapsedGroupIdsChange };
}
