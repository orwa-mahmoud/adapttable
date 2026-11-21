/**
 * The store that holds a table's open edit conflicts.
 *
 * The table does not own the data, so it cannot merge. It can keep what the
 * reader typed, take the incoming value, or ask. Silently discarding a draft
 * is the one outcome nobody forgives, so the default is to ask. One store
 * judges every unit: the open cell, an open row form, and a batch of rows.
 *
 * This module loads on demand, through `loadEditConflictStore`, once an edit
 * opens. It imports types only: the table functions it reads arrive as
 * {@link EditConflictTools} from the module that loads it, so a bundler never
 * has to split the table's own editing code out to share it with this chunk.
 */
import type { TableStore } from "../state/tableStore";
import type { EditableColumnLike, readEditableCellValue } from "./cellEditing";
import type { cellIdentityParts, cellKeysByRow } from "./cellIdentity";
import type {
  contestedCellKey,
  ContestedEditCell,
  EditConflictSnapshot,
  EditConflictStore,
  liveRowChanged,
  resolveConflictChoice,
} from "./editConflictView";
import type {
  EditConflict,
  EditConflictChange,
  EditConflictChoice,
  EditConflictHandler,
  EditConflictPolicy,
} from "./editContracts";
import type { stateCell } from "./storePlumbing";

/** The table functions the store reads, handed in by the module that loads it. */
export interface EditConflictTools {
  readonly cellIdentityParts: typeof cellIdentityParts;
  readonly cellKeysByRow: typeof cellKeysByRow;
  readonly contestedCellKey: typeof contestedCellKey;
  readonly liveRowChanged: typeof liveRowChanged;
  readonly readEditableCellValue: typeof readEditableCellValue;
  readonly resolveConflictChoice: typeof resolveConflictChoice;
  readonly stateCell: typeof stateCell;
}

/** How the open cell's question is answered. */
interface CellAnswer<TRow> {
  keep: (row: TRow) => void;
  take: (row: TRow, value: string) => void;
}

/**
 * The conflict store's factory, reading the table through `tools`.
 *
 * @param tools - The table functions the store reads.
 * @returns The factory.
 */
export function editConflictStoreWith(
  tools: EditConflictTools
): <TRow>(within?: { readonly store?: TableStore }) => EditConflictStore<TRow> {
  const {
    cellIdentityParts,
    cellKeysByRow,
    contestedCellKey,
    liveRowChanged,
    readEditableCellValue,
    resolveConflictChoice,
    stateCell,
  } = tools;

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

  /** Whether a contested key belongs to this row. */
  function ofRow(key: string, rowId: string): boolean {
    return cellIdentityParts(key)[0] === rowId;
  }

  /**
   * Create the conflict store. Inert until a reconciler sees a live row that
   * disagrees with an open editor.
   *
   * @typeParam TRow - The row type.
   * @returns The store.
   */
  function createEditConflictStore<TRow>(
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
    /** The question last asked, as `[unit, row, column, incoming]` JSON. */
    let seen = "";
    let seenUnit: "cell" | "row" | null = null;
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
      seenUnit = null;
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
      if (seenUnit !== unit) return;
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
        const live = input.rows.find(
          (row) => input.rowKey(row) === active.rowId
        );
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
        const token = JSON.stringify([
          "cell",
          active.rowId,
          active.columnKey,
          incomingValue,
        ]);
        if (token === seen) return;
        seen = token;
        seenUnit = "cell";
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
        const live = input.rows.find(
          (row) => input.rowKey(row) === activeRowId
        );
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
        for (const rowId of cellKeysByRow(contested).keys()) {
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

  return createEditConflictStore;
}
