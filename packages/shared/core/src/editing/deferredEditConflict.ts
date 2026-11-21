/**
 * The conflict store, loaded when an edit first opens.
 *
 * Most tables that can edit spend most of their life not editing, and a
 * conflict can only exist while an edit is open. So the store's module loads
 * on the first reconcile that finds an open cell, row form or batch — before
 * any conflict could arrive — and the table carries only this holder until
 * then. The holder answers the store's interface: an empty snapshot and no-op
 * answers while nothing is loaded, then the store itself.
 */
import type { TableStore } from "../state/tableStore";
import { reportFailure } from "../utils/reportFailure";
import { readEditableCellValue } from "./cellEditing";
import { cellIdentityParts, cellKeysByRow } from "./cellIdentity";
import type { EditConflictTools } from "./editConflict";
import {
  contestedCellKey,
  type EditConflictSnapshot,
  type EditConflictStore,
  liveRowChanged,
  type ReconcileLiveBatchEdit,
  type ReconcileLiveEdit,
  type ReconcileLiveRowEdit,
  resolveConflictChoice,
} from "./editConflictView";
import { stateCell } from "./storePlumbing";

/** The snapshot before the store loads: nothing asked, nothing contested. */
const NO_CONFLICT: EditConflictSnapshot<never> = /* @__PURE__ */ Object.freeze({
  current: null,
  contested: /* @__PURE__ */ new Map(),
});

type StoreFactory = <TRow>(within?: {
  readonly store?: TableStore;
}) => EditConflictStore<TRow>;

/**
 * The table functions the store reads. The store's module imports none of
 * them, so its chunk shares no module with the table's own editing code.
 *
 * @internal
 */
export const EDIT_CONFLICT_TOOLS: EditConflictTools = {
  cellIdentityParts,
  cellKeysByRow,
  contestedCellKey,
  liveRowChanged,
  readEditableCellValue,
  resolveConflictChoice,
  stateCell,
};

/** The factory once its module has loaded on this page. */
let loadedFactory: StoreFactory | undefined;

/** Load the store's module and keep its factory. */
function loadFactory(): Promise<StoreFactory> {
  return import("./editConflict").then(
    (module) =>
      (loadedFactory = module.editConflictStoreWith(EDIT_CONFLICT_TOOLS))
  );
}

/**
 * Load the conflict store's module. Once it has loaded, every table created
 * afterwards gets the store at once.
 *
 * @returns Settles when the module has loaded.
 *
 * @public
 */
export async function loadEditConflictStore(): Promise<void> {
  await loadFactory();
}

/**
 * A conflict store that loads the real one when an edit first opens.
 *
 * Until then it buffers the latest input of each unit; once loaded, it replays
 * them and forwards everything. A load that fails is reported and tried again
 * on the next open edit.
 *
 * @param within - The table store the conflict state lives in.
 * @returns The store.
 *
 * @public
 */
export function createDeferredEditConflictStore<TRow>(
  within: { readonly store?: TableStore } = {}
): EditConflictStore<TRow> {
  // Already loaded on this page: no reason to wait for it again.
  if (loadedFactory) return loadedFactory<TRow>(within);
  let store: EditConflictStore<TRow> | null = null;
  let loading = false;
  let cell: ReconcileLiveEdit<TRow> | undefined;
  let row: ReconcileLiveRowEdit<TRow> | undefined;
  let batch: ReconcileLiveBatchEdit<TRow> | undefined;
  const listeners = new Set<() => void>();
  const notify = (): void => {
    for (const listener of listeners) listener();
  };

  const load = (): void => {
    if (loading) return;
    loading = true;
    loadFactory().then(
      (create) => {
        const loaded = create<TRow>(within);
        store = loaded;
        loaded.subscribe(notify);
        if (cell) loaded.reconcile(cell);
        if (row) loaded.reconcileRow(row);
        if (batch) loaded.reconcileBatch(batch);
        cell = undefined;
        row = undefined;
        batch = undefined;
        notify();
      },
      (error: unknown) => {
        loading = false;
        reportFailure(
          "Loading the edit conflict store failed; the next open edit tries again.",
          error
        );
      }
    );
  };

  return {
    getSnapshot: () => store?.getSnapshot() ?? (NO_CONFLICT as never),
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    reconcile(input) {
      if (store) return store.reconcile(input);
      cell = input.active && input.openedRow !== undefined ? input : undefined;
      if (cell) load();
    },
    reconcileRow(input) {
      if (store) return store.reconcileRow(input);
      row =
        input.activeRowId !== null && input.seeds !== undefined
          ? input
          : undefined;
      if (row) load();
    },
    reconcileBatch(input) {
      if (store) return store.reconcileBatch(input);
      batch = input.entries.length > 0 ? input : undefined;
      if (batch) load();
    },
    keep: () => store?.keep(),
    take: () => store?.take(),
    keepCell: (rowId, columnKey) => store?.keepCell(rowId, columnKey),
    takeCell: (rowId, columnKey) => store?.takeCell(rowId, columnKey),
    clear: () => store?.clear(),
  };
}
