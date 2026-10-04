/** Vue lifetime and reactivity for the neutral controllable pin store. */
import {
  commitRowPin,
  createControllableStore,
  EMPTY_ROW_PIN_STATE,
  ROW_PIN_STORE_OPTIONS,
  rowPinActions,
  type RowPinLabels,
  type RowPinSide,
  rowPinSideOf,
  type RowPinState,
} from "@adapttable/core";
import type { RowPinningState } from "@adapttable/core/binding";
import {
  computed,
  type ComputedRef,
  type MaybeRefOrGetter,
  onScopeDispose,
  toValue,
} from "vue";

import {
  type MaybeRefOrGetterOptional,
  requireScope,
  useExternalStore,
  useScopeActivity,
} from "../store";
export type {
  RowAction,
  RowPinLabels,
  RowPinSide,
  RowPinState,
} from "@adapttable/core";
export {
  applyRowPin,
  EMPTY_ROW_PIN_STATE,
  partitionPinnedRows,
  PIN_BOTTOM_ACTION_KEY,
  PIN_TOP_ACTION_KEY,
  UNPIN_ROW_ACTION_KEY,
} from "@adapttable/core";
export type { RowPinningState } from "@adapttable/core/binding";
export { rowPinSignature } from "@adapttable/core/binding";

/** Callbacks remain callbacks; only state values accept a ref or getter. @public */
export interface RowPinningOptions<TRow> {
  readonly enabled: MaybeRefOrGetter<boolean>;
  readonly pinnedRowIds?: MaybeRefOrGetterOptional<RowPinState>;
  readonly onPinnedRowIdsChange?: (next: RowPinState) => void;
  readonly getRowId: (row: TRow) => string;
  readonly labels: MaybeRefOrGetter<RowPinLabels>;
}
/** Controlled lists stay authoritative; retained actions stop with their scope. @public */
export function useRowPinning<TRow>(
  input: MaybeRefOrGetter<RowPinningOptions<TRow>>
): ComputedRef<RowPinningState<TRow>> {
  requireScope("useRowPinning");
  const options = computed(() => toValue(input));
  const active = useScopeActivity();
  let disposed = false;
  onScopeDispose(() => {
    disposed = true;
  });
  const store = createControllableStore<RowPinState>(EMPTY_ROW_PIN_STATE, {
    ...ROW_PIN_STORE_OPTIONS,
    observeUncontrolled: true,
  });
  const own = useExternalStore(store);
  const enabled = computed(
    () => !disposed && active.value && toValue(options.value.enabled)
  );
  const state = computed(
    () => toValue(options.value.pinnedRowIds) ?? own.value
  );
  const sideOf = (rowId: string): RowPinSide | undefined =>
    rowPinSideOf(state.value, rowId);
  const commit = (rowId: string, side: RowPinSide | undefined): void => {
    if (!enabled.value || disposed) return;
    const current = options.value;
    store.control({
      value: toValue(current.pinnedRowIds),
      onChange: current.onPinnedRowIdsChange,
    });
    commitRowPin(store, true, rowId, side);
  };
  const pin = (rowId: string, side: RowPinSide): void => commit(rowId, side);
  const unpin = (rowId: string): void => commit(rowId, undefined);
  return computed(() => ({
    state: state.value,
    sideOf,
    pin,
    unpin,
    actions: enabled.value
      ? rowPinActions({
          labels: toValue(options.value.labels),
          getRowId: (row) => options.value.getRowId(row),
          sideOf,
          pin,
          unpin,
        })
      : [],
  }));
}
