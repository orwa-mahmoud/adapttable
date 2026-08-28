/**
 * Row pinning — the asking, never the data.
 *
 * A pinned row stays put through scroll: it leaves the virtual window and
 * renders in a sticky section above or below it. The host owns the id lists
 * (`pinnedRowIds` / `onPinnedRowIdsChange`); the table never mutates them.
 * Grouping and trees refuse it the same way they refuse reorder — a nested
 * list is not a flat pin stack.
 *
 * Mobile cards are a list, not a grid: the pin actions write the same state,
 * but there is no sticky chrome. The order of the list still puts top pins
 * first and bottom pins last.
 */
import { useCallback, useMemo, useRef, useState } from "react";

import { useEventCallback } from "../hooks/useEventCallback";
import type { RowAction } from "../types";

/** Which edge a pinned row sticks to. */
export type RowPinSide = "top" | "bottom";

/** Controlled pin lists — ids in dataset order within each edge. */
export interface RowPinState {
  readonly top: readonly string[];
  readonly bottom: readonly string[];
}

/** Empty pin lists — omit `pinnedRowIds` and this is what the table holds. */
export const EMPTY_ROW_PIN_STATE: RowPinState = { top: [], bottom: [] };

/** Synthesized "Pin to top" action. */
export const PIN_TOP_ACTION_KEY = "adapttable:pin-row-top";
/** Synthesized "Pin to bottom" action. */
export const PIN_BOTTOM_ACTION_KEY = "adapttable:pin-row-bottom";
/** Synthesized "Unpin" action. */
export const UNPIN_ROW_ACTION_KEY = "adapttable:unpin-row";

/** Labels the pin actions and the live region need. */
export interface RowPinLabels {
  pinToTop: string;
  pinToBottom: string;
  unpinRow: string;
}

/** Headless pin state adapters read. */
export interface RowPinningState<TRow> {
  /** Current lists. */
  state: RowPinState;
  /** Which edge a row is pinned to, if any. */
  sideOf: (rowId: string) => RowPinSide | undefined;
  /** Pin a row to an edge (moves it if it was on the other). */
  pin: (rowId: string, side: RowPinSide) => void;
  /** Remove a row from both edges. */
  unpin: (rowId: string) => void;
  /** Pin actions, hidden per row so a top-pinned row does not offer Pin to top. */
  actions: readonly RowAction<TRow>[];
}

/** Split a row list into top pins, the scroll window, and bottom pins. */
export function partitionPinnedRows<TRow>(
  rows: readonly TRow[],
  state: RowPinState,
  getRowId: (row: TRow) => string
): { top: TRow[]; scroll: TRow[]; bottom: TRow[] } {
  const topSet = new Set(state.top);
  const bottomSet = new Set(state.bottom);
  const byId = new Map<string, TRow>();
  for (const row of rows) byId.set(getRowId(row), row);
  const top: TRow[] = [];
  for (const id of state.top) {
    const row = byId.get(id);
    if (row !== undefined) top.push(row);
  }
  const bottom: TRow[] = [];
  for (const id of state.bottom) {
    const row = byId.get(id);
    if (row !== undefined) bottom.push(row);
  }
  const scroll: TRow[] = [];
  for (const row of rows) {
    const id = getRowId(row);
    if (!topSet.has(id) && !bottomSet.has(id)) scroll.push(row);
  }
  return { top, scroll, bottom };
}

/** Memo digest so a virtualized row repaints when it is pinned or unpinned. */
export function rowPinSignature(
  pinning: Pick<RowPinningState<unknown>, "sideOf"> | undefined,
  rowId: string
): string | null {
  if (!pinning) return null;
  return pinning.sideOf(rowId) ?? "";
}

function withoutId(ids: readonly string[], rowId: string): string[] {
  return ids.filter((id) => id !== rowId);
}

function withId(ids: readonly string[], rowId: string): string[] {
  return ids.includes(rowId) ? [...ids] : [...ids, rowId];
}

/** Apply a pin or unpin to a copy of the state. */
export function applyRowPin(
  state: RowPinState,
  rowId: string,
  side: RowPinSide | undefined
): RowPinState {
  const top = withoutId(state.top, rowId);
  const bottom = withoutId(state.bottom, rowId);
  if (side === "top") return { top: withId(top, rowId), bottom };
  if (side === "bottom") return { top, bottom: withId(bottom, rowId) };
  return { top, bottom };
}

function sameLists(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((id, index) => id === b[index]);
}

function sameState(a: RowPinState, b: RowPinState): boolean {
  return sameLists(a.top, b.top) && sameLists(a.bottom, b.bottom);
}

/**
 * Headless row pinning. Inert until the host passes `enabled`;
 * omit the prop and this hook still runs (Rules of Hooks) but every action no-ops.
 */
export function useRowPinning<TRow>(options: {
  enabled: boolean;
  pinnedRowIds?: RowPinState;
  onPinnedRowIdsChange?: (next: RowPinState) => void;
  getRowId: (row: TRow) => string;
  labels: RowPinLabels;
}): RowPinningState<TRow> {
  const { enabled, labels } = options;
  const controlledValue = options.pinnedRowIds;
  const onChange = options.onPinnedRowIdsChange;
  const [internal, setInternal] = useState<RowPinState>(EMPTY_ROW_PIN_STATE);
  const controlled = controlledValue !== undefined;
  const state = controlledValue ?? internal;

  const modeRef = useRef({ controlled, onChange, state, enabled });
  modeRef.current = { controlled, onChange, state, enabled };

  const commit = useCallback((next: RowPinState) => {
    const live = modeRef.current;
    if (!live.enabled) return;
    if (sameState(live.state, next)) return;
    if (live.controlled) {
      live.onChange?.(next);
    } else {
      setInternal(next);
    }
  }, []);

  const pin = useEventCallback((rowId: string, side: RowPinSide) => {
    commit(applyRowPin(modeRef.current.state, rowId, side));
  });
  const unpin = useEventCallback((rowId: string) => {
    commit(applyRowPin(modeRef.current.state, rowId, undefined));
  });

  const sideOf = useCallback(
    (rowId: string): RowPinSide | undefined => {
      if (state.top.includes(rowId)) return "top";
      if (state.bottom.includes(rowId)) return "bottom";
      return undefined;
    },
    [state]
  );

  const getRowId = useEventCallback(options.getRowId);

  const actions = useMemo<readonly RowAction<TRow>[]>(() => {
    if (!enabled) return [];
    return [
      {
        key: PIN_TOP_ACTION_KEY,
        label: labels.pinToTop,
        isHidden: (row) => sideOf(getRowId(row)) === "top",
        onClick: (row) => {
          pin(getRowId(row), "top");
        },
      },
      {
        key: PIN_BOTTOM_ACTION_KEY,
        label: labels.pinToBottom,
        isHidden: (row) => sideOf(getRowId(row)) === "bottom",
        onClick: (row) => {
          pin(getRowId(row), "bottom");
        },
      },
      {
        key: UNPIN_ROW_ACTION_KEY,
        label: labels.unpinRow,
        isHidden: (row) => sideOf(getRowId(row)) === undefined,
        onClick: (row) => {
          unpin(getRowId(row));
        },
      },
    ];
  }, [enabled, getRowId, labels, pin, sideOf, unpin]);

  return useMemo(
    () => ({ state, sideOf, pin, unpin, actions }),
    [actions, pin, sideOf, state, unpin]
  );
}
