/**
 * Shared state shapes a framework binding returns from its hooks. Each
 * binding adapts core's stores to its reactivity and hands back these
 * shapes, so a kit reads the same fields in every framework.
 */
import type { HeaderSelectionState } from "./selectionState";

/**
 * The selection a host publishes for the runtime view.
 *
 * `selectedIds` is the host's set. This contribution does not copy it.
 *
 * @public
 */
export interface SelectionContribution {
  /** The set of selected row ids. */
  readonly selectedIds: ReadonlySet<string>;
  /** Whether the selection covers every row matching the current query. */
  readonly allMatching?: boolean;
  /** Observed source reachability; this flag grants no row or operation access. */
  readonly acrossPages?: boolean;
  /** Replace the selection with the given ids, or clear it when omitted. */
  readonly replace: (ids: readonly string[] | undefined) => void;
}

/**
 * The host selection the runtime projects, or nothing when selection is omitted.
 *
 * Optional scope flags that the host left unset stay off the object. The
 * returned set and `replace` are the host's own.
 */
export function selectionContributionOf(
  selection: SelectionContribution | null | undefined
): SelectionContribution | undefined {
  if (!selection) return undefined;
  return {
    selectedIds: selection.selectedIds,
    ...(selection.allMatching === undefined
      ? {}
      : { allMatching: selection.allMatching }),
    ...(selection.acrossPages === undefined
      ? {}
      : { acrossPages: selection.acrossPages }),
    replace: selection.replace,
  };
}

/**
 * Selection state + actions returned by `useSelection`.
 *
 * @public
 */
export interface SelectionState {
  /** The set of selected ids. */
  selectedIds: ReadonlySet<string>;
  /** Number of selected ids. */
  selectedCount: number;
  /** Tri-state for the visible rows (`all` / `some` / `none`). */
  headerState: HeaderSelectionState;
  /** Whether a specific id is selected. */
  isSelected: (id: string) => boolean;
  /** Toggle a single id. */
  toggle: (id: string) => void;
  /**
   * Toggle all leaf ids in a group (select missing, or deselect when all
   * selected) — one commit so memoized rows see a single selection change.
   */
  toggleGroupLeaves: (leafIds: readonly string[]) => void;
  /** Toggle every visible id (select all, or clear all if already full). */
  toggleAll: () => void;
  /** Clear the entire selection. */
  clear: () => void;
  /** Replace the selection with the given ids, or clear it when omitted. */
  replace: (ids: readonly string[] | undefined) => void;
  /** The visible ids, in row order. */
  visibleIds: string[];
  /** True when the user chose "select all matching" across every page. */
  allMatching: boolean;
  /** Extend the selection to every matching row (across all pages). */
  selectAllMatching: () => void;
  /** Whether the source can answer for rows beyond the ones on screen. */
  acrossPages: boolean;
}
