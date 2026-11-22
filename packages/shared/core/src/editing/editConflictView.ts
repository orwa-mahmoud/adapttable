/**
 * What a binding reads about edit conflicts, and the rules a conflict is
 * judged by.
 *
 * The store that holds open questions loads on demand, when an edit first
 * opens (`createDeferredEditConflictStore`); these types, readers and rules
 * stay with the table so a cell can draw its state without it.
 */
import type { RowRekeyMoves } from "../state/rowRekeys";
import { devWarn } from "../utils/devWarn";
import { type EditableColumnLike, readEditableCellValue } from "./cellEditing";
import { cellIdentity, cellIdentityParts, cellKeysByRow } from "./cellIdentity";
import type {
  EditConflict,
  EditConflictChoice,
  EditConflictHandler,
  EditConflictPolicy,
} from "./editContracts";

/**
 * Headless conflict state for the active editor — what a binding hands its
 * cells.
 *
 * @public
 */
export interface EditConflictState<TRow> {
  /** The conflict being asked about, or `null`. */
  current: EditConflict<TRow> | null;
  /** Whether this cell is the one in conflict. */
  isConflict: (rowId: string, columnKey: string) => boolean;
  /** Whether this row's open form is the one in conflict. */
  isRowConflict: (rowId: string) => boolean;
  /** Keep the draft in one cell that is being asked about. */
  keepCell: (rowId: string, columnKey: string) => void;
  /** Take the incoming value into one cell that is being asked about. */
  takeCell: (rowId: string, columnKey: string) => void;
  /** What arrived in one cell, when it is being asked about. */
  contestedCell: (
    rowId: string,
    columnKey: string
  ) => { readonly incomingValue: string } | undefined;
  /**
   * Whether anything at all is waiting on an answer — what a control that
   * saves several rows at once has to check before it saves any of them.
   */
  anyContested: boolean;
  /**
   * Whether any field of this row is waiting on an answer.
   *
   * Every route that saves a row asks this, not whether the field the reader
   * happens to be standing in is contested: Enter in an untouched field would
   * otherwise write the draft of a field they have not looked at.
   */
  isRowContested: (rowId: string) => boolean;
  /**
   * A digest of one row's contested cells, for a row memo comparator. A
   * memoized row that cannot see the question never redraws to show it.
   */
  rowSignature: (rowId: string) => string;
  /** Keep the draft; accept the incoming row as the new snapshot. */
  keep: () => void;
  /** Replace the draft with the incoming value. */
  take: () => void;
  /**
   * Compare the open editor to the live rows. Call from the same effect that
   * discards a missing row — a conflict is that check one step milder.
   */
  reconcile: (input: ReconcileLiveEdit<TRow>) => void;
  /**
   * The same check for a row edited as one unit: the whole form is measured
   * against the row it opened on, so any change to that row is the conflict.
   */
  reconcileRow: (input: ReconcileLiveRowEdit<TRow>) => void;
  /**
   * The same check across a batch, where several rows are open at once — so a
   * cell is named by its row and its column, not its column alone.
   */
  reconcileBatch: (input: ReconcileLiveBatchEdit<TRow>) => void;
  /** Drop a conflict without choosing — the editor closed. */
  clear: () => void;
}

/**
 * What {@link EditConflictState.reconcile} needs to judge one live update.
 *
 * @public
 */
export interface ReconcileLiveEdit<TRow> {
  /** The active cell, or `null` when idle. */
  active: { rowId: string; columnKey: string } | null;
  /** The row the editor opened against. */
  openedRow: TRow | undefined;
  /** The live draft. */
  draft: string;
  /** The rendered row set. */
  rows: readonly TRow[];
  /** Columns, to read the edited field. */
  columns: readonly EditableColumnLike<TRow>[];
  /** Row identity function. */
  rowKey: (row: TRow) => string;
  /** Host version accessor — any change is a conflict, not just this cell. */
  rowVersion?: (row: TRow) => string | number;
  /** How a conflicting edit is resolved. */
  policy: EditConflictPolicy;
  /** Called when a live edit conflicts with an incoming change. */
  onEditConflict?: EditConflictHandler<TRow>;
  /** Keep: new snapshot, same draft. */
  keep: (row: TRow) => void;
  /** Take: new snapshot and the incoming value as the draft. */
  take: (row: TRow, incomingValue: string) => void;
}

/**
 * What {@link EditConflictState.reconcileRow} needs to judge one live update
 * against an open row form.
 *
 * @public
 */
