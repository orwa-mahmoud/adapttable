/**
 * Children fetched when a tree node is opened.
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
 * rejects. A node whose fetch failed is reported through `onLoadFailed` and
 * stays clickable, so the reader's retry is the same gesture as the first
 * attempt.
 */

/**
 * What a lazy-children controller reads.
 *
 * @public
 */
export interface LazyChildrenOptions<TRow> {
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
 * Which nodes are fetching, and which last failed.
 *
 * @public
 */
export interface LazyChildrenSnapshot {
  /** Nodes being fetched right now — what the chevron shows a spinner for. */
  readonly loadingIds: ReadonlySet<string>;
  /** Ids whose last fetch rejected, so a caller can offer a retry. */
  readonly failedIds: ReadonlySet<string>;
}

/**
 * The lazy-children controller.
 *
 * @public
 */
export interface LazyChildrenController<TRow> {
  /** The current state. A new object whenever either set changes. */
  readonly getSnapshot: () => LazyChildrenSnapshot;
  /** Listen for state changes. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Replace the configuration — a binding calls this on every render. */
  readonly configure: (options: LazyChildrenOptions<TRow>) => void;
  /**
   * Mark the tree mounted. Returns the teardown, after which a fetch that
   * settles changes nothing.
   */
  readonly connect: () => () => void;
  /**
   * Call before opening a node: fetches its children when they are missing.
   * Expansion is not blocked on the fetch, so the row opens immediately and
   * fills when the rows arrive. A node already asked for is not asked again
   * until its fetch fails.
   */
  readonly loadIfNeeded: (row: TRow) => void;
}

const EMPTY: ReadonlySet<string> = new Set();

/**
 * Create the lazy-children controller; inert while no `onLoadChildren` is
 * configured.
 *
 * @typeParam TRow - The row type.
 * @param initial - The first configuration.
 * @returns The controller.
 *
 * @public
 */
export function createLazyChildrenController<TRow>(
  initial: LazyChildrenOptions<TRow>
): LazyChildrenController<TRow> {
  let options = initial;
  let snapshot: LazyChildrenSnapshot = { loadingIds: EMPTY, failedIds: EMPTY };
  // Ids already asked for, so a second click while a fetch is in flight — or
  // after one that returned nothing — does not ask again.
  const asked = new Set<string>();
  let alive = true;
  const listeners = new Set<() => void>();

  const commit = (next: LazyChildrenSnapshot): void => {
    snapshot = next;
    // Subscription changes during a publication apply to the next publication.
    const pendingListeners = [...listeners];
    for (const listener of pendingListeners) listener();
  };
  const without = (set: ReadonlySet<string>, id: string): Set<string> => {
    const next = new Set(set);
    next.delete(id);
    return next;
  };

  const settle = (row: TRow, id: string, failed: boolean): void => {
    if (!alive) return;
    if (!failed) {
      commit({ ...snapshot, loadingIds: without(snapshot.loadingIds, id) });
      return;
    }
    asked.delete(id);
    commit({
      loadingIds: without(snapshot.loadingIds, id),
      failedIds: new Set(snapshot.failedIds).add(id),
    });
    options.onLoadFailed?.(row, id);
  };

  const loadIfNeeded = (row: TRow): void => {
    const { onLoadChildren, hasLoadedChildren, getRowId } = options;
    if (!onLoadChildren) return;
    const id = getRowId(row);
    if (hasLoadedChildren(row) || asked.has(id)) return;
    asked.add(id);
    commit({
      loadingIds: new Set(snapshot.loadingIds).add(id),
      failedIds: snapshot.failedIds.has(id)
        ? without(snapshot.failedIds, id)
        : snapshot.failedIds,
    });
    // A synchronous handler that throws must settle the node too, or the
    // spinner outlives the attempt.
    try {
      void Promise.resolve(onLoadChildren(row)).then(
        () => {
          settle(row, id, false);
        },
        () => {
          settle(row, id, true);
        }
      );
    } catch {
      settle(row, id, true);
    }
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    configure: (next) => {
      options = next;
    },
    connect: () => {
      alive = true;
      return () => {
        alive = false;
      };
    },
    loadIfNeeded,
  };
}
