/**
 * Validation that gates a commit — and gates nothing else.
 *
 * The host owns persistence. A validator's only power is to stop `onCellEdit`
 * from firing and to put a message on the cell; it never rejects a draft the
 * reader is still typing, never rewrites a value, and never decides what to
 * save. That boundary is what keeps validation composable with a host that
 * validates again on the server, which it will.
 *
 * Two levels, because they answer different questions. A **cell** validator
 * knows one value: is this a number, is it in range, is the SKU real. A **row**
 * validator sees the row the edit would produce and can answer the questions no
 * single cell can — an end date before its start, a total that must match its
 * parts. A cell failure marks that cell; a row failure marks the row and may
 * name cells too.
 *
 * Both may be async, because the interesting checks are: "is this username
 * taken" is a request. An async check leaves the editor open and the cell marked
 * busy rather than blocking the keystroke, and a newer draft supersedes an older
 * check — a stale answer must never mark a value the reader has already changed.
 */
import { type EditValidationState, type RowValidator } from "@adapttable/core";
import {
  createEditValidationStore,
  editValidationView,
} from "@adapttable/core/editing";
import { useMemo, useState, useSyncExternalStore } from "react";

export type {
  CellValidator,
  EditValidationState,
  RowValidator,
  ValidationCheckResult,
  ValidationTarget,
} from "@adapttable/core";

/** What {@link useEditValidation} needs. */
export interface UseEditValidationOptions<TRow> {
  /** The row-level validator, when the host declared one. */
  validateRow?: RowValidator<TRow>;
  /**
   * Apply an edit to a row without mutating it, so the row validator sees what
   * the commit WOULD produce rather than what is stored. Defaults to a shallow
   * spread keyed by the column key.
   */
  applyEdit?: (row: TRow, columnKey: string, value: unknown) => TRow;
}

/**
 * Headless validation state for inline editing.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link UseEditValidationOptions}.
 * @returns The state; inert until a validator rejects something.
 */
export function useEditValidation<TRow>(
  options: UseEditValidationOptions<TRow> = {}
): EditValidationState<TRow> {
  const [store] = useState(() => createEditValidationStore<TRow>(options));
  store.configure(options);
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
  const hasRowValidator = options.validateRow !== undefined;
  return useMemo(
    () => editValidationView(store, snapshot, hasRowValidator),
    [store, snapshot, hasRowValidator]
  );
}
