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
import {
  type CellValidator,
  createEditValidationStore,
  rowHasValidationError,
  type RowValidator,
  type ValidationCheckResult,
  validationErrorFor,
  validationKey,
  validationSignature,
  type ValidationTarget,
} from "@adapttable/core";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

export type {
  CellValidator,
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
 * Validation state for the whole table.
 *
 * @public
 */
export interface EditValidationState<TRow> {
  /** The message on one cell, if any. */
  errorFor: (rowId: string, columnKey: string) => string | undefined;
  /** The row-level message, if any. */
  rowErrorFor: (rowId: string) => string | undefined;
  /** Whether a cell's validators are still running. */
  isValidating: (rowId: string, columnKey: string) => boolean;
  /** Whether any cell in this row carries a message. */
  rowHasError: (rowId: string) => boolean;
  /**
   * Run the validators for one commit.
   *
   * `allowed` is whether the commit may proceed. A rejection also carries
   * `error` — the sentence the editor shows — so a caller that fires in the
   * same tick as the check does not have to wait for a render to read it.
   */
  check: (options: {
    target: ValidationTarget;
    value: unknown;
    row: TRow;
    validateCell?: CellValidator<TRow>;
  }) => Promise<ValidationCheckResult>;
  /** Forget everything about one cell — what cancelling an edit does. */
  clear: (rowId: string, columnKey: string) => void;
  /** Forget every message. */
  clearAll: () => void;
  /** A digest of the messages, for a row memo comparator. */
  signature: string;
  /**
   * Whether a row validator is armed. A cell with no validator of its own still
   * has to run the check when the table has one — a cross-field rule fires on
   * whichever cell was edited.
   */
  hasRowValidator: boolean;
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
  const signature = useMemo(() => validationSignature(snapshot), [snapshot]);

  const errorFor = useCallback(
    (rowId: string, columnKey: string) =>
      validationErrorFor(snapshot, rowId, columnKey),
    [snapshot]
  );
  const rowErrorFor = useCallback(
    (rowId: string) => snapshot.rowErrors.get(rowId),
    [snapshot]
  );
  const isValidating = useCallback(
    (rowId: string, columnKey: string) =>
      snapshot.validating.has(validationKey(rowId, columnKey)),
    [snapshot]
  );
  const rowHasError = useCallback(
    (rowId: string) => rowHasValidationError(snapshot, rowId),
    [snapshot]
  );

  return useMemo(
    () => ({
      errorFor,
      rowErrorFor,
      isValidating,
      rowHasError,
      check: store.check,
      clear: store.clear,
      clearAll: store.clearAll,
      signature,
      hasRowValidator: options.validateRow !== undefined,
    }),
    [
      errorFor,
      rowErrorFor,
      isValidating,
      rowHasError,
      store,
      signature,
      options.validateRow,
    ]
  );
}
