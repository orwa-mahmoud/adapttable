/**
 * Which cells have been changed since the reader last saw them agree with the
 * server.
 *
 * A save can be in flight, or it can have landed and not yet be confirmed by
 * anything the reader trusts — an optimistic table shows a value the server has
 * not acknowledged. Both are "changed but not settled", and both deserve a mark,
 * because a table that looks identical before and after a save gives the reader
 * no way to tell what is still at risk.
 *
 * The table does not decide when a value is settled: the host does, by handing
 * back a promise that resolves, or by calling `confirm` when a refetch agrees.
 * Marks clear on confirmation and on rollback, and never on their own — a mark
 * that fades on a timer says the change is safe when nobody checked.
 */
import type { RowRekeyMoves } from "../state/rowRekeys";
import type { TableStore } from "../state/tableStore";
import { cellIdentity, cellKeysByRow, rekeyCellSet } from "./cellIdentity";
import { stateCell } from "./storePlumbing";

/**
 * Dirty state for the whole table — what a binding hands its cells.
 *
 * @public
 */
export interface DirtyCellState {
  /** Whether this cell holds a change nobody has confirmed. */
  isDirty: (rowId: string, columnKey: string) => boolean;
  /** Whether any cell in this row does — what a row marker reads. */
  isRowDirty: (rowId: string) => boolean;
  /** How many cells are waiting, for a "3 unsaved changes" line. */
  count: number;
  /** Mark a cell changed. */
  mark: (rowId: string, columnKey: string) => void;
  /** Clear one cell — a save confirmed, or a change undone. */
  confirm: (rowId: string, columnKey: string) => void;
  /** Clear every cell in one row. */
  confirmRow: (rowId: string) => void;
  /** Clear everything — what a successful refetch means. */
  confirmAll: () => void;
  /** A digest of the marks, for a row memo comparator. */
  signature: string;
  /** A digest of one row's marks, for that row's memo comparator. */
  rowSignature?: (rowId: string) => string;
}

/**
 * What `createDirtyCellStore` needs.
 *
 * @public
 */
export interface DirtyCellStoreOptions {
  /**
   * Whether to mark at all. Off by default: a mark is a claim about what the
   * server has agreed to, and a table whose host never says would be guessing.
   */
  readonly enabled?: boolean;
}

/**
 * The marked cells, by {@link dirtyCellKey}.
 *
 * @public
 */
export interface DirtyCellSnapshot {
  /** Every marked cell. */
  readonly cells: ReadonlySet<string>;
}

/**
 * The dirty marks of every cell.
 *
 * @public
 */
export interface DirtyCellStore {
  /** The marks now. */
  readonly getSnapshot: () => DirtyCellSnapshot;
  /** Listen for changes. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Replace the options. */
  readonly configure: (options: DirtyCellStoreOptions) => void;
  /** Mark a cell changed; a no-op unless `enabled`. */
  readonly mark: (rowId: string, columnKey: string) => void;
  /** Clear one cell. */
  readonly confirm: (rowId: string, columnKey: string) => void;
  /** Clear every cell in one row. */
  readonly confirmRow: (rowId: string) => void;
  /** Clear everything. */
  readonly confirmAll: () => void;
  /** Move each rekeyed row's marks to its new id. */
  readonly rekey: (moves: RowRekeyMoves) => void;
}

/**
 * `rowId` and `columnKey` as one key.
 *
 * @public
 */
export function dirtyCellKey(rowId: string, columnKey: string): string {
  return cellIdentity(rowId, columnKey);
}

/**
 * Create the dirty-cell store.
 *
 * @param options - See {@link DirtyCellStoreOptions}.
 * @returns The store; inert unless `enabled`.
 *
 * @public
 */
export function createDirtyCellStore(
  options: DirtyCellStoreOptions = {},
  within: { readonly store?: TableStore } = {}
): DirtyCellStore {
  let current = options;
  const state = stateCell<DirtyCellSnapshot>(
    "dirty-cells",
    { cells: new Set() },
    within.store
  );

  const write = (cells: ReadonlySet<string>): void => {
    state.set({ cells });
  };

  return {
    getSnapshot: state.get,
    subscribe: state.subscribe,
    configure(next) {
      current = next;
    },
    rekey(moves) {
      const { cells } = state.get();
      const next = rekeyCellSet(cells, moves.ids);
      if (next !== cells) write(next);
    },
    mark(rowId, columnKey) {
      if (current.enabled !== true) return;
      const key = dirtyCellKey(rowId, columnKey);
      if (state.get().cells.has(key)) return;
      write(new Set(state.get().cells).add(key));
    },
    confirm(rowId, columnKey) {
      const key = dirtyCellKey(rowId, columnKey);
      if (!state.get().cells.has(key)) return;
      const next = new Set(state.get().cells);
      next.delete(key);
      write(next);
    },
    confirmRow(rowId) {
      const { cells } = state.get();
      const marked = cellKeysByRow(cells).get(rowId);
      if (!marked) return;
      const next = new Set(cells);
      for (const key of marked) next.delete(key);
      write(next);
    },
    confirmAll() {
      if (state.get().cells.size > 0) write(new Set());
    },
  };
}

/**
 * The state a binding hands its cells, read off one snapshot.
 *
 * @param store - The store the actions go to.
 * @param snapshot - The marks to read.
 * @returns The dirty state.
 *
 * @public
 */
export function dirtyCellView(
  store: DirtyCellStore,
  snapshot: DirtyCellSnapshot
): DirtyCellState {
  const { cells } = snapshot;
  return {
    isDirty: (rowId, columnKey) => cells.has(dirtyCellKey(rowId, columnKey)),
    isRowDirty: (rowId) => cellKeysByRow(cells).has(rowId),
    count: cells.size,
    mark: store.mark,
    confirm: store.confirm,
    confirmRow: store.confirmRow,
    confirmAll: store.confirmAll,
    signature: cells.size === 0 ? "" : JSON.stringify([...cells]),
    rowSignature: (rowId) => keysSignature(cellKeysByRow(cells).get(rowId)),
  };
}

/** A digest of some cell keys; empty when there are none. */
function keysSignature(keys: readonly string[] | undefined): string {
  return keys ? JSON.stringify(keys) : "";
}

/** A dirty set that draws nothing, for a host that only counts. */
const NOT_DIRTY = (): boolean => false;
const NO_ROW_SIGNATURE = (): string => "";

/**
 * The dirty set the cells read. It is always the tracked one — the same
 * marks, the same confirms, the same count — but without dirty markers it
 * reports no cell or row as marked, so nothing is drawn.
 *
 * @param tracked - The tracked state.
 * @param markers - Whether the host asked for marks to be drawn.
 * @returns The state to hand the cells.
 *
 * @public
 */
export function dirtyMarkerView(
  tracked: DirtyCellState,
  markers: boolean
): DirtyCellState {
  if (markers) return tracked;
  return {
    ...tracked,
    isDirty: NOT_DIRTY,
    isRowDirty: NOT_DIRTY,
    signature: "",
    rowSignature: NO_ROW_SIGNATURE,
  };
}
