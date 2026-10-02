/**
 * Unsaved cell marks as Angular signals over core's dirty-cell store.
 */
import {
  createDirtyCellStore,
  type DirtyCellState,
  dirtyCellView,
} from "@adapttable/core";
import {
  assertInInjectionContext,
  computed,
  effect,
  inject,
  Injector,
  type Signal,
  untracked,
} from "@angular/core";

import { fromStore, type MaybeSignal, readMaybe } from "../store";

export type { DirtyCellState } from "@adapttable/core";

/**
 * Unsaved edits reported to the host, with stable confirmation operations.
 *
 * @public
 */
export type DirtyEdits = Readonly<
  Pick<DirtyCellState, "count" | "confirm" | "confirmRow" | "confirmAll">
>;

/**
 * Options for {@link injectDirtyCells}.
 *
 * @public
 */
export interface DirtyCellsOptions {
  /** Whether to track marks. Off by default. */
  readonly enabled?: MaybeSignal<boolean>;
  /** Report once on mount and whenever the set of unsaved edits changes. */
  readonly onDirtyChange?: (dirty: DirtyEdits) => void;
  /** The injector to run in. Omit inside an injection context. */
  readonly injector?: Injector;
}

/**
 * Track edits until the host confirms them, without owning any row data.
 *
 * @public
 */
export function injectDirtyCells(
  options: DirtyCellsOptions = {}
): Signal<DirtyCellState> {
  if (!options.injector) assertInInjectionContext(injectDirtyCells);
  const injector = options.injector ?? inject(Injector);
  const config = computed(() => ({
    enabled: readMaybe(options.enabled ?? false),
  }));
  const store = createDirtyCellStore(config());
  effect(
    () => {
      store.configure(config());
    },
    { injector }
  );
  const snapshot = fromStore(store, { injector });
  const state = computed(() => dirtyCellView(store, snapshot()));
  if (options.onDirtyChange) {
    effect(
      () => {
        const { count, confirm, confirmRow, confirmAll } = state();
        untracked(() => {
          options.onDirtyChange?.({ count, confirm, confirmRow, confirmAll });
        });
      },
      { injector }
    );
  }
  return state;
}
