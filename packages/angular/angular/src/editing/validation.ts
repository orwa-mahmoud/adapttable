/**
 * Validation that gates a cell commit — Angular injector over core's store.
 */
import {
  createEditValidationStore,
  type EditValidationState,
  editValidationView,
  type RowValidator,
} from "@adapttable/core";
import {
  assertInInjectionContext,
  computed,
  effect,
  inject,
  Injector,
  type Signal,
} from "@angular/core";

import { fromStore, type MaybeSignal } from "../store";

/**
 * Options for {@link injectEditValidation}.
 *
 * @public
 */
export interface EditValidationInjectOptions<TRow> {
  /** The row-level validator, when the host declared one. */
  readonly validateRow?: RowValidator<TRow>;
  /**
   * Apply an edit to a row without mutating it, so the row validator sees
   * what the commit would produce.
   */
  readonly applyEdit?: (row: TRow, columnKey: string, value: unknown) => TRow;
  /** The injector to run in. */
  readonly injector?: Injector;
  /** Whether validation is armed. */
  readonly enabled?: MaybeSignal<boolean>;
}

/**
 * Headless validation state for inline editing.
 *
 * @public
 */
export function injectEditValidation<TRow>(
  options: EditValidationInjectOptions<TRow> = {}
): Signal<EditValidationState<TRow>> {
  if (!options.injector) assertInInjectionContext(injectEditValidation);
  const injector = options.injector ?? inject(Injector);
  const store = createEditValidationStore<TRow>({
    validateRow: options.validateRow,
    applyEdit: options.applyEdit,
  });
  effect(
    () => {
      store.configure({
        validateRow: options.validateRow,
        applyEdit: options.applyEdit,
      });
    },
    { injector }
  );
  const snapshot = fromStore(store, { injector });
  return computed(() =>
    editValidationView(store, snapshot(), options.validateRow !== undefined)
  );
}

export type {
  CellValidator,
  EditValidationState,
  RowValidator,
  ValidationCheckResult,
  ValidationTarget,
} from "@adapttable/core";
