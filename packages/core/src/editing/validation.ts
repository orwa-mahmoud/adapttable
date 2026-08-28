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
import { useCallback, useMemo, useRef, useState } from "react";

import { useEventCallback } from "../hooks/useEventCallback";

/** Validate one edited value. Return a message to reject it, nothing to allow. */
export type CellValidator<TRow> = (
  value: unknown,
  row: TRow
) => string | undefined | Promise<string | undefined>;

/**
 * Validate the row an edit would produce.
 *
 * Return a message for a row-level problem, a map of column key → message to
 * mark individual cells, or nothing to allow the commit.
 */
export type RowValidator<TRow> = (
  row: TRow
) =>
  | string
  | Record<string, string>
  | undefined
  | Promise<string | Record<string, string> | undefined>;

/** A cell address, as the editing state spells it. */
export interface ValidationTarget {
  /** Identity of the row. */
  rowId: string;
  /** Key of the column. */
  columnKey: string;
}

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

/** Outcome of {@link EditValidationState.check}. */
export interface ValidationCheckResult {
  /** Whether the commit may proceed. */
  allowed: boolean;
  /**
   * Why it may not, when it may not. Absent when a newer check superseded
   * this one.
   */
  error?: string;
}

/** Validation state for the whole table. */
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
 * `rowId` and `columnKey` as one map key.
 *
 * A control character rather than a printable separator, because a column key
 * is arbitrary data: any separator that can appear inside one makes two
 * different cells share a key. Written as an escape so it is visible in this
 * file rather than invisible in it — a source file carrying a raw NUL is one
 * git treats as binary, with no diff and no blame.
 */
const cellKey = (rowId: string, columnKey: string) =>
  `${rowId}\u0000${columnKey}`;

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
  const [cellErrors, setCellErrors] = useState<ReadonlyMap<string, string>>(
    () => new Map()
  );
  const [rowErrors, setRowErrors] = useState<ReadonlyMap<string, string>>(
    () => new Map()
  );
  const [validating, setValidating] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  // One token per cell, bumped on every check: a check that resolves after a
  // newer one started must not write its verdict over the newer answer.
  const tokens = useRef(new Map<string, number>());

  const setCellError = useEventCallback((key: string, message?: string) => {
    setCellErrors((current) => {
      if ((current.get(key) ?? undefined) === message) return current;
      const next = new Map(current);
      if (message === undefined) next.delete(key);
      else next.set(key, message);
      return next;
    });
  });

  const setRowError = useEventCallback((rowId: string, message?: string) => {
    setRowErrors((current) => {
      if ((current.get(rowId) ?? undefined) === message) return current;
      const next = new Map(current);
      if (message === undefined) next.delete(rowId);
      else next.set(rowId, message);
      return next;
    });
  });

  const markValidating = useEventCallback((key: string, busy: boolean) => {
    setValidating((current) => {
      if (current.has(key) === busy) return current;
      const next = new Set(current);
      if (busy) next.add(key);
      else next.delete(key);
      return next;
    });
  });

  const check = useEventCallback(
    async (input: {
      target: ValidationTarget;
      value: unknown;
      row: TRow;
      validateCell?: CellValidator<TRow>;
    }): Promise<ValidationCheckResult> => {
      const { target, value, row, validateCell } = input;
      const { validateRow, applyEdit = shallowApplyEdit } = options;
      if (!validateCell && !validateRow) return { allowed: true };

      const key = cellKey(target.rowId, target.columnKey);
      const token = (tokens.current.get(key) ?? 0) + 1;
      tokens.current.set(key, token);
      const current = () => tokens.current.get(key) === token;

      markValidating(key, true);
      try {
        const cellMessage = await validateCell?.(value, row);
        if (!current()) return { allowed: false };
        if (cellMessage !== undefined) {
          setCellError(key, cellMessage);
          setRowError(target.rowId, undefined);
          return { allowed: false, error: cellMessage };
        }
        const edited = applyEdit(row, target.columnKey, value);
        const rowVerdict = await validateRow?.(edited);
        if (!current()) return { allowed: false };
        return settleRowVerdict({
          verdict: rowVerdict,
          target,
          setCellError,
          setRowError,
        });
      } finally {
        if (current()) markValidating(key, false);
      }
    }
  );

  const clear = useEventCallback((rowId: string, columnKey: string) => {
    const key = cellKey(rowId, columnKey);
    tokens.current.set(key, (tokens.current.get(key) ?? 0) + 1);
    setCellError(key, undefined);
    setRowError(rowId, undefined);
    markValidating(key, false);
  });

  const clearAll = useEventCallback(() => {
    tokens.current.clear();
    setCellErrors(new Map());
    setRowErrors(new Map());
    setValidating(new Set());
  });

  // A value digest, so a row memo can compare messages without holding maps.
  const signature = useMemo(
    () =>
      [...cellErrors.entries(), ...rowErrors.entries(), ...validating]
        .flat()
        .join("\u0001"),
    [cellErrors, rowErrors, validating]
  );

  const errorFor = useCallback(
    (rowId: string, columnKey: string) =>
      cellErrors.get(cellKey(rowId, columnKey)),
    [cellErrors]
  );
  const rowErrorFor = useCallback(
    (rowId: string) => rowErrors.get(rowId),
    [rowErrors]
  );
  const isValidating = useCallback(
    (rowId: string, columnKey: string) =>
      validating.has(cellKey(rowId, columnKey)),
    [validating]
  );
  const rowHasError = useCallback(
    (rowId: string) => {
      if (rowErrors.has(rowId)) return true;
      const prefix = `${rowId}\u0000`;
      for (const key of cellErrors.keys()) {
        if (key.startsWith(prefix)) return true;
      }
      return false;
    },
    [cellErrors, rowErrors]
  );

  return useMemo(
    () => ({
      errorFor,
      rowErrorFor,
      isValidating,
      rowHasError,
      check,
      clear,
      clearAll,
      signature,
      hasRowValidator: options.validateRow !== undefined,
    }),
    [
      errorFor,
      rowErrorFor,
      isValidating,
      rowHasError,
      check,
      clear,
      clearAll,
      signature,
      options.validateRow,
    ]
  );
}

