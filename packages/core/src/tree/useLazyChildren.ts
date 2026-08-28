/**
 * Children fetched when a node is opened.
 *
 * A tree of any size cannot arrive whole: an org chart of ten thousand people
 * is one request per branch the reader actually opens. What that costs the host
 * is one callback; what it costs the reader is a spinner on the node they
 * clicked — never a table-wide loading state, because the rest of the tree is
 * still perfectly readable while one branch fills.
 *
 * The set of loading ids lives here rather than in the host's state so the
 * chevron can show it without the host wiring anything: opening a node with
 * unfetched children marks it, and it clears when the rows arrive or the fetch
 * rejects. A node whose fetch failed is left closed and clickable, so the
 * reader's retry is the same gesture as the first attempt.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { useEventCallback } from "../hooks/useEventCallback";

/**
 * What {@link useLazyChildren} needs.
 *
 * @internal
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
}

/**
 * Lazy-loading state for a tree.
 *
 * @internal
 */
export interface LazyChildrenState<TRow> {
  /** Nodes being fetched right now — what the chevron shows a spinner for. */
  loadingIds: ReadonlySet<string>;
  /**
   * Call before opening a node: fetches its children when they are missing.
   * Returns nothing — expansion is not blocked on the fetch, so the row opens
   * immediately and fills when the rows arrive.
   */
  loadIfNeeded: (row: TRow) => void;
  /** Ids whose last fetch rejected, so a caller can offer a retry. */
  failedIds: ReadonlySet<string>;
}

/**
 * Track which nodes are fetching their children, and fetch on demand.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link UseLazyChildrenOptions}.
 * @returns The state; inert when no `onLoadChildren` is given.
 *
 * @internal
 */
export function useLazyChildren<TRow>(
  options: UseLazyChildrenOptions<TRow>
): LazyChildrenState<TRow> {
  const [loadingIds, setLoadingIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const [failedIds, setFailedIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  // Ids already asked for, so a second click while a fetch is in flight — or
  // after one that returned nothing — does not ask again.
  const asked = useRef(new Set<string>());
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const settle = useEventCallback((id: string, failed: boolean) => {
    if (!alive.current) return;
    setLoadingIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    if (failed) {
      asked.current.delete(id);
      setFailedIds((current) => new Set(current).add(id));
    }
  });

  const loadIfNeeded = useEventCallback((row: TRow) => {
    const { onLoadChildren, hasLoadedChildren, getRowId } = options;
    if (!onLoadChildren) return;
    const id = getRowId(row);
    if (hasLoadedChildren(row) || asked.current.has(id)) return;
    asked.current.add(id);
    setFailedIds((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    setLoadingIds((current) => new Set(current).add(id));
    // A synchronous handler that throws must settle the node too, or the
    // spinner outlives the attempt.
    try {
      void Promise.resolve(onLoadChildren(row)).then(
        () => {
          settle(id, false);
        },
        () => {
          settle(id, true);
        }
      );
    } catch {
      settle(id, true);
    }
  });

  return {
    loadingIds,
    failedIds,
    loadIfNeeded: useCallback(loadIfNeeded, [loadIfNeeded]),
  };
}
