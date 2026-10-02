/**
 * Row pinning — the asking, never the data. A pinned row leaves the scrolling
 * rows and renders above or below them; the lists are the host's or the
 * table's own, and the table never mutates the rows. Grouping and trees
 * refuse it: a nested list is not a flat pin stack.
 */
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
  assertInInjectionContext,
  computed,
  inject,
  Injector,
  type Signal,
  untracked,
} from "@angular/core";

import {
  fromStore,
  type MaybeSignal,
  type MaybeSignalOptional,
  readMaybe,
} from "../store";

export type { RowPinLabels, RowPinSide } from "@adapttable/core";
export type { RowPinningState } from "@adapttable/core/binding";

/**
 * Options for {@link injectRowPinning}.
 *
 * @public
 */
export interface RowPinningOptions<TRow> {
  /** Whether pinning runs; every action does nothing while it does not. */
  readonly enabled: MaybeSignal<boolean>;
  /** The pinned rows, when the host holds them. Omit to let the table. */
  readonly pinnedRowIds?: MaybeSignalOptional<RowPinState>;
  /** Told the next lists whenever a row is pinned or unpinned. */
  readonly onPinnedRowIdsChange?: (next: RowPinState) => void;
  /** Row identity. */
  readonly getRowId: (row: TRow) => string;
  /** The pin actions' names. */
  readonly labels: MaybeSignal<RowPinLabels>;
  /** The injector whose lifetime the state follows. */
  readonly injector?: Injector;
}

/**
 * Row pinning as a signal: the lists, which side a row is on, pin and unpin,
 * and the pin entries for the row actions menu.
 *
 * @param options - See {@link RowPinningOptions}.
 * @returns The state, as a signal.
 *
 * @public
 */
export function injectRowPinning<TRow>(
  options: RowPinningOptions<TRow>
): Signal<RowPinningState<TRow>> {
  if (!options.injector) assertInInjectionContext(injectRowPinning);
  const injector = options.injector ?? inject(Injector);
  const store = createControllableStore<RowPinState>(
    EMPTY_ROW_PIN_STATE,
    ROW_PIN_STORE_OPTIONS
  );
  const own = fromStore(store, { injector });
  const controlled = computed(() =>
    options.pinnedRowIds === undefined
      ? undefined
      : readMaybe(options.pinnedRowIds)
  );
  const enabled = computed(() => readMaybe(options.enabled));
  // Every action hands the store the host's current value first, so a
  // controlled pin computes from what the host holds now.
  const commit = (rowId: string, side: RowPinSide | undefined): void => {
    store.control({
      value: untracked(controlled),
      onChange: options.onPinnedRowIdsChange,
    });
    commitRowPin(store, untracked(enabled), rowId, side);
  };
  const pin = (rowId: string, side: RowPinSide): void => {
    commit(rowId, side);
  };
  const unpin = (rowId: string): void => {
    commit(rowId, undefined);
  };
  const state = computed(() => controlled() ?? own());
  const sideOf = computed(
    () =>
      (rowId: string): RowPinSide | undefined =>
        rowPinSideOf(state(), rowId)
  );
  const actions = computed(() => {
    if (!enabled()) return [];
    const labels = readMaybe(options.labels);
    const side = sideOf();
    return rowPinActions<TRow>({
      labels,
      getRowId: options.getRowId,
      sideOf: side,
      pin,
      unpin,
    });
  });
  return computed((): RowPinningState<TRow> => ({
    state: state(),
    sideOf: sideOf(),
    pin,
    unpin,
    actions: actions(),
  }));
}