export interface ReconcileLiveRowEdit<TRow> {
  /** The open row's id, or `null` when no form is open. */
  activeRowId: string | null;
  /**
   * The row as it read when the form opened. A host comparing `row` with
   * `previous` sees the change; without it both name the incoming row.
   */
  openedRow?: TRow;
  /**
   * What each field read when the form opened, or last accepted. A form is
   * measured field by field, not row against row: the reader typed into some
   * of these and not others, and only the ones they typed into are theirs to
   * lose.
   */
  seeds: Readonly<Record<string, string>> | undefined;
  /** What each field reads now, in the form. */
  drafts: Readonly<Record<string, string>>;
  /** The rendered row set. */
  rows: readonly TRow[];
  /** Columns, to read each field. */
  columns: readonly EditableColumnLike<TRow>[];
  /** Row identity function. */
  rowKey: (row: TRow) => string;
  /** How a conflicting edit is resolved. */
  policy: EditConflictPolicy;
  /** Called when a live edit conflicts with an incoming change. */
  onEditConflict?: EditConflictHandler<TRow>;
  /** Keep mine: these fields now read the incoming value; the drafts stand. */
  accept: (row: TRow, columnKeys: readonly string[]) => void;
  /** Take theirs: these fields and their drafts both take the incoming value. */
  take: (row: TRow, columnKeys: readonly string[]) => void;
}

/**
 * What {@link EditConflictState.reconcileBatch} needs to judge live updates
 * against a batch of open rows.
 *
 * @public
 */
export interface ReconcileLiveBatchEdit<TRow> {
  /** Every row with unsaved changes, and what each field is measured against. */
  entries: readonly {
    readonly rowId: string;
    readonly seeds: Readonly<Record<string, string>>;
    readonly drafts: Readonly<Record<string, string>>;
    /**
     * The row as it read when the reader first changed it, so a host
     * comparing `row` with `previous` sees the change rather than the same
     * object twice. Untyped for the same reason the batch state leaves it so.
     */
    readonly openedRow?: unknown;
  }[];
  /** The rendered row set. */
  rows: readonly TRow[];
  /** Columns, to read each field. */
  columns: readonly EditableColumnLike<TRow>[];
  /** Row identity function. */
  rowKey: (row: TRow) => string;
  /** How a conflicting edit is resolved. */
  policy: EditConflictPolicy;
  /** Called when a live edit conflicts with an incoming change. */
  onEditConflict?: EditConflictHandler<TRow>;
  /** Keep mine: these fields now read the incoming value; the drafts stand. */
  accept: (row: TRow, rowId: string, columnKeys: readonly string[]) => void;
  /** Take theirs: these fields and their drafts take the incoming value. */
  take: (row: TRow, rowId: string, columnKeys: readonly string[]) => void;
}

/**
 * One cell waiting on an answer.
 *
 * @public
 */
export interface ContestedEditCell<TRow> {
  /** The row it belongs to. */
  readonly row: TRow;
  /** What that field reads now. */
  readonly incoming: string;
  /** Keep mine: this field now reads the incoming value, the draft stands. */
  readonly accept: (row: TRow, columnKeys: readonly string[]) => void;
  /** Take theirs: the field and its draft both take the incoming value. */
  readonly take: (row: TRow, columnKeys: readonly string[]) => void;
}

/**
 * The question on screen.
 *
 * @public
 */
export interface EditConflictSnapshot<TRow> {
  /** The single-cell conflict being asked about, or `null`. */
  readonly current: EditConflict<TRow> | null;
  /**
   * Every cell of a row form or a batch waiting on an answer, keyed by
   * `contestedCellKey`.
   */
  readonly contested: ReadonlyMap<string, ContestedEditCell<TRow>>;
}

/**
 * The conflict store: the reconcilers, the answers, and the question.
 *
 * @public
 */
export interface EditConflictStore<TRow> {
  /** The question now. */
  readonly getSnapshot: () => EditConflictSnapshot<TRow>;
  /** Listen for changes. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Judge the open cell against the live rows. */
  readonly reconcile: (input: ReconcileLiveEdit<TRow>) => void;
  /** Judge an open row form against the live rows. */
  readonly reconcileRow: (input: ReconcileLiveRowEdit<TRow>) => void;
  /** Judge a batch of open rows against the live rows. */
  readonly reconcileBatch: (input: ReconcileLiveBatchEdit<TRow>) => void;
  /** Keep the draft of the open cell. */
  readonly keep: () => void;
  /** Take the incoming value into the open cell. */
  readonly take: () => void;
  /** Keep the draft in one contested cell. */
  readonly keepCell: (rowId: string, columnKey: string) => void;
  /** Take the incoming value into one contested cell. */
  readonly takeCell: (rowId: string, columnKey: string) => void;
  /** Drop the open cell's conflict without choosing. */
  readonly clear: () => void;
  /** Move the questions about each rekeyed row to its new id. */
  readonly rekey: (moves: RowRekeyMoves<TRow>) => void;
}

