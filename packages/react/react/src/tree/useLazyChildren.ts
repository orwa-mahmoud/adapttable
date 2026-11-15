/**
 * Children fetched when a node is opened — the React side of core's
 * lazy-children controller, which owns the loading and failed sets and the
 * fetch-once rule.
 */

import {
  createLazyChildrenController,
  type LazyChildrenState,
} from "@adapttable/core/binding";
import { useEffect, useState, useSyncExternalStore } from "react";
export type { LazyChildrenState } from "@adapttable/core/binding";

/**
 * What {@link useLazyChildren} needs.
 *
 * @public
 */
export interface UseLazyChildrenOptions<TRow> {
  /**
   * Fetch a node's children. Resolve once they are in the data the table
   * reads — the table re-walks the tree from the rows it is given, so it needs
   * nothing back.
   */
  onLoadChildren?: (row: TRow) => void | Promise<void>;
  /** Whether a row's children are already in hand. */
  hasLoadedChildren: (row: TRow) => boolean;
  /** Row identity. */
  getRowId: (row: TRow) => string;
  /**
   * Called when a node's fetch rejects, after it is recorded in `failedIds`.
   * The tree closes the node here, so the next click opens it and fetches
   * again.
   */
  onLoadFailed?: (row: TRow, id: string) => void;
}

/**
 * Track which nodes are fetching their children, and fetch on demand.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link UseLazyChildrenOptions}.
 * @returns The state; inert when no `onLoadChildren` is given.
 *
 * @public
 */
export function useLazyChildren<TRow>(
  options: UseLazyChildrenOptions<TRow>
): LazyChildrenState<TRow> {
  const [controller] = useState(() => createLazyChildrenController(options));
  controller.configure(options);
  const { loadingIds, failedIds } = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot
  );
  useEffect(() => controller.connect(), [controller]);

  return {
    loadingIds,
    failedIds,
    loadIfNeeded: controller.loadIfNeeded,
  };
}
