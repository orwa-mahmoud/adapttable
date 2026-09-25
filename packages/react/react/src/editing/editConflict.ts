/**
 * A row changed underneath an open editor.
 *
 * The table does not own the data, so it cannot merge. It can keep what the
 * reader typed, take the incoming value, or ask. Silently discarding a draft
 * is the one outcome nobody forgives, so the default is to ask.
 */
import {
  devWarn,
  type EditableColumnLike,
  readEditableCellValue,
} from "@adapttable/core";
import { useCallback, useMemo, useRef, useState } from "react";

import { useEventCallback } from "../hooks/useEventCallback";

/**
 * How an unhandled conflict is resolved.
 *
 * @public
 */
export type EditConflictPolicy = "keep" | "take" | "ask";

/**
 * The host's choice, when it makes one.
 *
 * @public
 */
export type EditConflictChoice = "keep" | "take";

/**
 * One field that moved underneath an open editor.
 *
 * @public
 */
export interface EditConflictChange {
  /** The column whose stored value moved. */
  readonly columnKey: string;
  /** What it read when the editor opened. */
  readonly previous: string;
  /** What it reads now. */
  readonly incoming: string;
}

/**
 * One conflict. `row` is what just arrived; `previous` is the snapshot the
 * editor opened against (or last accepted).
 *
 * @public
 */
export interface EditConflict<TRow> {
  /**
   * What the reader has open: one cell, or a whole row edited as one unit.
   * A row conflict names no column — every field in the form is affected.
   */
  unit: "cell" | "row";
  /** The incoming row. */
  row: TRow;
  /** The row as it was when the editor opened (or last accepted). */
  previous: TRow;
  /** Its stable id. */
  rowId: string;
  /** The column being edited. */
  columnKey: string;
  /** What the reader has typed. */
  draft: string;
  /** The incoming cell value. */
  incomingValue: string;
  /** The cell value the editor opened against. */
  previousValue: string;
  /**
   * Every editable field that moved, so a notice can say what arrived rather
   * than only that something did. A cell conflict names its one field here
   * too; a row conflict lists them all, and is empty when `rowVersion` says
   * the row moved without any field the reader can see changing.
   */
  changes: readonly EditConflictChange[];
}

/**
 * What a host returns from {@link EditConflictHandler}. `void` defers to policy.
 *
 * @public
 */
export type EditConflictHandler<TRow> = (
  conflict: EditConflict<TRow>
) => EditConflictChoice | void;

/**
 * Headless conflict state for the active editor.
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

/** Ask the host; a throw or a void return defers to policy. */
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

/** Whether two stores hold the same cells. */
/**
 * Whether two contested sets say the same thing to the reader.
 *
 * Keys alone are not enough: a second update to a field already waiting on an
 * answer leaves the key set untouched while the value it carries changes, and
 * a set treated as unchanged would go on showing — and taking — what arrived
 * first.
 */
function sameContested<TRow>(
  left: ReadonlyMap<string, ContestedCell<TRow>>,
  right: ReadonlyMap<string, ContestedCell<TRow>>
): boolean {
  if (left.size !== right.size) return false;
  for (const [key, cell] of left) {
    if (right.get(key)?.incoming !== cell.incoming) return false;
  }
  return true;
}

/** One cell waiting on an answer. */
interface ContestedCell<TRow> {
  /** The row it belongs to. */
  readonly row: TRow;
  /** What that field reads now. */
  readonly incoming: string;
  /** Keep mine: this field now reads the incoming value, the draft stands. */
  readonly accept: (row: TRow, columnKeys: readonly string[]) => void;
  /** Take theirs: the field and its draft both take the incoming value. */
  readonly take: (row: TRow, columnKeys: readonly string[]) => void;
}

/** One cell's place in the store — a row and a column, never a column alone. */
function cellKey(rowId: string, columnKey: string): string {
  return `${rowId}\u0000${columnKey}`;
}

/**
 * Headless conflict state. Inert until {@link EditConflictState.reconcile}
 * sees a live row that disagrees with the open editor.
 *
 * @public
 */