/**
 * Record a row validator's verdict.
 *
 * A bare string is the row's own problem; a map names cells, which is how a
 * cross-field rule points at the field the reader should look at.
 */
function settleRowVerdict(input: {
  verdict: string | Record<string, string> | undefined;
  target: ValidationTarget;
  setCellError: (key: string, message?: string) => void;
  setRowError: (rowId: string, message?: string) => void;
}): ValidationCheckResult {
  const { verdict, target, setCellError, setRowError } = input;
  const key = cellKey(target.rowId, target.columnKey);
  if (verdict === undefined) {
    setCellError(key, undefined);
    setRowError(target.rowId, undefined);
    return { allowed: true };
  }
  if (typeof verdict === "string") {
    setCellError(key, undefined);
    setRowError(target.rowId, verdict);
    return { allowed: false, error: verdict };
  }
  setRowError(target.rowId, undefined);
  for (const [columnKey, message] of Object.entries(verdict)) {
    setCellError(cellKey(target.rowId, columnKey), message);
  }
  // An empty map is a pass: the validator ran and named nothing.
  const keys = Object.keys(verdict);
  const firstKey = keys[0];
  if (firstKey === undefined) return { allowed: true };
  return {
    allowed: false,
    error: verdict[target.columnKey] ?? verdict[firstKey],
  };
}

/**
 * The row an edit would produce, without touching the stored one.
 *
 * A shallow spread keyed by the column key is right for the common case where a
 * column key IS the field. A host whose columns read nested paths passes its own
 * `applyEdit`.
 */
function shallowApplyEdit<TRow>(
  row: TRow,
  columnKey: string,
  value: unknown
): TRow {
  return { ...row, [columnKey]: value };
}
