/**
 * Validation that gates a commit.
 *
 * A newer check of the same cell supersedes an older one. A late answer is
 * ignored, so it cannot replace the message or the draft the cell holds now.
 */
import { rekeyIdMap, type RowRekeyMoves } from "../state/rowRekeys";
import type { TableStore } from "../state/tableStore";
import {
  cellIdentity,
  cellIdentityParts,
  cellKeysByRow,
  rekeyCellMap,
  rekeyCellSet,
} from "./cellIdentity";
import type {
  CellValidator,
  RowValidator,
  ValidationTarget,
} from "./editContracts";
import { stateCell } from "./storePlumbing";

/* ── Validation ────────────────────────────────────────────────────── */

/**
 * Outcome of a validation check.
 *
 * @public
 */
export interface ValidationCheckResult {
  /** Whether the commit may proceed. */
  allowed: boolean;
  /** The message that refused it, when one did. */
  error?: string;
}

/**
 * Every validation message and in-flight check.
 *
 * @public
 */
export interface EditValidationSnapshot {
  /** Messages marking single cells. */
  readonly cellErrors: ReadonlyMap<string, string>;
  /** Messages marking whole rows. */
  readonly rowErrors: ReadonlyMap<string, string>;
  /** Cells whose check is still running. */
  readonly validating: ReadonlySet<string>;
}

/**
 * What validation checks with.
 *
 * @public
 */
export interface EditValidationStoreOptions<TRow> {
  /** The row-level validator, when the host declared one. */
  readonly validateRow?: RowValidator<TRow>;
  /**
   * Apply an edit to a row without mutating it, so the row validator sees
   * what the commit WOULD produce. Defaults to a shallow spread keyed by the
   * column key.
   */
  readonly applyEdit?: (row: TRow, columnKey: string, value: unknown) => TRow;
}

/**
 * Validation that gates a commit.
 *
 * @public
 */
export interface EditValidationStore<TRow> {
  /** Every message and in-flight check now. */
  readonly getSnapshot: () => EditValidationSnapshot;
  /** Listen for changes. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Replace the options. */
  readonly configure: (options: EditValidationStoreOptions<TRow>) => void;
  /**
   * Check a value: the cell validator first, then the row validator against
   * the row the edit would produce. A newer check of the same cell
   * supersedes an older one, whose answer is ignored.
   */
  readonly check: (input: {
    target: ValidationTarget;
    value: unknown;
    row: TRow;
    validateCell?: CellValidator<TRow>;
  }) => Promise<ValidationCheckResult>;
  /** Clear a cell's messages and cancel its check. */
  readonly clear: (rowId: string, columnKey: string) => void;
  /** Clear every message and check. */
  readonly clearAll: () => void;
  /** Whether a row-level validator is declared. */
  readonly hasRowValidator: () => boolean;
  /**
   * Move each rekeyed row's errors to its new id. A check still running for
   * such a row is dropped; its caller sees it as not allowed.
   */
  readonly rekey: (moves: RowRekeyMoves<TRow>) => void;
}

/**
 * The key a cell's validation state is kept under.
 *
 * @public
 */
export function validationKey(rowId: string, columnKey: string): string {
  return cellIdentity(rowId, columnKey);
}

/**
 * A cell's validation message, if any.
 *
 * @public
 */
export function validationErrorFor(
  snapshot: EditValidationSnapshot,
  rowId: string,
  columnKey: string
): string | undefined {
  return snapshot.cellErrors.get(validationKey(rowId, columnKey));
}

/**
 * Whether a row carries any validation message, on itself or a cell.
 *
 * @public
 */
export function rowHasValidationError(
  snapshot: EditValidationSnapshot,
  rowId: string
): boolean {
  return (
    snapshot.rowErrors.has(rowId) ||
    cellKeysByRow(snapshot.cellErrors).has(rowId)
  );
}

/**
 * A value-comparable digest of the validation state, for a memoized row.
 *
 * @public
 */
export function validationSignature(snapshot: EditValidationSnapshot): string {
  const { cellErrors, rowErrors, validating } = snapshot;
  if (cellErrors.size + rowErrors.size + validating.size === 0) return "";
  return JSON.stringify([[...cellErrors], [...rowErrors], [...validating]]);
}

function shallowApplyEdit<TRow>(
  row: TRow,
  columnKey: string,
  value: unknown
): TRow {
  return { ...row, [columnKey]: value };
}

/**
 * Create validation.
 *
 * @public
 */
