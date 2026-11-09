import {
  applyGroupLeafSelection,
  headerSelectionOf,
  idSetReader,
  offersAllMatching as neutralOffersAllMatching,
  toggleId,
  toggleIds,
} from "@adapttable/core";
import type { SelectionState } from "@adapttable/core/binding";
import { createAllMatchingScope } from "@adapttable/core/selection";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { useControllableStore } from "../hooks/useControllableStore";
export type { SelectionState } from "@adapttable/core/binding";
export type { HeaderSelectionState } from "@adapttable/core/binding";

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
  return neutralOffersAllMatching(selection, total);
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
  // Every selectable table's base bundle carries this hook. Its options arrive
  // as a fresh object on each render and its callbacks are memoized
  // explicitly, so the compiler's cache would add weight without adding hits.
  "use no memo";
  const { rows, getId, resetKey } = options;
  const acrossPages = options.acrossPages ?? true;
  const [readIds] = useState(idSetReader);
  const onChange = options.onSelectionChange;
  const [scope] = useState(createAllMatchingScope);
  const scopeSnapshot = useSyncExternalStore(
    scope.subscribe,
    scope.getSnapshot,
    scope.getSnapshot
  );
  const allMatching = acrossPages && scopeSnapshot;
  useEffect(() => {
    if (!acrossPages) scope.narrow();
  }, [acrossPages, scope]);
  // The store's mutators are permanently stable: memoized adapter rows can
  // hold `toggle` forever, and a controlled commit still computes from the
  // selection the host last rendered.
  const [selectedIds, store] = useControllableStore<ReadonlySet<string>>(
    () => new Set(),
    {
      value: readIds(options.selectedIds),
      onChange: onChange && ((next) => onChange([...next])),
    }
  );

  /** Route a change to the parent (controlled) or internal state. */
  const commit = useCallback(
    (compute: (prev: ReadonlySet<string>) => Set<string>) => {
      // Any explicit mutation narrows the scope back to concrete ids.
      scope.narrow();
      store.update(compute);
    },
    [scope, store]
  );

  const selectAllMatching = useCallback(() => {
    // Nothing offers this when the source cannot reach past the page, but a
    // host holding the state object can still call it — and "all matching"
    // over rows the source cannot name is a selection nobody can act on.
    scope.select(acrossPages);
  }, [scope, acrossPages]);

  // Clear on reset-key change, but not on first mount. The effect reads the
  // LATEST size through a ref so only `resetKey` retriggers it. The guard
  // is last-seen-value, not a boolean first-run flag: refs survive
  // StrictMode's simulated remount, so a boolean guard saw the doubled
  // mount effect as a "change" and wiped a controlled preselection.
  const lastResetKeyRef = useRef(resetKey);
  useEffect(() => {
    if (Object.is(lastResetKeyRef.current, resetKey)) return;
    lastResetKeyRef.current = resetKey;
    // A broad scope can exist even when the explicit id set is empty.
    scope.narrow();
    // Identity-preserving no-op when there is nothing to clear.
    if (store.current().size === 0) return;
    commit(() => new Set());
  }, [resetKey, store, commit, scope]);

  const visibleIds = useMemo(() => rows.map(getId), [rows, getId]);

  const headerState = useMemo(
    () => headerSelectionOf(visibleIds, selectedIds),
    [visibleIds, selectedIds]
  );

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const toggle = useCallback(
    (id: string) => commit((prev) => toggleId(prev, id)),
    [commit]
  );

  const toggleGroupLeaves = useCallback(
    (leafIds: readonly string[]) => {
      commit((prev) => applyGroupLeafSelection(leafIds, prev));
    },
    [commit]
  );

  const toggleAll = useCallback(
    () => commit((prev) => toggleIds(prev, visibleIds)),
    [commit, visibleIds]
  );

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