/**
 * Whether the live row disagrees with the snapshot the editor opened against.
 *
 * With `rowVersion`, any version change is a conflict — the host said the row
 * moved. Without it, only the edited column's stored value counts, so an
 * unrelated field updating does not steal the draft.
 *
 * @public
 */
export function liveRowChanged<TRow>(input: {
  opened: TRow;
  current: TRow;
  column: EditableColumnLike<TRow>;
  rowVersion?: (row: TRow) => string | number;
}): boolean {
  if (input.rowVersion !== undefined) {
    return (
      String(input.rowVersion(input.opened)) !==
      String(input.rowVersion(input.current))
    );
  }
  return (
    readEditableCellValue(input.opened, input.column) !==
    readEditableCellValue(input.current, input.column)
  );
}

/**
 * Ask the host; a throw or a void return defers to policy.
 *
 * @public
 */
export function resolveConflictChoice<TRow>(
  handler: EditConflictHandler<TRow> | undefined,
  conflict: EditConflict<TRow>,
  policy: EditConflictPolicy
): EditConflictChoice | "ask" {
  if (handler) {
    try {
      const choice = handler(conflict);
      if (choice === "keep" || choice === "take") return choice;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      devWarn(
        `onEditConflict threw (${detail}) — the table used editConflictPolicy instead`
      );
    }
  }
  return policy;
}

/**
 * One cell's place in the contested set — a row and a column, never a column
 * alone.
 *
 * @public
 */
export function contestedCellKey(rowId: string, columnKey: string): string {
  return cellIdentity(rowId, columnKey);
}

/**
 * Whether this cell is the open cell being asked about.
 *
 * @public
 */
export function isCellInConflict<TRow>(
  snapshot: EditConflictSnapshot<TRow>,
  rowId: string,
  columnKey: string
): boolean {
  const { current } = snapshot;
  return (
    current?.unit === "cell" &&
    current.rowId === rowId &&
    current.columnKey === columnKey
  );
}

/**
 * Whether any field of this row is waiting on an answer.
 *
 * @public
 */
export function isRowContested<TRow>(
  snapshot: EditConflictSnapshot<TRow>,
  rowId: string
): boolean {
  return cellKeysByRow(snapshot.contested).has(rowId);
}

/**
 * A digest of one row's contested cells, for a row memo comparator.
 *
 * @public
 */
export function contestedRowSignature<TRow>(
  snapshot: EditConflictSnapshot<TRow>,
  rowId: string
): string {
  const keys = cellKeysByRow(snapshot.contested).get(rowId);
  if (!keys) return "";
  return JSON.stringify(
    keys.map((key) => [
      cellIdentityParts(key)[1],
      snapshot.contested.get(key)?.incoming,
    ])
  );
}

/**
 * The state a binding hands its cells, read off one snapshot.
 *
 * @param store - The store the actions go to.
 * @param snapshot - The question to read.
 * @returns The conflict state.
 *
 * @public
 */
export function editConflictView<TRow>(
  store: EditConflictStore<TRow>,
  snapshot: EditConflictSnapshot<TRow>
): EditConflictState<TRow> {
  const rowContested = (rowId: string): boolean =>
    isRowContested(snapshot, rowId);
  return {
    current: snapshot.current,
    isConflict: (rowId, columnKey) =>
      isCellInConflict(snapshot, rowId, columnKey),
    isRowConflict: rowContested,
    keep: store.keep,
    take: store.take,
    keepCell: store.keepCell,
    takeCell: store.takeCell,
    contestedCell: (rowId, columnKey) => {
      const cell = snapshot.contested.get(contestedCellKey(rowId, columnKey));
      return cell ? { incomingValue: cell.incoming } : undefined;
    },
    anyContested: snapshot.contested.size > 0,
    isRowContested: rowContested,
    rowSignature: (rowId) => contestedRowSignature(snapshot, rowId),
    reconcile: store.reconcile,
    reconcileRow: store.reconcileRow,
    reconcileBatch: store.reconcileBatch,
    clear: store.clear,
  };
}