export function createEditValidationStore<TRow>(
  options: EditValidationStoreOptions<TRow> = {},
  within: { readonly store?: TableStore } = {}
): EditValidationStore<TRow> {
  let current = options;
  const state = stateCell<EditValidationSnapshot>(
    "edit-validation",
    {
      cellErrors: new Map(),
      rowErrors: new Map(),
      validating: new Set(),
    },
    within.store
  );
  const cellMessages = new Map<string, string>();
  const rowFieldMessages = new Map<string, string>();
  const rowFields = new Map<string, Set<string>>();
  const tokens = new Map<string, symbol>();

  const setMap = (
    field: "cellErrors" | "rowErrors",
    key: string,
    message: string | undefined
  ): void => {
    const map = state.get()[field];
    if (map.get(key) === message) return;
    const next = new Map(map);
    if (message === undefined) next.delete(key);
    else next.set(key, message);
    state.set({ ...state.get(), [field]: next });
  };
  const publishCellError = (key: string): void =>
    setMap(
      "cellErrors",
      key,
      cellMessages.get(key) ?? rowFieldMessages.get(key)
    );
  const setCellError = (key: string, message?: string): void => {
    if (message === undefined) cellMessages.delete(key);
    else cellMessages.set(key, message);
    publishCellError(key);
  };
  const setRowError = (rowId: string, message?: string): void =>
    setMap("rowErrors", rowId, message);

  const replaceRowFields = (
    rowId: string,
    verdict?: Record<string, string>
  ): void => {
    const previous = rowFields.get(rowId) ?? new Set<string>();
    for (const key of previous) rowFieldMessages.delete(key);
    const next = new Set<string>();
    for (const [columnKey, message] of Object.entries(verdict ?? {})) {
      const key = validationKey(rowId, columnKey);
      next.add(key);
      rowFieldMessages.set(key, message);
    }
    if (next.size > 0) rowFields.set(rowId, next);
    else rowFields.delete(rowId);
    for (const key of new Set([...previous, ...next])) publishCellError(key);
  };

  const markValidating = (key: string, busy: boolean): void => {
    if (state.get().validating.has(key) === busy) return;
    const validating = new Set(state.get().validating);
    if (busy) validating.add(key);
    else validating.delete(key);
    state.set({ ...state.get(), validating });
  };

  const settle = (
    verdict: string | Record<string, string> | undefined,
    target: ValidationTarget
  ): ValidationCheckResult => {
    const key = validationKey(target.rowId, target.columnKey);
    replaceRowFields(
      target.rowId,
      typeof verdict === "object" ? verdict : undefined
    );
    setCellError(key);
    if (verdict === undefined) {
      setRowError(target.rowId);
      return { allowed: true };
    }
    if (typeof verdict === "string") {
      setRowError(target.rowId, verdict);
      return { allowed: false, error: verdict };
    }
    setRowError(target.rowId);
    const firstKey = Object.keys(verdict)[0];
    if (firstKey === undefined) return { allowed: true };
    return {
      allowed: false,
      error: verdict[target.columnKey] ?? verdict[firstKey],
    };
  };

  return {
    getSnapshot: state.get,
    subscribe: state.subscribe,
    configure(next) {
      current = next;
    },
    async check(input) {
      const { target, value, row, validateCell } = input;
      const { validateRow, applyEdit = shallowApplyEdit } = current;
      const key = validationKey(target.rowId, target.columnKey);
      if (!validateCell && !validateRow) {
        tokens.delete(key);
        markValidating(key, false);
        return settle(undefined, target);
      }
      const token = Symbol();
      tokens.set(key, token);
      const live = (): boolean => tokens.get(key) === token;
      markValidating(key, true);
      try {
        const cellMessage = await validateCell?.(value, row);
        if (!live()) return { allowed: false };
        if (cellMessage !== undefined) {
          setCellError(key, cellMessage);
          setRowError(target.rowId);
          return { allowed: false, error: cellMessage };
        }
        const rowVerdict = await validateRow?.(
          applyEdit(row, target.columnKey, value)
        );
        if (!live()) return { allowed: false };
        return settle(rowVerdict, target);
      } finally {
        if (live()) {
          tokens.delete(key);
          markValidating(key, false);
        }
      }
    },
    clear(rowId, columnKey) {
      const key = validationKey(rowId, columnKey);
      tokens.delete(key);
      rowFieldMessages.delete(key);
      const fields = rowFields.get(rowId);
      fields?.delete(key);
      if (fields?.size === 0) rowFields.delete(rowId);
      setCellError(key);
      setRowError(rowId);
      markValidating(key, false);
    },
    clearAll() {
      tokens.clear();
      cellMessages.clear();
      rowFieldMessages.clear();
      rowFields.clear();
      state.set({
        cellErrors: new Map(),
        rowErrors: new Map(),
        validating: new Set(),
      });
    },
    rekey(moves) {
      const { ids } = moves;
      const snapshot = state.get();
      const cellErrors = rekeyCellMap(snapshot.cellErrors, ids);
      const rowErrors = rekeyIdMap(snapshot.rowErrors, ids);
      const movedChecks = [...tokens.keys()].filter((key) =>
        ids.has(cellIdentityParts(key)[0])
      );
      if (
        cellErrors === snapshot.cellErrors &&
        rowErrors === snapshot.rowErrors &&
        movedChecks.length === 0
      )
        return;
      for (const key of movedChecks) tokens.delete(key);
      const validating = new Set(snapshot.validating);
      for (const key of movedChecks) validating.delete(key);
      replaceAll(cellMessages, rekeyCellMap(cellMessages, ids));
      replaceAll(rowFieldMessages, rekeyCellMap(rowFieldMessages, ids));
      const fields = [...rowFields].map(
        ([rowId, keys]): [string, Set<string>] => [
          ids.get(rowId) ?? rowId,
          new Set(rekeyCellSet(keys, ids)),
        ]
      );
      rowFields.clear();
      for (const [rowId, keys] of fields) rowFields.set(rowId, keys);
      state.set({ ...snapshot, cellErrors, rowErrors, validating });
    },
    hasRowValidator: () => current.validateRow !== undefined,
  };
}

/** Refill a map with another's entries. */
function replaceAll<T>(
  target: Map<string, T>,
  source: ReadonlyMap<string, T>
): void {
  if (source === target) return;
  const entries = [...source];
  target.clear();
  for (const [key, value] of entries) target.set(key, value);
}
