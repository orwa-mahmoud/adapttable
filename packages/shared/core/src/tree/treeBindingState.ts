/**
 * Shared state shapes a framework binding returns from its hooks. Each
 * binding adapts core's stores to its reactivity and hands back these
 * shapes, so a kit reads the same fields in every framework.
 */
import type { TreeEntry } from "./treeRows";

/**
 * The tree a table already walked, as the runtime view publishes it.
 *
 * Expansion stays {@link TreeExpansionState}. This aliases the host's
 * entries. It does not build another tree.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export interface TreeContribution<TRow> {
  /** Open nodes in render order. */
  readonly entries: readonly TreeEntry<TRow>[];
  /** Every loaded node, including descendants of collapsed parents. */
  readonly allEntries?: readonly TreeEntry<TRow>[];
}

/**
 * Lazy-loading state for a tree.
 *
 * @public
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
 * Tree expansion state and the actions that change it.
 *
 * @public
 */
export interface TreeExpansionState {
  /** Ids of the currently expanded nodes. */
  expandedIds: ReadonlySet<string>;
  /** Whether a node is expanded. */
  isExpanded: (id: string) => boolean;
  /** Open or close one node. */
  toggle: (id: string) => void;
  /** Open a specific node — what "reveal this row" needs. */
  expand: (id: string) => void;
  /** Open every node in `ids`. */
  expandAll: (ids: readonly string[]) => void;
  /** Fold everything. */
  collapseAll: () => void;
}
