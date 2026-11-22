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
  EMPTY_ROW_PIN_STATE,
  type RowAction,
  type RowPinLabels,
  type RowPinSide,
  type RowPinState,
} from "@adapttable/core";
import {
  commitRowPin,
  rekeyRowPins,
  ROW_PIN_STORE_OPTIONS,
  rowPinActions,
  type RowPinningState,
  rowPinSideOf,
} from "@adapttable/core/binding";
import { useCallback, useMemo } from "react";

import { useControllableStore } from "../hooks/useControllableStore";
import { useEventCallback } from "../hooks/useEventCallback";
export type { RowPinSide, RowPinState } from "@adapttable/core";
export { applyRowPin, partitionPinnedRows } from "@adapttable/core";
export {
  PIN_BOTTOM_ACTION_KEY,
  PIN_TOP_ACTION_KEY,
  type RowPinLabels,
  UNPIN_ROW_ACTION_KEY,
} from "@adapttable/core";
export { EMPTY_ROW_PIN_STATE } from "@adapttable/core";
export type { RowPinningState } from "@adapttable/core/binding";
export { rowPinSignature } from "@adapttable/core/binding";

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
    ROW_PIN_STORE_OPTIONS,
    rekeyRowPins
  );

  const pin = useEventCallback((rowId: string, side: RowPinSide) => {
    commitRowPin(store, enabled, rowId, side);
  });
  const unpin = useEventCallback((rowId: string) => {
    commitRowPin(store, enabled, rowId, undefined);
  });

  const sideOf = useCallback(
    (rowId: string): RowPinSide | undefined => rowPinSideOf(state, rowId),
    [state]
  );

  const getRowId = useEventCallback(options.getRowId);

  const actions = useMemo<readonly RowAction<TRow>[]>(
    () =>
      enabled ? rowPinActions({ labels, getRowId, sideOf, pin, unpin }) : [],
    [enabled, getRowId, labels, pin, sideOf, unpin]
  );

  return useMemo(
    () => ({ state, sideOf, pin, unpin, actions }),
    [actions, pin, sideOf, state, unpin]
  );
}
