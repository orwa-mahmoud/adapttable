/**
 * Validation that gates a commit.
 *
 * A newer check of the same cell supersedes an older one. A late answer is
 * ignored, so it cannot replace the message or the draft the cell holds now.
 */
import type {
  CellValidator,
  RowValidator,
  ValidationTarget,
} from "./editContracts";
import { listenerSet } from "./storePlumbing";

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
}

/**
 * The key a cell's validation state is kept under.
 *
 * @public
 */
export function validationKey(rowId: string, columnKey: string): string {
  return `${rowId}\u0000${columnKey}`;
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
  if (snapshot.rowErrors.has(rowId)) return true;
  const prefix = `${rowId}\u0000`;
  for (const key of snapshot.cellErrors.keys()) {
    if (key.startsWith(prefix)) return true;
  }
  return false;
}

/**
 * A value-comparable digest of the validation state, for a memoized row.
 *
 * @public
 */
export function validationSignature(snapshot: EditValidationSnapshot): string {
  return [
    ...snapshot.cellErrors.entries(),
    ...snapshot.rowErrors.entries(),
    ...snapshot.validating,
  ]
    .flat()
    .join("\u0001");
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
  options: EditValidationStoreOptions<TRow> = {}
): EditValidationStore<TRow> {
  let current = options;
  let snapshot: EditValidationSnapshot = {
    cellErrors: new Map(),
    rowErrors: new Map(),
    validating: new Set(),
  };
  const cellMessages = new Map<string, string>();
  const rowFieldMessages = new Map<string, string>();
  const rowFields = new Map<string, Set<string>>();
  const tokens = new Map<string, symbol>();
  const { subscribe, notify } = listenerSet();

  const setMap = (
    field: "cellErrors" | "rowErrors",
    key: string,
    message: string | undefined
  ): void => {
    const map = snapshot[field];
    if (map.get(key) === message) return;
    const next = new Map(map);
    if (message === undefined) next.delete(key);
    else next.set(key, message);
    snapshot = { ...snapshot, [field]: next };
    notify();
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
    if (snapshot.validating.has(key) === busy) return;
    const validating = new Set(snapshot.validating);
    if (busy) validating.add(key);
    else validating.delete(key);
    snapshot = { ...snapshot, validating };
    notify();
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
    getSnapshot: () => snapshot,
    subscribe,
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
      snapshot = {
        cellErrors: new Map(),
        rowErrors: new Map(),
        validating: new Set(),
      };
      notify();
    },
    hasRowValidator: () => current.validateRow !== undefined,
  };
}
