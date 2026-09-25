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
import {
  applyRowPin,
  type ControllableStoreOptions,
  type RowAction,
  rowPinSideOf,
  sameRowPins,
} from "@adapttable/core";
import { useCallback, useMemo } from "react";

import { useControllableStore } from "../hooks/useControllableStore";
import { useEventCallback } from "../hooks/useEventCallback";

export { applyRowPin, partitionPinnedRows } from "@adapttable/core";
export { rowPinSignature } from "@adapttable/core/binding";

/**
 * Which edge a pinned row sticks to.
 *
 * @public
 */
export type RowPinSide = "top" | "bottom";

/**
 * Controlled pin lists — ids in dataset order within each edge.
 *
 * @public
 */
export interface RowPinState {
  /** Row ids pinned to the top. */
  readonly top: readonly string[];
  /** Row ids pinned to the bottom. */
  readonly bottom: readonly string[];
}

/**
 * Empty pin lists — omit `pinnedRowIds` and this is what the table holds.
 *
 * @public
 */
export const EMPTY_ROW_PIN_STATE: RowPinState = { top: [], bottom: [] };

/**
 * Synthesized "Pin to top" action.
 *
 * @public
 */
export const PIN_TOP_ACTION_KEY = "adapttable:pin-row-top";
/**
 * Synthesized "Pin to bottom" action.
 *
 * @public
 */
export const PIN_BOTTOM_ACTION_KEY = "adapttable:pin-row-bottom";
/**
 * Synthesized "Unpin" action.
 *
 * @public
 */
export const UNPIN_ROW_ACTION_KEY = "adapttable:unpin-row";

/**
 * Labels the pin actions and the live region need.
 *
 * @public
 */
export interface RowPinLabels {
  /** Pin the row to the top. */
  pinToTop: string;
  /** Pin the row to the bottom. */
  pinToBottom: string;
  /** Return the row to the scroll area. */
  unpinRow: string;
}

/**
 * Headless pin state adapters read.
 *
 * @public
 */
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

/** A commit that leaves the lists as they are changes nothing. */
const PIN_STORE_OPTIONS: ControllableStoreOptions<RowPinState> = {
  equals: sameRowPins,
};

/**
 * Headless row pinning. Inert until the host passes `enabled`;
 * omit the prop and this hook still runs (Rules of Hooks) but every action no-ops.
 *
 * @public
 */
export function useRowPinning<TRow>(options: {
  enabled: boolean;
  pinnedRowIds?: RowPinState;
  onPinnedRowIdsChange?: (next: RowPinState) => void;
  getRowId: (row: TRow) => string;
  labels: RowPinLabels;
}): RowPinningState<TRow> {
  const { enabled, labels } = options;
  const [state, store] = useControllableStore<RowPinState>(
    () => EMPTY_ROW_PIN_STATE,
    { value: options.pinnedRowIds, onChange: options.onPinnedRowIdsChange },
    PIN_STORE_OPTIONS
  );

  const pin = useEventCallback((rowId: string, side: RowPinSide) => {
    if (enabled) store.update((current) => applyRowPin(current, rowId, side));
  });
  const unpin = useEventCallback((rowId: string) => {
    if (enabled) {
      store.update((current) => applyRowPin(current, rowId, undefined));
    }
  });

  const sideOf = useCallback(
    (rowId: string): RowPinSide | undefined => rowPinSideOf(state, rowId),
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