export function useEditConflict<TRow>(): EditConflictState<TRow> {
  const [current, setCurrent] = useState<EditConflict<TRow> | null>(null);
  const seen = useRef("");
  /**
   * How to answer the conflict being asked about — captured from the pass that
   * raised it. A cell and a row form resolve differently, and a table that
   * edits both composes both passes, so the answer travels with the question
   * rather than sitting in one place for either pass to overwrite.
   */
  const answer = useRef<{
    keep: (row: TRow) => void;
    take: (row: TRow, value: string) => void;
  } | null>(null);
  const pending = useRef<EditConflict<TRow> | null>(null);
  /**
   * Every cell waiting on an answer, keyed by row and column.
   *
   * A row form and a batch differ only in how many rows are open at once, so
   * they share one store: the key carries the row, and the entry carries what
   * arrived and how to settle that one cell.
   */
  const [contested, setContested] = useState<
    ReadonlyMap<string, ContestedCell<TRow>>
  >(() => new Map());
  const contestedRef = useRef<ReadonlyMap<string, ContestedCell<TRow>>>(
    new Map()
  );

  const clear = useCallback(() => {
    seen.current = "";
    pending.current = null;
    answer.current = null;
    setCurrent(null);
  }, []);

  /**
   * Drop a conflict only if it belongs to the unit asking.
   *
   * Both reconcilers run on every live update, and a table in row mode has no
   * open cell — so an unscoped clear let the cell pass wipe the question the
   * row pass had just asked, which the row pass then asked again.
   */
  const clearUnit = useCallback(
    (unit: "cell" | "row") => {
      if (!seen.current.startsWith(`${unit}::`)) return;
      clear();
    },
    [clear]
  );

  const keep = useEventCallback(() => {
    const conflict = pending.current ?? current;
    if (!conflict || !answer.current) return;
    answer.current.keep(conflict.row);
    clear();
  });

  const take = useEventCallback(() => {
    const conflict = pending.current ?? current;
    if (!conflict || !answer.current) return;
    answer.current.take(conflict.row, conflict.incomingValue);
    clear();
  });

  const applyChoice = useEventCallback(
    (
      choice: EditConflictChoice | "ask",
      conflict: EditConflict<TRow>,
      how: {
        keep: (row: TRow) => void;
        take: (row: TRow, value: string) => void;
      }
    ) => {
      if (choice === "keep") {
        how.keep(conflict.row);
        setCurrent(null);
        pending.current = null;
        answer.current = null;
        return;
      }
      if (choice === "take") {
        how.take(conflict.row, conflict.incomingValue);
        setCurrent(null);
        pending.current = null;
        answer.current = null;
        return;
      }
      answer.current = how;
      pending.current = conflict;
      setCurrent(conflict);
    }
  );

  const reconcile = useEventCallback((input: ReconcileLiveEdit<TRow>) => {
    const { active, openedRow } = input;
    if (!active || openedRow === undefined) {
      clearUnit("cell");
      return;
    }
    const live = input.rows.find((row) => input.rowKey(row) === active.rowId);
    if (!live) {
      // Missing rows are discardIfRowMissing's job.
      clearUnit("cell");
      return;
    }
    const column = input.columns.find((item) => item.key === active.columnKey);
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
    if (token === seen.current) return;
    seen.current = token;
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
  });

  const reconcileRow = useEventCallback((input: ReconcileLiveRowEdit<TRow>) => {
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
  });

  const reconcileBatch = useEventCallback(
    (input: ReconcileLiveBatchEdit<TRow>) => {
      const open = new Set(input.entries.map((entry) => entry.rowId));
      for (const key of contestedRef.current.keys()) {
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
          // The batch holds the snapshot as `unknown` so its state still fits
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
    }
  );

  /**
   * Settle one row's moved fields: the reader's are asked about, the rest
   * simply take what arrived.
   */
  const settleFields = useEventCallback(
    (input: {
      rowId: string;
      row: TRow;
      /** What the row read when the reader started, for the host's compare. */
      previous?: TRow;
      moved: readonly EditConflictChange[];
      drafts: Readonly<Record<string, string>>;
      policy: EditConflictPolicy;
      onEditConflict?: EditConflictHandler<TRow>;
      accept: (row: TRow, columnKeys: readonly string[]) => void;
      take: (row: TRow, columnKeys: readonly string[]) => void;
    }) => {
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
    }
  );

  const writeContested = useEventCallback(
    (
      rowId: string,
      asking: readonly EditConflictChange[],
      how: Omit<ContestedCell<TRow>, "incoming">
    ) => {
      const next = new Map(contestedRef.current);
      // This row's entries are replaced wholesale, so a field that has since
      // settled stops asking without a second pass to remove it.
      for (const key of contestedRef.current.keys()) {
        if (key.startsWith(`${rowId}\u0000`)) next.delete(key);
      }
      for (const change of asking) {
        next.set(cellKey(rowId, change.columnKey), {
          ...how,
          incoming: change.incoming,
        });
      }
      const settled = sameContested(contestedRef.current, next);
      // The ref always takes the newest row and the callbacks bound to it, so
      // an answer given later acts on what arrived last. Only what the reader
      // can see decides whether to render again.
      contestedRef.current = next;
      if (settled) return;
      setContested(next);
    }
  );

  const dropRow = useEventCallback((rowId: string | null) => {
    if (contestedRef.current.size === 0) return;
    const next = new Map(contestedRef.current);
    for (const key of contestedRef.current.keys()) {
      if (rowId === null || key.startsWith(`${rowId}\u0000`)) next.delete(key);
    }
    if (next.size === contestedRef.current.size) return;
    contestedRef.current = next;
    setContested(next);
  });

  const dropCell = useEventCallback((rowId: string, columnKey: string) => {
    const next = new Map(contestedRef.current);
    if (!next.delete(cellKey(rowId, columnKey))) return;
    contestedRef.current = next;
    setContested(next);
  });

  const keepCell = useEventCallback((rowId: string, columnKey: string) => {
    const cell = contestedRef.current.get(cellKey(rowId, columnKey));
    if (!cell) return;
    cell.accept(cell.row, [columnKey]);
    dropCell(rowId, columnKey);
  });

  const takeCell = useEventCallback((rowId: string, columnKey: string) => {
    const cell = contestedRef.current.get(cellKey(rowId, columnKey));
    if (!cell) return;
    cell.take(cell.row, [columnKey]);
    dropCell(rowId, columnKey);
  });

  const isConflict = useCallback(
    (rowId: string, columnKey: string) =>
      current?.unit === "cell" &&
      current.rowId === rowId &&
      current.columnKey === columnKey,
    [current]
  );

  const isRowConflict = useCallback(
    (rowId: string) => {
      for (const key of contested.keys()) {
        if (key.startsWith(`${rowId}\u0000`)) return true;
      }
      return false;
    },
    [contested]
  );

  const isRowContested = useCallback(
    (rowId: string) => {
      for (const key of contested.keys()) {
        if (key.startsWith(`${rowId}\u0000`)) return true;
      }
      return false;
    },
    [contested]
  );

  const rowSignature = useCallback(
    (rowId: string) => {
      let digest = "";
      for (const [key, cell] of contested) {
        if (key.startsWith(`${rowId}\u0000`)) {
          digest += `|${key.slice(rowId.length + 1)}=${cell.incoming}`;
        }
      }
      return digest;
    },
    [contested]
  );

  const contestedCell = useCallback(
    (rowId: string, columnKey: string) => {
      const cell = contested.get(cellKey(rowId, columnKey));
      return cell ? { incomingValue: cell.incoming } : undefined;
    },
    [contested]
  );

  return useMemo(
    () => ({
      current,
      isConflict,
      isRowConflict,
      keep,
      take,
      keepCell,
      takeCell,
      contestedCell,
      anyContested: contested.size > 0,
      isRowContested,
      rowSignature,
      reconcile,
      reconcileRow,
      reconcileBatch,
      clear,
    }),
    [
      current,
      isConflict,
      isRowConflict,
      keep,
      take,
      keepCell,
      takeCell,
      contestedCell,
      isRowContested,
      rowSignature,
      contested,
      reconcile,
      reconcileRow,
      reconcileBatch,
      clear,
    ]
  );
}
