import { useCallback, useMemo, useRef, useState } from "react";

import type { ColumnDef } from "../types";
import { FALLBACK_PIN_WIDTH, parsePxWidth } from "./columnWidths";

/** Edge a column can be pinned to — logical, so it follows the writing
 *  direction (`"start"` is the right edge under `dir="rtl"`). */
export type PinSide = "start" | "end";

/**
 * User-driven column layout: which columns are hidden, their order, pinning,
 * and widths. Keyed by column `key`. Empty `order` means "declared order".
 */
export interface ColumnLayoutState {
  /** Column keys hidden by the user. */
  hidden: readonly string[];
  /** Explicit column order by key; empty falls back to declared order. */
  order: readonly string[];
  /** Per-column edge pinning. */
  pinned: Readonly<Record<string, PinSide>>;
  /** Per-column pixel widths. */
  widths: Readonly<Record<string, number>>;
}

/** An empty layout — declared order, nothing hidden/pinned/resized. */
export const EMPTY_COLUMN_LAYOUT: ColumnLayoutState = {
  hidden: [],
  order: [],
  pinned: {},
  widths: {},
};

/** Options for {@link useColumnLayout}. */
export interface UseColumnLayoutOptions<TRow> {
  /** All declared columns (already filtered for the current device layout). */
  columns: readonly ColumnDef<TRow>[];
  /** Controlled layout state. Omit for uncontrolled (internal) state. */
  layout?: ColumnLayoutState;
  /** Change handler; required for the controlled mode to update. */
  onLayoutChange?: (next: ColumnLayoutState) => void;
  /** Initial layout for the uncontrolled mode. */
  defaultColumnLayout?: Partial<ColumnLayoutState>;
  /** Alias for `defaultColumnLayout` (v1 name) — deleted before the 2.0.0 release. */
  defaultLayout?: Partial<ColumnLayoutState>;
}

/** Result of {@link useColumnLayout}. */
export interface UseColumnLayoutResult<TRow> {
  /** The current layout state (controlled value or internal). */
  state: ColumnLayoutState;
  /** Declared columns reordered then filtered by the user's hidden set. */
  visibleColumns: ColumnDef<TRow>[];
  /** Whether a column key is currently hidden. */
  isHidden: (key: string) => boolean;
  /** Show/hide a single column. */
  setHidden: (key: string, hidden: boolean) => void;
  /** Toggle a single column's visibility. */
  toggleVisible: (key: string) => void;
  /** Pin a column to an edge, or unpin it with `undefined`. */
  setPinned: (key: string, side: PinSide | undefined) => void;
  /** Move a column to a new index among the visible columns. */
  move: (key: string, toIndex: number) => void;
  /** Set (or clear, with `undefined`) a column's pixel width. */
  setWidth: (key: string, width: number | undefined) => void;
  /** Sticky inset (px) for a pinned column, by side. `undefined` if unpinned. */
  pinOffset: (key: string) => PinOffset | undefined;
  /** Restore the empty layout (all visible, declared order). */
  reset: () => void;
}

/** A pinned column's side plus its sticky inset in px. */
export interface PinOffset {
  side: PinSide;
  inset: number;
}

/**
 * Minimal sticky-positioning style for a pinned cell, from a pin offset.
 * Uses logical inset properties so pinning follows the writing direction:
 * a `"start"`-pinned column sticks to the inline START (the right edge under
 * `dir="rtl"`), matching antd's native `fixed` behaviour.
 */
export interface PinnedCellStyle {
  position: "sticky";
  insetInlineStart?: number;
  insetInlineEnd?: number;
  zIndex: number;
}

/**
 * Stacking order for sticky table cells, lowest → highest. A pinned body cell
 * must sit above plain scrolled cells; a sticky header above all body cells;
 * and a pinned header (the corner) above everything — otherwise a pinned
 * column's body cells paint over the sticky header on vertical scroll, and
 * later headers paint over a pinned header on horizontal scroll.
 */
export const PIN_Z = {
  body: 1,
  header: 2,
  headerPinned: 3,
} as const;

/**
 * Extra inset (px) the leading selection column / trailing actions column add
 * in front of the pinned data columns, so a start-pinned column sits just after
 * a pinned checkbox and an end-pinned column just before pinned actions.
 */
export interface PinLeads {
  start?: number;
  end?: number;
}

/** Map a pin side to its logical inset property. */
function insetProp(side: PinSide): "insetInlineStart" | "insetInlineEnd" {
  return side === "start" ? "insetInlineStart" : "insetInlineEnd";
}

/**
 * Build the sticky style for a pinned header/body cell from its pin offset.
 * Adapters spread this onto the cell and add their own opaque background.
 * `leads` shifts the cell past a pinned selection/actions edge column. Returns
 * undefined for an unpinned cell. The inset is logical (`insetInlineStart` /
 * `insetInlineEnd`), so the same style pins to the correct edge in RTL.
 */
export function pinnedCellStyle(
  offset: PinOffset | undefined,
  zIndex = 1,
  leads?: PinLeads
): PinnedCellStyle | undefined {
  if (!offset) return undefined;
  const lead = leads?.[offset.side] ?? 0;
  return {
    position: "sticky",
    [insetProp(offset.side)]: offset.inset + lead,
    zIndex,
  };
}

/**
 * Sticky style for a leading/trailing non-data column (the selection checkbox
 * at the inline start, row actions at the inline end) so it pins flush to the
 * edge whenever a data column on that side is pinned. `active` is false when
 * nothing on that side is pinned, in which case the column stays in normal
 * flow. Insets are logical, so the edge follows the writing direction.
 */
export function edgePinStyle(
  side: PinSide,
  active: boolean,
  zIndex: number = PIN_Z.body
): PinnedCellStyle | undefined {
  if (!active) return undefined;
  return { position: "sticky", [insetProp(side)]: 0, zIndex };
}

/** Order `columns` by an explicit key order, appending any unlisted columns. */
export function applyColumnOrder<TRow>(
  columns: readonly ColumnDef<TRow>[],
  order: readonly string[]
): ColumnDef<TRow>[] {
  if (order.length === 0) return [...columns];
  const byKey = new Map(columns.map((c) => [c.key, c]));
  const ordered: ColumnDef<TRow>[] = [];
  for (const key of order) {
    const col = byKey.get(key);
    if (col) {
      ordered.push(col);
      byKey.delete(key);
    }
  }
  // Columns not named in `order` keep their declared order at the end.
  for (const col of columns) if (byKey.has(col.key)) ordered.push(col);
  return ordered;
}

/**
 * Headless column-layout state. Uncontrolled by default; pass `layout` +
 * `onLayoutChange` to control it (and persist however you like — localStorage,
 * URL, server). Returns the reordered, visibility-filtered columns to render.
 *
 * @typeParam TRow - The row type.
 */
export function useColumnLayout<TRow>({
  columns,
  layout,
  onLayoutChange,
  defaultColumnLayout,
  defaultLayout,
}: UseColumnLayoutOptions<TRow>): UseColumnLayoutResult<TRow> {
  const [internal, setInternal] = useState<ColumnLayoutState>(() => ({
    ...EMPTY_COLUMN_LAYOUT,
    ...(defaultColumnLayout ?? defaultLayout),
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

  const visibleColumns = useMemo(
    () =>
      applyColumnOrder(columns, state.order).filter(
        (c) => !state.hidden.includes(c.key)
      ),
    [columns, state.order, state.hidden]
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
      commit({ ...latest, order: current });
    },
    [commit, columns]
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
  };
}
