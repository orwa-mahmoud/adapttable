/**
 * Cell save state — pending, failed, rollback — over core's save store.
 */
import {
  type CellSaveState,
  cellSaveView,
  createCellSaveStore,
  type EditEventHandler,
} from "@adapttable/core";
import {
  assertInInjectionContext,
  computed,
  effect,
  inject,
  Injector,
  type Signal,
} from "@angular/core";

import { fromStore } from "../store";

/**
 * Options for {@link injectCellSaveState}.
 *
 * @public
 */
export interface CellSaveStateInjectOptions<TRow> {
  /**
   * Put the previous row back after a rejected save. Without it the table
   * marks the cell failed and leaves the value where it is.
   */
  readonly onRollback?: (previous: TRow, columnKey: string) => void;
  /** Turn a rejection into the sentence the cell shows. */
  readonly formatError?: (error: unknown) => string;
  /** Observe a rejected save — never owns the outcome. */
  readonly onEditError?: EditEventHandler<TRow>;
  /** The injector to run in. */
  readonly injector?: Injector;
}

/**
 * Headless save state for inline editing.
 *
 * @public
 */
export function injectCellSaveState<TRow>(
  options: CellSaveStateInjectOptions<TRow> = {}
): Signal<CellSaveState<TRow>> {
  if (!options.injector) assertInInjectionContext(injectCellSaveState);
  const injector = options.injector ?? inject(Injector);
  const store = createCellSaveStore<TRow>(options);
  effect(
    () => {
      store.configure(options);
    },
    { injector }
  );
  const snapshot = fromStore(store, { injector });
  const canRollback = options.onRollback !== undefined;
  return computed(() => cellSaveView(store, snapshot(), canRollback));
}

export type {
  CellSaveState,
  CellSaveStatus,
  FailedCellSave,
} from "@adapttable/core";
