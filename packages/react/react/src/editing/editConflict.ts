/**
 * A row changed underneath an open editor.
 *
 * The table does not own the data, so it cannot merge. It can keep what the
 * reader typed, take the incoming value, or ask. The reconciler lives in
 * `@adapttable/core` (`createEditConflictStore`); this hook subscribes to it.
 */
import { type EditConflictState } from "@adapttable/core";
import {
  createEditConflictStore,
  editConflictView,
} from "@adapttable/core/editing";
import { useMemo, useState, useSyncExternalStore } from "react";

export type {
  EditConflict,
  EditConflictChange,
  EditConflictChoice,
  EditConflictHandler,
  EditConflictPolicy,
  EditConflictState,
  ReconcileLiveBatchEdit,
  ReconcileLiveEdit,
  ReconcileLiveRowEdit,
} from "@adapttable/core";
export {
  liveRowChanged,
  resolveConflictChoice,
} from "@adapttable/core/editing";

/**
 * Headless conflict state. Inert until {@link EditConflictState.reconcile}
 * sees a live row that disagrees with the open editor.
 *
 * @public
 */
export function useEditConflict<TRow>(): EditConflictState<TRow> {
  const [store] = useState(createEditConflictStore<TRow>);
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
  return useMemo(() => editConflictView(store, snapshot), [store, snapshot]);
}
