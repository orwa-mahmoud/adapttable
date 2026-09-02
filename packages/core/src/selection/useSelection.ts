import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { applyGroupLeafSelection } from "../grouping/groupSelection";

/**
 * Tri-state of the "select all visible" header control.
 *
 * @public
 */
export type HeaderSelectionState = "all" | "some" | "none";

/**
 * Options for `useSelection`.
 *
 * @public
 */
export interface UseSelectionOptions<TRow> {
  /** The currently visible rows. */
  rows: readonly TRow[];
  /** Stable id extractor for a row. */
  getId: (row: TRow) => string;
  /**
   * When this value changes, the selection is cleared (the previously
   * selected ids may no longer be visible). Compose it from search /
   * page / active-filter count — e.g. `` `${search}|${page}` ``.
   */
  resetKey?: unknown;
  /**
   * Controlled selection. When provided, the hook reads from this value
   * and reports every change request through `onSelectionChange` instead
   * of mutating its own state — the same controlled/uncontrolled split as
   * `useColumnLayout`.
   */
  selectedIds?: readonly string[];
  /** Change handler; required for the controlled mode to update. */
  onSelectionChange?: (selectedIds: string[]) => void;
  /**
   * Whether "select all N matching" is something this source can honour.
   * Defaults to true; the table fills it from the source's capabilities, so
   * a source that only ever holds one page never offers a selection it
   * cannot describe.
   */
  acrossPages?: boolean;
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

/**
 * Whether to offer "select all N matching".
 *
 * Three things have to hold at once: the source can speak for rows that are
 * not on screen, the visible page is fully selected, and there are more rows
 * to reach. Every kit draws that banner differently and none of them decides
 * it — a control offered by one adapter and withheld by another is the same
 * table behaving in two ways.
 *
 * @param selection - The selection state.
 * @param total - Rows in the whole filtered set.
 * @returns True when the banner should be shown.
 *
 * @public
 */
export function offersAllMatching(
  selection: Pick<SelectionState, "acrossPages" | "headerState" | "visibleIds">,
  total: number
): boolean {
  return (
    selection.acrossPages &&
    selection.headerState === "all" &&
    total > selection.visibleIds.length
  );
}

/**
 * Headless multi-row selection. Tracks a set of ids, derives the header
 * tri-state from the visible rows, and clears itself when `resetKey`
 * changes so stale ids never linger after a filter/page change.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link UseSelectionOptions}.
 * @returns Selection state and actions.
 *
 * @public
 */
export function useSelection<TRow>(
  options: UseSelectionOptions<TRow>
): SelectionState {
  const { rows, getId, resetKey } = options;
  const acrossPages = options.acrossPages ?? true;
  const controlledValue = options.selectedIds;
  const onChange = options.onSelectionChange;
  const [internal, setInternal] = useState<Set<string>>(() => new Set());
  const [allMatching, setAllMatching] = useState(false);
  const controlled = controlledValue !== undefined;
  const selectedIds = useMemo(
    () => (controlledValue === undefined ? internal : new Set(controlledValue)),
    [controlledValue, internal]
  );

  // The mutators below close over `commit`; reading the live mode/state
  // through this ref keeps their identities PERMANENTLY stable — memoized
  // adapter rows can hold `toggle` forever without computing from a stale
  // set in the controlled mode.
  const modeRef = useRef({ controlled, onChange, selectedIds });
  modeRef.current = { controlled, onChange, selectedIds };

  /** Route a change to the parent (controlled) or internal state. */
  const commit = useCallback(
    (compute: (prev: ReadonlySet<string>) => Set<string>) => {
      // Any explicit mutation narrows the scope back to concrete ids.
      setAllMatching(false);
      const live = modeRef.current;
      if (live.controlled) {
        live.onChange?.([...compute(live.selectedIds)]);
      } else {
        setInternal((prev) => compute(prev));
      }
    },
    []
  );

  const selectAllMatching = useCallback(() => {
    // Nothing offers this when the source cannot reach past the page, but a
    // host holding the state object can still call it — and "all matching"
    // over rows the source cannot name is a selection nobody can act on.
    if (!acrossPages) return;
    setAllMatching(true);
  }, [acrossPages]);

  // Clear on reset-key change, but not on first mount. The effect reads the
  // LATEST size through a ref so only `resetKey` retriggers it. The guard
  // is last-seen-value, not a boolean first-run flag: refs survive
  // StrictMode's simulated remount, so a boolean guard saw the doubled
  // mount effect as a "change" and wiped a controlled preselection.
  const liveRef = useRef({ commit, size: selectedIds.size });
  liveRef.current = { commit, size: selectedIds.size };
  const lastResetKeyRef = useRef(resetKey);
  useEffect(() => {
    if (Object.is(lastResetKeyRef.current, resetKey)) return;
    lastResetKeyRef.current = resetKey;
    // Identity-preserving no-op when there is nothing to clear.
    if (liveRef.current.size === 0) return;
    liveRef.current.commit(() => new Set());
  }, [resetKey]);

  const visibleIds = useMemo(() => rows.map(getId), [rows, getId]);

  const selectedVisible = useMemo(
    () => visibleIds.reduce((n, id) => (selectedIds.has(id) ? n + 1 : n), 0),
    [visibleIds, selectedIds]
  );

  let headerState: HeaderSelectionState = "none";
  if (visibleIds.length > 0 && selectedVisible === visibleIds.length) {
    headerState = "all";
  } else if (selectedVisible > 0) {
    headerState = "some";
  }

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const toggle = useCallback(
    (id: string) => {
      commit((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [commit]
  );

  const toggleGroupLeaves = useCallback(
    (leafIds: readonly string[]) => {
      commit((prev) => applyGroupLeafSelection(leafIds, prev));
    },
    [commit]
  );

  const toggleAll = useCallback(() => {
    commit((prev) => {
      const next = new Set(prev);
      const allSelected =
        visibleIds.length > 0 && visibleIds.every((id) => next.has(id));
      for (const id of visibleIds) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, [commit, visibleIds]);

  const clear = useCallback(() => commit(() => new Set()), [commit]);

  const replace = useCallback(
    (ids: readonly string[] | undefined) => {
      commit(() => new Set(ids ?? []));
    },
    [commit]
  );

  // Stable identity: row-level React.memo in the adapters depends on the
  // selection object only changing when the selection actually changes.
  return useMemo(
    () => ({
      selectedIds,
      selectedCount: selectedIds.size,
      headerState,
      isSelected,
      toggle,
      toggleGroupLeaves,
      toggleAll,
      clear,
      replace,
      visibleIds,
      allMatching,
      selectAllMatching,
      acrossPages,
    }),
    [
      selectedIds,
      headerState,
      isSelected,
      toggle,
      toggleGroupLeaves,
      toggleAll,
      clear,
      replace,
      visibleIds,
      allMatching,
      selectAllMatching,
      acrossPages,
    ]
  );
}
