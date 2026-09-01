import { useCallback, useMemo, useRef, useState } from "react";

import type { ColumnDef } from "../types";
import {
  applyColumnOrder,
  type ColumnLayoutState,
  EMPTY_COLUMN_LAYOUT,
  type PinSide,
  type UseColumnLayoutResult,
} from "./columnLayoutModel";
import {
  applyCollapsedColumnGroups,
  type ColumnGroupRecord,
  marriedOrderHolds,
} from "./columnTree";
import { FALLBACK_PIN_WIDTH, parsePxWidth } from "./columnWidths";
import { toggleCollapsedColumnGroup } from "./headerGroups";

export type {
  ColumnLayoutState,
  PinLeads,
  PinnedCellStyle,
  PinOffset,
  PinSide,
  UseColumnLayoutResult,
} from "./columnLayoutModel";
export {
  applyColumnOrder,
  edgePinStyle,
  EMPTY_COLUMN_LAYOUT,
  PIN_Z,
  pinnedCellStyle,
} from "./columnLayoutModel";

/**
 * Options for `useColumnLayout`.
 *
 * @public
 */
export interface UseColumnLayoutOptions<TRow> {
  /** All declared columns (already filtered for the current device layout). */
  columns: readonly ColumnDef<TRow>[];
  /** Controlled layout state. Omit for uncontrolled (internal) state. */
  layout?: ColumnLayoutState;
  /** Change handler; required for the controlled mode to update. */
  onLayoutChange?: (next: ColumnLayoutState) => void;
  /** Initial layout for the uncontrolled mode. */
  defaultColumnLayout?: Partial<ColumnLayoutState>;
  /**
   * When true, `visibleColumns` hides leaves under a collapsed group
   * according to that group's collapse options. Omit and collapse is inert.
   */
  collapsibleColumnGroups?: boolean;
  /** Tree-group collapse options from {@link flattenColumnTree}. */
  columnGroups?: ReadonlyMap<string, ColumnGroupRecord<TRow>>;
}

