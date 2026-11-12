/**
 * A row changed underneath an open editor.
 *
 * The table does not own the data, so it cannot merge. It can keep what the
 * reader typed, take the incoming value, or ask. Silently discarding a draft
 * is the one outcome nobody forgives, so the default is to ask.
 *
 * One store judges every unit: the open cell, an open row form, and a batch
 * of rows. A binding calls the reconcilers from wherever it notices live rows
 * moving, and reads the question back from the snapshot.
 */
import type { TableStore } from "../state/tableStore";
import { devWarn } from "../utils/devWarn";
import { type EditableColumnLike, readEditableCellValue } from "./cellEditing";
import type {
  EditConflict,
  EditConflictChange,
  EditConflictChoice,
  EditConflictHandler,
  EditConflictPolicy,
} from "./editContracts";
import { stateCell } from "./storePlumbing";

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
   * {@link contestedCellKey}.
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
}

/** Every editable field whose stored value moved away from its seed. */
function movedFields<TRow>(
  seeds: Readonly<Record<string, string>>,
  current: TRow,
  columns: readonly EditableColumnLike<TRow>[]
): EditConflictChange[] {
  const changes: EditConflictChange[] = [];
  for (const column of columns) {
    if (column.editable === undefined || column.editable === false) continue;
    const previous = seeds[column.key];
    if (previous === undefined) continue;
    const incoming = readEditableCellValue(current, column);
    if (previous !== incoming) {
      changes.push({ columnKey: column.key, previous, incoming });
    }
  }
  return changes;
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
 * Whether two contested sets say the same thing to the reader.
 *
 * Keys alone are not enough: a second update to a field already waiting on an
 * answer leaves the key set untouched while the value it carries changes, and
 * a set treated as unchanged would go on showing — and taking — what arrived
 * first.
 */
function sameContested<TRow>(
  left: ReadonlyMap<string, ContestedEditCell<TRow>>,
  right: ReadonlyMap<string, ContestedEditCell<TRow>>
): boolean {
  if (left.size !== right.size) return false;
  for (const [key, cell] of left) {
    if (right.get(key)?.incoming !== cell.incoming) return false;
  }
  return true;
}

/**
 * One cell's place in the contested set — a row and a column, never a column
 * alone.
 *
 * @public
 */
export function contestedCellKey(rowId: string, columnKey: string): string {
  return `${rowId}\u0000${columnKey}`;
}

/** Whether a contested key belongs to this row. */
function ofRow(key: string, rowId: string): boolean {
  return key.startsWith(`${rowId}\u0000`);
}

/** How the open cell's question is answered. */
interface CellAnswer<TRow> {
  keep: (row: TRow) => void;
  take: (row: TRow, value: string) => void;
}

/**
 * Create the conflict store. Inert until a reconciler sees a live row that
 * disagrees with an open editor.
 *
 * @typeParam TRow - The row type.
 * @returns The store.
 *
 * @public
 */
export function createEditConflictStore<TRow>(
  within: { readonly store?: TableStore } = {}
): EditConflictStore<TRow> {
  const state = stateCell<EditConflictSnapshot<TRow>>(
    "edit-conflict",
    {
      current: null,
      contested: new Map(),
    },
    within.store
  );
  let seen = "";
  /**
   * How to answer the conflict being asked about — captured from the pass that
   * raised it. A cell and a row form resolve differently, and a table that
   * edits both composes both passes, so the answer travels with the question
   * rather than sitting in one place for either pass to overwrite.
   */
  let answer: CellAnswer<TRow> | null = null;
  let pending: EditConflict<TRow> | null = null;
  /**
   * Every cell waiting on an answer, keyed by row and column. This always
   * holds the newest row and the callbacks bound to it, so an answer given
   * later acts on what arrived last; the state.get() moves only when what the
   * reader can see does.
   */
  let contested: ReadonlyMap<string, ContestedEditCell<TRow>> = new Map();

  const setCurrent = (next: EditConflict<TRow> | null): void => {
    if (state.get().current === next) return;
    state.set({ ...state.get(), current: next });
  };

  const publishContested = (
    next: ReadonlyMap<string, ContestedEditCell<TRow>>
  ): void => {
    contested = next;
    state.set({ ...state.get(), contested: next });
  };

  const clear = (): void => {
    seen = "";
    pending = null;
    answer = null;
    setCurrent(null);
  };

  /**
   * Drop a conflict only if it belongs to the unit asking.
   *
   * Every reconciler runs on every live update, and a table in row mode has no
   * open cell — so an unscoped clear let the cell pass wipe the question the
   * row pass had just asked, which the row pass then asked again.
   */
  const clearUnit = (unit: "cell" | "row"): void => {
    if (!seen.startsWith(`${unit}::`)) return;
    clear();
  };

  const applyChoice = (
    choice: EditConflictChoice | "ask",
    conflict: EditConflict<TRow>,
    how: CellAnswer<TRow>
  ): void => {
    if (choice === "keep" || choice === "take") {
      if (choice === "keep") how.keep(conflict.row);
      else how.take(conflict.row, conflict.incomingValue);
      pending = null;
      answer = null;
      setCurrent(null);
      return;
    }
    answer = how;
    pending = conflict;
    setCurrent(conflict);
  };

  const dropRow = (rowId: string | null): void => {
    if (contested.size === 0) return;
    const next = new Map(contested);
    for (const key of contested.keys()) {
      if (rowId === null || ofRow(key, rowId)) next.delete(key);
    }
    if (next.size === contested.size) return;
    publishContested(next);
  };

  /** Drop one cell the caller found in the set. */
  const dropCell = (rowId: string, columnKey: string): void => {
    const next = new Map(contested);
    next.delete(contestedCellKey(rowId, columnKey));
    publishContested(next);
  };

  const writeContested = (
    rowId: string,
    asking: readonly EditConflictChange[],
    how: Omit<ContestedEditCell<TRow>, "incoming">
  ): void => {
    const next = new Map(contested);
    // This row's entries are replaced wholesale, so a field that has since
    // settled stops asking without a second pass to remove it.
    for (const key of contested.keys()) {
      if (ofRow(key, rowId)) next.delete(key);
    }
    for (const change of asking) {
      next.set(contestedCellKey(rowId, change.columnKey), {
        ...how,
        incoming: change.incoming,
      });
    }
    if (sameContested(contested, next)) {
      contested = next;
      return;
    }
    publishContested(next);
  };

  /**
   * Settle one row's moved fields: the reader's are asked about, the rest
   * simply take what arrived.
   */
  const settleFields = (input: {
    rowId: string;
    row: TRow;
    previous?: TRow;
    moved: readonly EditConflictChange[];
    drafts: Readonly<Record<string, string>>;
    policy: EditConflictPolicy;
    onEditConflict?: EditConflictHandler<TRow>;
    accept: (row: TRow, columnKeys: readonly string[]) => void;
    take: (row: TRow, columnKeys: readonly string[]) => void;
  }): void => {
    if (input.moved.length === 0) {
      dropRow(input.rowId);
      return;
    }
    // A field the reader never typed in has nothing of theirs to lose, so
    // it simply takes what arrived. Only the fields they were working in
    // are a question.
    const untouched = input.moved.filter(
      (change) => input.drafts[change.columnKey] === change.previous
    );
    if (untouched.length > 0) {
      input.take(
        input.row,
        untouched.map((change) => change.columnKey)
      );
    }
    const asking = input.moved.filter(
      (change) => input.drafts[change.columnKey] !== change.previous
    );
    if (asking.length === 0) {
      dropRow(input.rowId);
      return;
    }
    const keys = asking.map((change) => change.columnKey);
    const conflict: EditConflict<TRow> = {
      unit: "row",
      row: input.row,
      previous: input.previous ?? input.row,
      rowId: input.rowId,
      // Each contested field carries its own question.
      columnKey: "",
      draft: "",
      incomingValue: "",
      previousValue: "",
      changes: asking,
    };
    const choice = resolveConflictChoice(
      input.onEditConflict,
      conflict,
      input.policy
    );
    if (choice === "keep") {
      input.accept(input.row, keys);
      dropRow(input.rowId);
      return;
    }
    if (choice === "take") {
      input.take(input.row, keys);
      dropRow(input.rowId);
      return;
    }
    writeContested(input.rowId, asking, {
      row: input.row,
      accept: input.accept,
      take: input.take,
    });
  };

  return {
    getSnapshot: state.get,
    subscribe: state.subscribe,
    clear,
    keep() {
      const conflict = pending ?? state.get().current;
      if (!conflict || !answer) return;
      answer.keep(conflict.row);
      clear();
    },
    take() {
      const conflict = pending ?? state.get().current;
      if (!conflict || !answer) return;
      answer.take(conflict.row, conflict.incomingValue);
      clear();
    },
    keepCell(rowId, columnKey) {
      const cell = contested.get(contestedCellKey(rowId, columnKey));
      if (!cell) return;
      cell.accept(cell.row, [columnKey]);
      dropCell(rowId, columnKey);
    },
    takeCell(rowId, columnKey) {
      const cell = contested.get(contestedCellKey(rowId, columnKey));
      if (!cell) return;
      cell.take(cell.row, [columnKey]);
      dropCell(rowId, columnKey);
    },
    reconcile(input) {
      const { active, openedRow } = input;
      if (!active || openedRow === undefined) {
        clearUnit("cell");
        return;
      }
      const live = input.rows.find((row) => input.rowKey(row) === active.rowId);
      if (!live) {
        // A missing row is the cell session's `discardIfRowMissing` to handle.
        clearUnit("cell");
        return;
      }
      const column = input.columns.find(
        (item) => item.key === active.columnKey
      );
      if (!column) return;
      if (
        !liveRowChanged({
          opened: openedRow,
          current: live,
          column,
          rowVersion: input.rowVersion,
        })
      ) {
        clearUnit("cell");
        return;
      }
      const incomingValue = readEditableCellValue(live, column);
      const previousValue = readEditableCellValue(openedRow, column);
      const token = `cell::${active.rowId}::${active.columnKey}::${incomingValue}`;
      if (token === seen) return;
      seen = token;
      const conflict: EditConflict<TRow> = {
        unit: "cell",
        row: live,
        previous: openedRow,
        rowId: active.rowId,
        columnKey: active.columnKey,
        draft: input.draft,
        incomingValue,
        previousValue,
        changes: [
          {
            columnKey: active.columnKey,
            previous: previousValue,
            incoming: incomingValue,
          },
        ],
      };
      applyChoice(
        resolveConflictChoice(input.onEditConflict, conflict, input.policy),
        conflict,
        { keep: input.keep, take: input.take }
      );
    },
    reconcileRow(input) {
      const { activeRowId, seeds } = input;
      if (activeRowId === null || seeds === undefined) {
        dropRow(null);
        return;
      }
      const live = input.rows.find((row) => input.rowKey(row) === activeRowId);
      if (!live) {
        dropRow(activeRowId);
        return;
      }
      settleFields({
        rowId: activeRowId,
        row: live,
        previous: input.openedRow,
        moved: movedFields(seeds, live, input.columns),
        drafts: input.drafts,
        policy: input.policy,
        onEditConflict: input.onEditConflict,
        accept: (row, keys) => {
          input.accept(row, keys);
        },
        take: (row, keys) => {
          input.take(row, keys);
        },
      });
    },
    reconcileBatch(input) {
      const open = new Set(input.entries.map((entry) => entry.rowId));
      for (const key of contested.keys()) {
        const rowId = key.slice(0, key.indexOf("\u0000"));
        if (!open.has(rowId)) dropRow(rowId);
      }
      for (const entry of input.entries) {
        const live = input.rows.find(
          (row) => input.rowKey(row) === entry.rowId
        );
        if (!live) {
          dropRow(entry.rowId);
          continue;
        }
        settleFields({
          rowId: entry.rowId,
          row: live,
          // The batch holds the state.get() as `unknown` so its state still fits
          // the chrome's erased shape; it is this row, and nothing else.
          previous: entry.openedRow as TRow | undefined,
          moved: movedFields(entry.seeds, live, input.columns),
          drafts: entry.drafts,
          policy: input.policy,
          onEditConflict: input.onEditConflict,
          accept: (row, keys) => {
            input.accept(row, entry.rowId, keys);
          },
          take: (row, keys) => {
            input.take(row, entry.rowId, keys);
          },
        });
      }
    },
  };
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
  for (const key of snapshot.contested.keys()) {
    if (ofRow(key, rowId)) return true;
  }
  return false;
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
  let digest = "";
  for (const [key, cell] of snapshot.contested) {
    if (ofRow(key, rowId)) {
      digest += `|${key.slice(rowId.length + 1)}=${cell.incoming}`;
    }
  }
  return digest;
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