/**
 * Headless column-layout state. Uncontrolled by default; pass `layout` +
 * `onLayoutChange` to control it (and persist however you like — localStorage,
 * URL, server). Returns the reordered, visibility-filtered columns to render.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export function useColumnLayout<TRow>({
  columns,
  layout,
  onLayoutChange,
  defaultColumnLayout,
  collapsibleColumnGroups = false,
  columnGroups,
}: UseColumnLayoutOptions<TRow>): UseColumnLayoutResult<TRow> {
  const [internal, setInternal] = useState<ColumnLayoutState>(() => ({
    ...EMPTY_COLUMN_LAYOUT,
    ...defaultColumnLayout,
  }));
  const state = layout ?? internal;

  // Mutators read through this ref so two mutations in ONE event handler
  // compose (the second sees the first's result) instead of the last write
  // silently winning. `commit` advances it optimistically; renders re-sync it.
  const stateRef = useRef(state);
  stateRef.current = state;

  const commit = useCallback(
    (next: ColumnLayoutState) => {
      stateRef.current = next;
      if (layout === undefined) setInternal(next);
      onLayoutChange?.(next);
    },
    [layout, onLayoutChange]
  );

  const isHidden = useCallback(
    (key: string) => state.hidden.includes(key),
    [state.hidden]
  );

  const setHidden = useCallback(
    (key: string, hidden: boolean) => {
      const current = stateRef.current;
      const has = current.hidden.includes(key);
      if (has === hidden) return;
      const nextHidden = hidden
        ? [...current.hidden, key]
        : current.hidden.filter((k) => k !== key);
      commit({ ...current, hidden: nextHidden });
    },
    [commit]
  );

  const toggleVisible = useCallback(
    (key: string) => setHidden(key, !stateRef.current.hidden.includes(key)),
    [setHidden]
  );

  const setPinned = useCallback(
    (key: string, side: PinSide | undefined) => {
      const current = stateRef.current;
      const next = { ...current.pinned };
      if (side === undefined) delete next[key];
      else next[key] = side;
      commit({ ...current, pinned: next });
    },
    [commit]
  );

  const setWidth = useCallback(
    (key: string, width: number | undefined) => {
      const current = stateRef.current;
      const next = { ...current.widths };
      if (width === undefined) delete next[key];
      else next[key] = width;
      commit({ ...current, widths: next });
    },
    [commit]
  );

  const visibleColumns = useMemo(() => {
    const ordered = applyColumnOrder(columns, state.order).filter(
      (c) => !state.hidden.includes(c.key)
    );
    if (!collapsibleColumnGroups) return ordered;
    return [
      ...applyCollapsedColumnGroups(
        ordered,
        state.collapsedGroups ?? [],
        columnGroups
      ),
    ];
  }, [
    columns,
    state.order,
    state.hidden,
    state.collapsedGroups,
    collapsibleColumnGroups,
    columnGroups,
  ]);

  const toggleColumnGroup = useCallback(
    (id: string) => {
      if (!collapsibleColumnGroups) return;
      const current = stateRef.current;
      const nextIds = toggleCollapsedColumnGroup(
        current.collapsedGroups ?? [],
        id
      );
      commit({
        ...current,
        collapsedGroups: nextIds.length > 0 ? nextIds : undefined,
      });
    },
    [collapsibleColumnGroups, commit]
  );

  const move = useCallback(
    (key: string, toIndex: number) => {
      const latest = stateRef.current;
      // Operate on the FULL ordered list (visible + hidden) so hiding a column
      // never reorders the rest and reordering keeps hidden columns in place.
      const current = applyColumnOrder(columns, latest.order).map((c) => c.key);
      const from = current.indexOf(key);
      if (from === -1) return;
      const clamped = Math.max(0, Math.min(toIndex, current.length - 1));
      if (from === clamped) return;
      current.splice(from, 1);
      current.splice(clamped, 0, key);
      if (columnGroups && !marriedOrderHolds(current, columnGroups)) return;
      commit({ ...latest, order: current });
    },
    [commit, columns, columnGroups]
  );

  const reset = useCallback(() => commit(EMPTY_COLUMN_LAYOUT), [commit]);

  // Precompute every pinned column's inset once per layout change — adapters
  // call `pinOffset` per cell per render, so a lookup beats re-walking the
  // pinned set each time on wide tables.
  const pinInsets = useMemo(() => {
    const resolveWidth = (column: ColumnDef<TRow>): number => {
      const override = state.widths[column.key];
      if (typeof override === "number") return override;
      // Only pixel widths can be summed into a sticky inset; relative units
      // have no px value here, so fall back to a sane default instead.
      return parsePxWidth(column.width) ?? FALLBACK_PIN_WIDTH;
    };
    const insets = new Map<string, { side: PinSide; inset: number }>();
    for (const side of ["start", "end"] as const) {
      // Only VISIBLE pinned columns have a rendered cell to stick — a hidden
      // pinned key stays out of the map and reads back as unpinned.
      const samePinned = visibleColumns.filter(
        (c) => state.pinned[c.key] === side
      );
      // Start: sum widths before each column; end: sum widths after it.
      const ordered = side === "start" ? samePinned : [...samePinned].reverse();
      let inset = 0;
      for (const column of ordered) {
        insets.set(column.key, { side, inset });
        inset += resolveWidth(column);
      }
    }
    return insets;
  }, [state.pinned, state.widths, visibleColumns]);

  const pinOffset = useCallback(
    (key: string) => pinInsets.get(key),
    [pinInsets]
  );

  return {
    state,
    visibleColumns,
    isHidden,
    setHidden,
    toggleVisible,
    setPinned,
    move,
    setWidth,
    pinOffset,
    reset,
    toggleColumnGroup,
  };
}
